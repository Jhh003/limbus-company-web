
// 数据库迁移 V2 处理函数
async function handleMigrateV2(request, env, headers) {
  // 只允许 POST 请求
  if (request.method !== 'POST') {
    return jsonResponse({ code: 405, message: '方法不允许' }, 405, headers);
  }
  
  // 验证管理员权限
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ code: 401, message: '未登录' }, 401, headers);
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const user = await verifyJwt(token, env.JWT_SECRET || 'default-secret');
    if (!user) return jsonResponse({ code: 401, message: '无效的 Token' }, 401, headers);
    
    // 检查是否为管理员
    const adminUser = await env.DB.prepare(
      'SELECT role FROM admins WHERE username = ?'
    ).bind(user.username).first();
    
    if (!adminUser) {
      return jsonResponse({ code: 403, message: '权限不足' }, 403, headers);
    }
    
    // 动态导入迁移脚本
    const { migrateDatabaseV2 } = await import('./db-migration-v2.js');
    const result = await migrateDatabaseV2(env);
    
    if (result.success) {
      return jsonResponse({
        code: 200,
        message: '数据库迁移成功',
        data: result.results
      }, 200, headers);
    } else {
      return jsonResponse({
        code: 500,
        message: '数据库迁移失败',
        error: result.error
      }, 500, headers);
    }
  } catch (error) {
    console.error('[Migrate V2] 错误:', error);
    return jsonResponse({
      code: 500,
      message: '数据库迁移失败',
      error: error.message
    }, 500, headers);
  }
}

// 获取我的投稿 (兼容旧接口，实际调用 handleUserContributions)
async function handleMySubmissions(request, env, headers) {
  return handleUserContributions(request, env, headers);
}

// 获取用户投稿内容 (Guides + Rankings)
async function handleUserContributions(request, env, headers) {
  if (request.method !== 'GET') {
    return jsonResponse({ code: 405, message: '方法不允许' }, 405, headers);
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ code: 401, message: '未登录' }, 401, headers);
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const user = await verifyJwt(token, env.JWT_SECRET || 'default-secret');
    if (!user) return jsonResponse({ code: 401, message: '无效的 Token' }, 401, headers);
    
    // 检查数据库
    if (!env.DB) {
      return jsonResponse({ code: 500, message: '数据库未配置' }, 500, headers);
    }

    // 获取分页参数
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const pageSize = parseInt(url.searchParams.get('pageSize')) || 20;
    const offset = (page - 1) * pageSize;

    // 并行查询攻略和排行榜
    // 注意：这里简单起见分别查询再合并，如果数据量大应该优化
    // 且这里我们只查询未删除的 (deleted_at IS NULL)
    
    // 1. 查询攻略
    const { results: guides } = await env.DB.prepare(
      `SELECT id, title, sinner, persona, status, created_at, 'guide' as type 
       FROM guides 
       WHERE author = ? AND (deleted_at IS NULL OR deleted_at = '')
       ORDER BY created_at DESC LIMIT 50` 
    ).bind(user.username).all();
    
    // 2. 查询排行榜
    const { results: rankings } = await env.DB.prepare(
      `SELECT id, sinner, persona, time, status, created_at, 'ranking' as type
       FROM rankings 
       WHERE username = ? AND (deleted_at IS NULL OR deleted_at = '')
       ORDER BY created_at DESC LIMIT 50`
    ).bind(user.username).all();
    
    // 合并并排序
    const allContent = [...(guides || []), ...(rankings || [])];
    allContent.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // 分页
    const paginatedContent = allContent.slice(offset, offset + pageSize);
    
    return jsonResponse({
      code: 200,
      message: '获取成功',
      data: {
        list: paginatedContent,
        total: allContent.length,
        page,
        pageSize
      }
    }, 200, headers);
    
  } catch (error) {
    console.error('[User Contributions] 获取失败:', error);
    return jsonResponse({ code: 500, message: '获取失败', error: error.message }, 500, headers);
  }
}

// 删除用户内容
async function handleUserContentDelete(request, env, headers, path) {
  if (request.method !== 'DELETE') {
    return jsonResponse({ code: 405, message: '方法不允许' }, 405, headers);
  }
  
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ code: 401, message: '未登录' }, 401, headers);
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const user = await verifyJwt(token, env.JWT_SECRET || 'default-secret');
    if (!user) return jsonResponse({ code: 401, message: '无效的 Token' }, 401, headers);
    
    // 解析路径参数 /api/user/content/:type/:id
    const parts = path.split('/');
    const type = parts[4]; // guide or ranking
    const id = parts[5];
    
    if (!['guide', 'ranking'].includes(type)) {
      return jsonResponse({ code: 400, message: '无效的内容类型' }, 400, headers);
    }
    
    // 频率限制：10分钟内最多5次
    const rateKey = `delete_limit:${user.id}`;
    let deleteCount = 0;
    
    if (env.CAPTCHA_KV) {
      const storedLimit = await env.CAPTCHA_KV.get(rateKey);
      if (storedLimit) {
        deleteCount = parseInt(storedLimit);
        if (deleteCount >= 5) {
          return jsonResponse({ code: 429, message: '删除操作过于频繁，请稍后再试' }, 429, headers);
        }
      }
    }
    
    // 验证所有权
    let content = null;
    let table = '';
    let userField = '';
    
    if (type === 'guide') {
      table = 'guides';
      userField = 'author';
      content = await env.DB.prepare('SELECT author FROM guides WHERE id = ?').bind(id).first();
    } else {
      table = 'rankings';
      userField = 'username';
      content = await env.DB.prepare('SELECT username FROM rankings WHERE id = ?').bind(id).first();
    }
    
    if (!content) {
      return jsonResponse({ code: 404, message: '内容不存在' }, 404, headers);
    }
    
    if (content[userField] !== user.username) {
      return jsonResponse({ code: 403, message: '无权删除此内容' }, 403, headers);
    }
    
    // 执行逻辑删除
    await env.DB.prepare(
      `UPDATE ${table} SET deleted_at = datetime('now'), deleted_by = ? WHERE id = ?`
    ).bind(user.id, id).run();
    
    // 记录日志
    try {
      await env.DB.prepare(
        `INSERT INTO user_content_delete_log (user_id, username, content_id, content_type, ip_address)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(user.id, user.username, id, type, request.headers.get('CF-Connecting-IP') || '').run();
    } catch (logError) {
      console.error('记录删除日志失败:', logError);
    }
    
    // 更新频率限制
    if (env.CAPTCHA_KV) {
      await env.CAPTCHA_KV.put(rateKey, (deleteCount + 1).toString(), { expirationTtl: 600 });
    }
    
    return jsonResponse({
      code: 200,
      message: '删除成功',
      data: null
    }, 200, headers);
    
  } catch (error) {
    console.error('[User Delete] 删除失败:', error);
    return jsonResponse({ code: 500, message: '删除失败', error: error.message }, 500, headers);
  }
}
