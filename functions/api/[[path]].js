// Pages Functions - API 路由主入口
// 捕获所有 /api/* 请求

// 密码哈希函数（使用 SHA-256）
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // CORS 头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }
  
  // 简单的速率限制（基于 IP）
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimitKey = `ratelimit:${clientIP}`;
  const rateLimitData = await env.CAPTCHA_KV.get(rateLimitKey);
  
  if (rateLimitData) {
    const { count, timestamp } = JSON.parse(rateLimitData);
    const now = Date.now();
    
    // 如果在1分钟内超过100次请求，拒绝
    if (now - timestamp < 60000 && count > 100) {
      return jsonResponse({ code: 429, message: '请求过于频繁，请稍后再试' }, 429, headers);
    }
    
    // 重置计数器（如果超过1分钟）
    if (now - timestamp >= 60000) {
      await env.CAPTCHA_KV.put(rateLimitKey, JSON.stringify({ count: 1, timestamp: now }), { expirationTtl: 120 });
    } else {
      await env.CAPTCHA_KV.put(rateLimitKey, JSON.stringify({ count: count + 1, timestamp }), { expirationTtl: 120 });
    }
  } else {
    await env.CAPTCHA_KV.put(rateLimitKey, JSON.stringify({ count: 1, timestamp: Date.now() }), { expirationTtl: 120 });
  }
  
  try {
    // 路由分发
    if (path === '/api/health' || path === '/api/health/') {
      return handleHealth(headers);
    }
    
    if (path.startsWith('/api/admin/login')) {
      return handleAdminLogin(request, env, headers);
    }
    
    if (path.startsWith('/api/admin/verify')) {
      return handleAdminVerify(request, env, headers);
    }
    
    if (path.startsWith('/api/admin/change-password')) {
      return handleAdminChangePassword(request, env, headers);
    }
    
    if (path.startsWith('/api/rankings')) {
      return handleRankings(request, env, headers, path);
    }
    
    if (path.startsWith('/api/guides')) {
      return handleGuides(request, env, headers, path);
    }
    
    if (path.startsWith('/api/upload') || path.startsWith('/api/upload/image')) {
      return handleUpload(request, env, headers);
    }
    
    // 用户相关
    if (path.startsWith('/api/users')) {
      return handleUsers(request, env, headers, path);
    }
    
    if (path.startsWith('/api/stats')) {
      return handleStats(request, env, headers, path);
    }
    
    if (path.startsWith('/api/admin/guides')) {
      return handleAdminGuides(request, env, headers, path);
    }
    
    if (path.startsWith('/api/admin/guide')) {
      return handleAdminGuide(request, env, headers, path);
    }
    
    if (path === '/api/captcha' || path === '/api/captcha/') {
      return handleCaptcha(request, env, headers);
    }
    
    if (path.startsWith('/api/auth')) {
      return handleAuth(request, env, headers, path);
    }
    
    return jsonResponse({ code: 404, message: 'API 路径不存在' }, 404, headers);
    
  } catch (error) {
    console.error('API Error:', error);
    return jsonResponse({ 
      code: 500, 
      message: '服务器内部错误',
      error: error.message 
    }, 500, headers);
  }
}

// 健康检查
function handleHealth(headers) {
  return jsonResponse({
    code: 200,
    message: 'Limbus Company API 运行正常',
    timestamp: new Date().toISOString()
  }, 200, headers);
}

// 管理员登录
async function handleAdminLogin(request, env, headers) {
  if (request.method !== 'POST') {
    return jsonResponse({ code: 405, message: '方法不允许' }, 405, headers);
  }
  
  try {
    const body = await request.json();
    console.log('[管理员登录] 请求体:', JSON.stringify(body));
    
    const { username, password, captchaId, captchaText } = body;
    
    if (!username || !password) {
      console.log('[管理员登录失败] 用户名或密码为空');
      return jsonResponse({ code: 400, message: '用户名和密码不能为空' }, 400, headers);
    }
    
    // 检查 CAPTCHA_KV 是否配置
    if (!env.CAPTCHA_KV) {
      console.error('[管理员登录失败] CAPTCHA_KV 未配置');
      return jsonResponse({ code: 500, message: '服务器配置错误' }, 500, headers);
    }
    
    // 检查验证码参数
    if (!captchaId || !captchaText) {
      console.log('[管理员登录失败] 验证码参数缺失:', { captchaId, captchaText });
      return jsonResponse({ code: 400, message: '请输入验证码' }, 400, headers);
    }
    
    // 验证验证码（不区分大小写）
    const storedCode = await env.CAPTCHA_KV.get(captchaId);
    console.log(`[验证码验证] ID: ${captchaId}, 存储值: ${storedCode}, 用户输入: ${captchaText}`);
    
    if (!storedCode) {
      console.log('[验证码验证失败] 验证码不存在或已过期');
      return jsonResponse({ code: 400, message: '验证码已过期，请重新获取' }, 400, headers);
    }
    
    // 不区分大小写比较
    if (storedCode.toUpperCase() !== captchaText.toUpperCase()) {
      console.log('[验证码验证失败] 输入不匹配');
      return jsonResponse({ code: 400, message: '验证码错误，请重新输入' }, 400, headers);
    }
    
    // 验证成功后删除验证码
    await env.CAPTCHA_KV.delete(captchaId);
    console.log('[验证码验证] 验证成功');
    
    // 使用哈希密码验证
    const hashedPassword = await hashPassword(password);
    console.log(`[管理员登录] 查询用户: ${username}, 密码哈希: ${hashedPassword.substring(0, 16)}...`);
    
    const admin = await env.DB.prepare(
      'SELECT * FROM admins WHERE username = ? AND password = ?'
    ).bind(username, hashedPassword).first();
    
    if (!admin) {
      console.log('[管理员登录失败] 用户名或密码错误');
      return jsonResponse({ code: 401, message: '用户名或密码错误' }, 401, headers);
    }
    
    if (admin.status !== 'active') {
      console.log('[管理员登录失败] 账号已被禁用');
      return jsonResponse({ code: 403, message: '账号已被禁用' }, 403, headers);
    }
    
    // 更新最后登录时间
    await env.DB.prepare(
      'UPDATE admins SET last_login_at = datetime("now") WHERE username = ?'
    ).bind(username).run();
    
    const token = btoa(JSON.stringify({
      id: admin.id,
      username: admin.username,
      role: admin.role,
      exp: Date.now() + 24 * 60 * 60 * 1000
    }));
    
    console.log(`[管理员登录成功] 用户: ${username}`);
    
    return jsonResponse({
      code: 200,
      success: true,
      message: '登录成功',
      data: {
        token,
        username: admin.username,
        role: admin.role
      }
    }, 200, headers);
    
  } catch (error) {
    return jsonResponse({ code: 500, message: '登录失败', error: error.message }, 500, headers);
  }
}

// 验证管理员
async function handleAdminVerify(request, env, headers) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ code: 401, message: '未登录' }, 401, headers);
  }
  
  return jsonResponse({ code: 200, message: '验证成功' }, 200, headers);
}

// 排行榜相关
async function handleRankings(request, env, headers, path) {
  if (request.method === 'GET') {
    try {
      const { results } = await env.DB.prepare(
        'SELECT * FROM rankings ORDER BY created_at DESC'
      ).all();
      
      return jsonResponse({
        code: 200,
        message: '获取成功',
        data: results || []
      }, 200, headers);
    } catch (error) {
      return jsonResponse({ code: 500, message: '获取失败', error: error.message }, 500, headers);
    }
  }
  
  if (request.method === 'POST') {
    // 验证登录
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ code: 401, message: '未登录' }, 401, headers);
    }
    
    try {
      const body = await request.json();
      const { sinner_name, tier, role, tags, analysis } = body;
      
      if (!sinner_name || !tier) {
        return jsonResponse({ code: 400, message: '缺少必要字段' }, 400, headers);
      }
      
      const result = await env.DB.prepare(
        `INSERT INTO rankings (sinner_name, tier, role, tags, analysis, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).bind(sinner_name, tier, role || '', JSON.stringify(tags || []), analysis || '').run();
      
      return jsonResponse({
        code: 200,
        message: '创建成功',
        data: { id: result.meta?.last_row_id }
      }, 200, headers);
      
    } catch (error) {
      return jsonResponse({ code: 500, message: '创建失败', error: error.message }, 500, headers);
    }
  }
  
  return jsonResponse({ code: 405, message: '方法不允许' }, 405, headers);
}

// 攻略相关
async function handleGuides(request, env, headers, path) {
  // 获取攻略列表
  if (path === '/api/guides/list' || path === '/api/guides/') {
    if (request.method === 'GET') {
      try {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const pageSize = parseInt(url.searchParams.get('pageSize') || '12');
        const offset = (page - 1) * pageSize;
        
        const { results } = await env.DB.prepare(
          'SELECT * FROM guides ORDER BY created_at DESC LIMIT ? OFFSET ?'
        ).bind(pageSize, offset).all();
        
        // 解析 JSON 字段
        const guides = results.map(guide => ({
          ...guide,
          tags: guide.tags ? JSON.parse(guide.tags) : [],
          mediaUrls: guide.media_urls ? JSON.parse(guide.media_urls) : [],
          contentImages: guide.content_images ? JSON.parse(guide.content_images) : []
        }));
        
        return jsonResponse({
          code: 200,
          message: '获取成功',
          data: {
            guides,
            pagination: {
              page,
              pageSize,
              total: guides.length
            }
          }
        }, 200, headers);
      } catch (error) {
        return jsonResponse({ code: 500, message: '获取失败', error: error.message }, 500, headers);
      }
    }
  }
  
  // 获取攻略详情
  if (path.match(/^\/api\/guides\/\d+$/)) {
    if (request.method === 'GET') {
      try {
        const id = path.split('/').pop();
        const guide = await env.DB.prepare(
          'SELECT * FROM guides WHERE id = ?'
        ).bind(id).first();
        
        if (!guide) {
          return jsonResponse({ code: 404, message: '攻略不存在' }, 404, headers);
        }
        
        // 增加浏览量
        await env.DB.prepare(
          'UPDATE guides SET views = views + 1 WHERE id = ?'
        ).bind(id).run();
        
        // 解析 JSON 字段
        const guideData = {
          ...guide,
          tags: guide.tags ? JSON.parse(guide.tags) : [],
          mediaUrls: guide.media_urls ? JSON.parse(guide.media_urls) : [],
          contentImages: guide.content_images ? JSON.parse(guide.content_images) : []
        };
        
        return jsonResponse({
          code: 200,
          message: '获取成功',
          data: guideData
        }, 200, headers);
      } catch (error) {
        return jsonResponse({ code: 500, message: '获取失败', error: error.message }, 500, headers);
      }
    }
  }
  
  // 提交攻略
  if (path === '/api/guides/user-submit') {
    if (request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return jsonResponse({ code: 401, message: '未登录' }, 401, headers);
      }
      
      try {
        const body = await request.json();
        
        // 从token中解析用户信息
        const token = authHeader.replace('Bearer ', '');
        const user = JSON.parse(atob(token));
        const userId = user.id; // 从token中获取userId
        
        const { 
          title, 
          content, 
          category, 
          cover_image,
          author,
          sinner,
          persona,
          mediaType,
          mediaUrls,
          contentImages,
          contentType,
          floorLevel,
          tags
        } = body;
        
        if (!title || !content) {
          return jsonResponse({ code: 400, message: '标题和内容不能为空' }, 400, headers);
        }
        
        const result = await env.DB.prepare(
          `INSERT INTO guides (
            title, content, category, cover_image, author, sinner, persona,
            media_type, media_urls, content_images, content_type, floor_level, tags,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(
          title,
          content,
          category || '',
          cover_image || '',
          author || '',
          sinner || '',
          persona || '',
          mediaType || 'text',
          mediaUrls ? JSON.stringify(mediaUrls) : '[]',
          contentImages ? JSON.stringify(contentImages) : '[]',
          contentType || 'richtext',
          floorLevel || 0,
          tags ? JSON.stringify(tags) : '[]'
        ).run();
        
        // 记录投稿活跃
        await recordUserActivity(env, userId, author, 'submit_guide');
        
        return jsonResponse({
          code: 200,
          success: true,
          message: '创建成功',
          data: { id: result.meta?.last_row_id }
        }, 200, headers);
        
      } catch (error) {
        return jsonResponse({ code: 500, message: '创建失败', error: error.message }, 500, headers);
      }
    }
  }
  
  // 获取我的投稿
  if (path === '/api/guides/my-submissions') {
    if (request.method === 'GET') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return jsonResponse({ code: 401, message: '未登录' }, 401, headers);
      }
      
      try {
        const token = authHeader.replace('Bearer ', '');
        const user = JSON.parse(atob(token));
        
        const { results } = await env.DB.prepare(
          'SELECT * FROM guides WHERE author = ? ORDER BY created_at DESC'
        ).bind(user.username).all();
        
        const guides = results.map(guide => ({
          id: guide.id,
          title: guide.title,
          content: guide.content,
          category: guide.category,
          coverImage: guide.cover_image,
          author: guide.author,
          sinner: guide.sinner,
          persona: guide.persona,
          mediaType: guide.media_type,
          mediaUrls: guide.media_urls ? JSON.parse(guide.media_urls) : [],
          contentImages: guide.content_images ? JSON.parse(guide.content_images) : [],
          contentType: guide.content_type,
          floorLevel: guide.floor_level,
          tags: guide.tags ? JSON.parse(guide.tags) : [],
          views: guide.views,
          status: guide.status,
          submittedAt: guide.created_at,
          updatedAt: guide.updated_at
        }));
        
        return jsonResponse({
          code: 200,
          message: '获取成功',
          data: guides
        }, 200, headers);
      } catch (error) {
        return jsonResponse({ code: 500, message: '获取失败', error: error.message }, 500, headers);
      }
    }
  }
  
  // 获取用户攻略
  if (path.match(/^\/api\/guides\/user\/\d+$/)) {
    if (request.method === 'GET') {
      try {
        const id = path.split('/').pop();
        const guide = await env.DB.prepare(
          'SELECT * FROM guides WHERE id = ?'
        ).bind(id).first();
        
        if (!guide) {
          return jsonResponse({ code: 404, message: '攻略不存在' }, 404, headers);
        }
        
        const guideData = {
          ...guide,
          tags: guide.tags ? JSON.parse(guide.tags) : [],
          mediaUrls: guide.media_urls ? JSON.parse(guide.media_urls) : [],
          contentImages: guide.content_images ? JSON.parse(guide.content_images) : []
        };
        
        return jsonResponse({
          code: 200,
          message: '获取成功',
          data: guideData
        }, 200, headers);
      } catch (error) {
        return jsonResponse({ code: 500, message: '获取失败', error: error.message }, 500, headers);
      }
    }
  }
  
  // 点赞功能
  if (path.match(/^\/api\/guides\/\d+\/like$/)) {
    if (request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return jsonResponse({ code: 401, message: '未登录' }, 401, headers);
      }
      
      try {
        const id = path.split('/')[3];
        // 简单实现：增加点赞数（实际应该用单独的 likes 表）
        await env.DB.prepare(
          'UPDATE guides SET views = views + 1 WHERE id = ?'
        ).bind(id).run();
        
        return jsonResponse({
          code: 200,
          message: '点赞成功'
        }, 200, headers);
      } catch (error) {
        return jsonResponse({ code: 500, message: '点赞失败', error: error.message }, 500, headers);
      }
    }
  }
  
  // 获取我喜欢的攻略
  if (path === '/api/guides/my-likes') {
    if (request.method === 'GET') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return jsonResponse({ code: 401, message: '未登录' }, 401, headers);
      }
      
      // 简单实现：返回空数组
      return jsonResponse({
        code: 200,
        message: '获取成功',
        data: []
      }, 200, headers);
    }
  }
  
  return jsonResponse({ code: 405, message: '方法不允许' }, 405, headers);
}

// 图片上传
async function handleUpload(request, env, headers) {
  if (request.method !== 'POST') {
    return jsonResponse({ code: 405, message: '方法不允许' }, 405, headers);
  }
  
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ code: 401, message: '未登录' }, 401, headers);
  }
  
  try {
    const formData = await request.formData();
    // 支持 'file' 和 'image' 两种字段名
    const file = formData.get('file') || formData.get('image');
    
    if (!file || !(file instanceof File)) {
      return jsonResponse({ code: 400, message: '未找到文件' }, 400, headers);
    }
    
    // 文件类型验证
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return jsonResponse({ code: 400, message: '只支持 JPEG、PNG、GIF、WebP 格式的图片' }, 400, headers);
    }
    
    // 文件大小限制（10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return jsonResponse({ code: 400, message: '图片大小不能超过10MB' }, 400, headers);
    }
    
    // 文件名安全处理（防止路径遍历攻击）
    const safeFileName = `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    
    const arrayBuffer = await file.arrayBuffer();
    
    await env.IMAGES_BUCKET.put(safeFileName, arrayBuffer, {
      httpMetadata: { contentType: file.type }
    });
    
    const publicUrl = `${env.R2_PUBLIC_URL}/${safeFileName}`;
    
    return jsonResponse({
      code: 200,
      success: true,
      message: '上传成功',
      data: { url: publicUrl, fileName: safeFileName }
    }, 200, headers);
    
  } catch (error) {
    return jsonResponse({ code: 500, message: '上传失败', error: error.message }, 500, headers);
  }
}

// 用户相关
async function handleUsers(request, env, headers, path) {
  if (path === '/api/users/register' || path === '/api/users') {
    if (request.method !== 'POST') {
      return jsonResponse({ code: 405, message: '方法不允许' }, 405, headers);
    }
    
    try {
      const { username, password, captchaId, captchaText } = await request.json();
      
      if (!username || !password) {
        return jsonResponse({ code: 400, message: '用户名和密码不能为空' }, 400, headers);
      }
      
      // 验证验证码
      if (env.CAPTCHA_KV && captchaId && captchaText) {
        const storedCode = await env.CAPTCHA_KV.get(captchaId);
        if (!storedCode || storedCode !== captchaText) {
          return jsonResponse({ code: 400, message: '验证码错误或已过期' }, 400, headers);
        }
        // 验证成功后删除验证码
        await env.CAPTCHA_KV.delete(captchaId);
      }
      
      // 检查用户是否已存在
      const existing = await env.DB.prepare(
        'SELECT * FROM users WHERE username = ?'
      ).bind(username).first();
      
      if (existing) {
        return jsonResponse({ code: 400, message: '用户名已存在' }, 400, headers);
      }
      
      // 创建用户 (使用随机ID和哈希密码)
      const userId = crypto.randomUUID();
      const hashedPassword = await hashPassword(password);
      await env.DB.prepare(
        'INSERT INTO users (id, username, password, created_at) VALUES (?, ?, ?, datetime("now"))'
      ).bind(userId, username, hashedPassword).run();
      
      return jsonResponse({
        code: 200,
        success: true,
        message: '注册成功',
        data: { id: userId }
      }, 200, headers);
      
    } catch (error) {
      return jsonResponse({ code: 500, message: '注册失败', error: error.message }, 500, headers);
    }
  }
  
  return jsonResponse({ code: 404, message: '路径不存在' }, 404, headers);
}

// 认证相关
async function handleAuth(request, env, headers, path) {
  if (path === '/api/auth/login' || path === '/api/auth') {
    if (request.method !== 'POST') {
      return jsonResponse({ code: 405, message: '方法不允许' }, 405, headers);
    }
    
    try {
      const { username, password, captchaId, captchaText } = await request.json();
      
      if (!username || !password) {
        return jsonResponse({ code: 400, message: '用户名和密码不能为空' }, 400, headers);
      }
      
      // 验证验证码
      if (env.CAPTCHA_KV && captchaId && captchaText) {
        const storedCode = await env.CAPTCHA_KV.get(captchaId);
        if (!storedCode || storedCode !== captchaText) {
          return jsonResponse({ code: 400, message: '验证码错误或已过期' }, 400, headers);
        }
        // 验证成功后删除验证码
        await env.CAPTCHA_KV.delete(captchaId);
      }
      
      // 使用哈希密码验证
      const hashedPassword = await hashPassword(password);
      
      // 先检查用户是否存在
      const userExists = await env.DB.prepare(
        'SELECT * FROM users WHERE username = ?'
      ).bind(username).first();
      
      if (!userExists) {
        console.log(`[登录失败] 用户不存在: ${username}, IP: ${request.headers.get('CF-Connecting-IP')}`);
        return jsonResponse({ code: 401, message: '用户名或密码错误' }, 401, headers);
      }
      
      // 验证密码
      const user = await env.DB.prepare(
        'SELECT * FROM users WHERE username = ? AND password = ?'
      ).bind(username, hashedPassword).first();
      
      if (!user) {
        console.log(`[登录失败] 密码错误: ${username}, IP: ${request.headers.get('CF-Connecting-IP')}`);
        return jsonResponse({ code: 401, message: '用户名或密码错误' }, 401, headers);
      }
      
      const token = btoa(JSON.stringify({
        id: user.id,
        username: user.username,
        exp: Date.now() + 24 * 60 * 60 * 1000
      }));
      
      // 记录登录活跃
      await recordUserActivity(env, user.id, user.username, 'login');
      
      console.log(`[登录成功] 用户: ${username}, ID: ${user.id}, IP: ${request.headers.get('CF-Connecting-IP')}`);
      
      return jsonResponse({
        code: 200,
        success: true,
        message: '登录成功',
        data: {
          token,
          username: user.username
        }
      }, 200, headers);
      
    } catch (error) {
      return jsonResponse({ code: 500, message: '登录失败', error: error.message }, 500, headers);
    }
  }
  
  if (path === '/api/auth/register') {
    if (request.method !== 'POST') {
      return jsonResponse({ code: 405, message: '方法不允许' }, 405, headers);
    }
    
    try {
      const { username, password, captchaId, captchaText } = await request.json();
      
      if (!username || !password) {
        return jsonResponse({ code: 400, message: '用户名和密码不能为空' }, 400, headers);
      }
      
      // 验证验证码
      if (env.CAPTCHA_KV && captchaId && captchaText) {
        const storedCode = await env.CAPTCHA_KV.get(captchaId);
        if (!storedCode || storedCode !== captchaText) {
          return jsonResponse({ code: 400, message: '验证码错误或已过期' }, 400, headers);
        }
        // 验证成功后删除验证码
        await env.CAPTCHA_KV.delete(captchaId);
      }
      
      // 检查用户是否已存在
      const existing = await env.DB.prepare(
        'SELECT * FROM users WHERE username = ?'
      ).bind(username).first();
      
      if (existing) {
        return jsonResponse({ code: 400, message: '用户名已存在' }, 400, headers);
      }
      
      // 对密码进行哈希处理
      const hashedPassword = await hashPassword(password);
      
      // 创建用户 (使用随机ID)
      const userId = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO users (id, username, password, created_at) VALUES (?, ?, ?, datetime("now"))'
      ).bind(userId, username, hashedPassword).run();
      
      console.log(`[注册成功] 用户: ${username}, ID: ${userId}, IP: ${request.headers.get('CF-Connecting-IP')}`);
      
      return jsonResponse({
        code: 200,
        success: true,
        message: '注册成功',
        data: { id: userId }
      }, 200, headers);
      
    } catch (error) {
      return jsonResponse({ code: 500, message: '注册失败', error: error.message }, 500, headers);
    }
  }
  
  if (path === '/api/auth/verify') {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ code: 401, message: '未登录' }, 401, headers);
    }
    return jsonResponse({ code: 200, message: '验证成功' }, 200, headers);
  }
  
  if (path.startsWith('/api/auth/check-username')) {
    const url = new URL(request.url);
    const username = url.pathname.split('/').pop();
    
    if (!username || username.length < 3) {
      return jsonResponse({ code: 400, message: '用户名长度至少3位' }, 400, headers);
    }
    
    try {
      const existing = await env.DB.prepare(
        'SELECT * FROM users WHERE username = ?'
      ).bind(username).first();
      
      if (existing) {
        return jsonResponse({ 
          code: 200, 
          available: false, 
          message: '用户名已被注册' 
        }, 200, headers);
      }
      
      return jsonResponse({ 
        code: 200, 
        available: true, 
        message: '用户名可用' 
      }, 200, headers);
      
    } catch (error) {
      return jsonResponse({ code: 500, message: '检查失败', error: error.message }, 500, headers);
    }
  }
  
  return jsonResponse({ code: 404, message: '路径不存在' }, 404, headers);
}

// 工具函数
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders
    }
  });
}

// 用户数据统计
async function handleStats(request, env, headers, path) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ code: 401, message: '未登录' }, 401, headers);
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const user = JSON.parse(atob(token));
    
    // 检查是否为管理员
    const adminUser = await env.DB.prepare(
      'SELECT role FROM admin_users WHERE username = ?'
    ).bind(user.username).first();
    
    if (!adminUser) {
      return jsonResponse({ code: 403, message: '权限不足' }, 403, headers);
    }
    
    // 获取统计数据
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('range') || 'day';
    
    const stats = await getUserStats(env, timeRange);
    
    return jsonResponse({
      code: 200,
      message: '获取成功',
      data: {
        range: timeRange,
        ...stats
      }
    }, 200, headers);
    
  } catch (error) {
    return jsonResponse({ code: 500, message: '获取失败', error: error.message }, 500, headers);
  }
}

async function getUserStats(env, timeRange) {
  const now = new Date();
  let startDate, yesterdayDate, weekAgoDate;
  
  switch(timeRange) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      weekAgoDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case 'week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      weekAgoDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      weekAgoDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
  }
  
  const formatDate = (date) => date.toISOString().split('T')[0];
  
  // 总注册用户数（带默认值）
  let totalUsers = 0;
  try {
    const result = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
    totalUsers = result?.count || 0;
  } catch (e) {
    console.error('获取总用户数失败:', e);
  }
  
  // 今日活跃用户数（DAU）
  const todayStr = formatDate(now);
  let todayActiveUsers = 0;
  try {
    const result = await env.DB.prepare(
      `SELECT COUNT(DISTINCT user_id) as count 
       FROM user_activity 
       WHERE activity_date = ?`
    ).bind(todayStr).first();
    todayActiveUsers = result?.count || 0;
  } catch (e) {
    console.error('获取今日活跃用户失败:', e);
  }
  
  // 昨日活跃用户数
  const yesterdayStr = formatDate(yesterdayDate);
  let yesterdayActiveUsers = 0;
  try {
    const result = await env.DB.prepare(
      `SELECT COUNT(DISTINCT user_id) as count 
       FROM user_activity 
       WHERE activity_date = ?`
    ).bind(yesterdayStr).first();
    yesterdayActiveUsers = result?.count || 0;
  } catch (e) {
    console.error('获取昨日活跃用户失败:', e);
  }
  
  // 7日活跃用户数
  const weekAgoStr = formatDate(weekAgoDate);
  let weekActiveUsers = 0;
  try {
    const result = await env.DB.prepare(
      `SELECT COUNT(DISTINCT user_id) as count 
       FROM user_activity 
       WHERE activity_date >= ?`
    ).bind(weekAgoStr).first();
    weekActiveUsers = result?.count || 0;
  } catch (e) {
    console.error('获取7日活跃用户失败:', e);
  }
  
  // 今日新增用户数
  let todayNewUsers = 0;
  try {
    const result = await env.DB.prepare(
      `SELECT COUNT(*) as count 
       FROM users 
       WHERE DATE(created_at) = ?`
    ).bind(todayStr).first();
    todayNewUsers = result?.count || 0;
  } catch (e) {
    console.error('获取今日新增用户失败:', e);
  }
  
  // 用户增长趋势（最近30天）
  let trendData = [];
  try {
    const result = await env.DB.prepare(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as count
       FROM users 
       WHERE DATE(created_at) >= DATE('now', '-30 days')
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    ).all();
    trendData = result?.results || [];
  } catch (e) {
    console.error('获取用户增长趋势失败:', e);
  }
  
  return {
    totalUsers,
    todayActiveUsers,
    yesterdayActiveUsers,
    weekActiveUsers,
    todayNewUsers,
    trend: trendData.map(row => ({
      date: row.date,
      count: row.count
    }))
  };
}

// 记录用户活跃
async function recordUserActivity(env, userId, username, activityType) {
  const today = new Date().toISOString().split('T')[0];
  
  await env.DB.prepare(
    `INSERT INTO user_activity (user_id, username, activity_date, activity_type, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`
  ).bind(userId, username, today, activityType).run();
}

// 管理员修改密码
async function handleAdminChangePassword(request, env, headers) {
  if (request.method !== 'POST') {
    return jsonResponse({ code: 405, message: '方法不允许' }, 405, headers);
  }
  
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ code: 401, message: '未登录' }, 401, headers);
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const user = JSON.parse(atob(token));
    
    const { oldPassword, newPassword } = await request.json();
    
    if (!oldPassword || !newPassword) {
      return jsonResponse({ code: 400, message: '旧密码和新密码不能为空' }, 400, headers);
    }
    
    // 验证旧密码
    const hashedOldPassword = await hashPassword(oldPassword);
    const admin = await env.DB.prepare(
      'SELECT * FROM admins WHERE username = ? AND password = ?'
    ).bind(user.username, hashedOldPassword).first();
    
    if (!admin) {
      return jsonResponse({ code: 401, message: '旧密码错误' }, 401, headers);
    }
    
    // 验证新密码复杂度
    const passwordValidation = validatePasswordComplexity(newPassword);
    if (!passwordValidation.valid) {
      return jsonResponse({ code: 400, message: passwordValidation.message }, 400, headers);
    }
    
    // 更新密码
    const hashedNewPassword = await hashPassword(newPassword);
    await env.DB.prepare(
      'UPDATE admins SET password = ? WHERE username = ?'
    ).bind(hashedNewPassword, user.username).run();
    
    return jsonResponse({
      code: 200,
      success: true,
      message: '密码修改成功'
    }, 200, headers);
    
  } catch (error) {
    return jsonResponse({ code: 500, message: '修改密码失败', error: error.message }, 500, headers);
  }
}

// 密码复杂度验证
function validatePasswordComplexity(password) {
  if (password.length < 16) {
    return { valid: false, message: '密码长度不能少于16位' };
  }
  
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
  
  const typeCount = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (typeCount < 3) {
    return { valid: false, message: '密码必须包含大写字母、小写字母、数字、特殊字符中的至少3类' };
  }
  
  if (password.includes('admin')) {
    return { valid: false, message: '密码不能包含"admin"' };
  }
  
  if (/(.)\1{3,}/.test(password)) {
    return { valid: false, message: '密码不能包含连续3个以上相同字符' };
  }
  
  return { valid: true, message: '' };
}

// 管理员获取攻略列表
async function handleAdminGuides(request, env, headers, path) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ code: 401, message: '未登录' }, 401, headers);
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const user = JSON.parse(atob(token));
    
    const adminUser = await env.DB.prepare(
      'SELECT role FROM admins WHERE username = ?'
    ).bind(user.username).first();
    
    if (!adminUser) {
      return jsonResponse({ code: 403, message: '权限不足' }, 403, headers);
    }
    
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';
    const page = parseInt(url.searchParams.get('page')) || 1;
    const pageSize = parseInt(url.searchParams.get('pageSize')) || 20;
    const offset = (page - 1) * pageSize;
    
    const guides = await env.DB.prepare(
      `SELECT 
         id, title, sinner, persona, floor_level, author, 
         status, created_at, updated_at, cover_url,
         content_type, media_urls
       FROM guides 
       WHERE status = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(status, pageSize, offset).all();
    
    const total = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM guides WHERE status = ?'
    ).bind(status).first();
    
    return jsonResponse({
      code: 200,
      message: '获取成功',
      data: {
        guides: guides.results,
        pagination: {
          page,
          pageSize,
          total: total.count,
          totalPages: Math.ceil(total.count / pageSize)
        }
      }
    }, 200, headers);
    
  } catch (error) {
    return jsonResponse({ code: 500, message: '获取攻略列表失败', error: error.message }, 500, headers);
  }
}

// 管理员审核攻略
async function handleAdminGuide(request, env, headers, path) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ code: 401, message: '未登录' }, 401, headers);
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const user = JSON.parse(atob(token));
    
    const adminUser = await env.DB.prepare(
      'SELECT role FROM admins WHERE username = ?'
    ).bind(user.username).first();

    if (!adminUser) {
      return jsonResponse({ code: 403, message: '权限不足' }, 403, headers);
    }

    const url = new URL(request.url);
    const guideId = url.pathname.split('/').pop();
    
    if (request.method === 'GET') {
      const guide = await env.DB.prepare(
        `SELECT 
           id, title, sinner, persona, floor_level, author, 
           content, status, created_at, updated_at, cover_url,
           content_type, media_urls, content_images, tags
         FROM guides 
         WHERE id = ?`
      ).bind(guideId).first();
      
      if (!guide) {
        return jsonResponse({ code: 404, message: '攻略不存在' }, 404, headers);
      }
      
      return jsonResponse({
        code: 200,
        message: '获取成功',
        data: guide
      }, 200, headers);
    }
    
    if (request.method === 'POST') {
      const { action, rejectReason } = await request.json();
      
      if (!action || !['approve', 'reject'].includes(action)) {
        return jsonResponse({ code: 400, message: '无效的操作' }, 400, headers);
      }
      
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const updated_at = new Date().toISOString();
      
      await env.DB.prepare(
        `UPDATE guides 
         SET status = ?, updated_at = ?, reject_reason = ?
         WHERE id = ?`
      ).bind(newStatus, updated_at, rejectReason || null, guideId).run();
      
      const guide = await env.DB.prepare(
        'SELECT * FROM guides WHERE id = ?'
      ).bind(guideId).first();
      
      return jsonResponse({
        code: 200,
        message: action === 'approve' ? '攻略已通过审核' : '攻略已驳回',
        data: guide
      }, 200, headers);
    }
    
    return jsonResponse({ code: 405, message: '方法不允许' }, 405, headers);
    
  } catch (error) {
    return jsonResponse({ code: 500, message: '审核失败', error: error.message }, 500, headers);
  }
}

// 验证码生成
async function handleCaptcha(request, env, headers) {
  if (request.method !== 'GET') {
    return jsonResponse({ code: 405, message: '方法不允许' }, 405, headers);
  }
  
  try {
    // 检查 KV 存储是否可用
    if (!env.CAPTCHA_KV) {
      console.error('[验证码生成失败] CAPTCHA_KV 未配置');
      return jsonResponse({ 
        code: 500, 
        message: '验证码服务暂时不可用，请联系管理员' 
      }, 500, headers);
    }
    
    const captchaId = crypto.randomUUID();
    const captchaCode = generateCaptchaCode();
    
    console.log(`[验证码生成] ID: ${captchaId}, 代码: ${captchaCode}`);
    
    // 存储验证码到 KV，5分钟过期
    try {
      await env.CAPTCHA_KV.put(captchaId, captchaCode, { expirationTtl: 300 });
      console.log(`[验证码生成] 验证码已存储到 KV，ID: ${captchaId}`);
    } catch (kvError) {
      console.error('[验证码生成失败] KV 存储失败:', kvError);
      return jsonResponse({ 
        code: 500, 
        message: '验证码存储失败，请稍后重试' 
      }, 500, headers);
    }
    
    // 生成 SVG 验证码图片
    const svgImage = generateCaptchaSVG(captchaCode);
    
    console.log(`[验证码生成] SVG长度: ${svgImage.length}`);
    
    // 将 SVG 转换为 Base64 数据 URL
    const base64Image = `data:image/svg+xml;base64,${btoa(svgImage)}`;
    
    console.log(`[验证码生成] Base64长度: ${base64Image.length}`);
    console.log(`[验证码生成] 成功返回验证码，ID: ${captchaId}`);
    
    return jsonResponse({
      code: 200,
      message: '验证码生成成功',
      data: {
        captchaId,
        captchaImage: base64Image
      }
    }, 200, headers);
    
  } catch (error) {
    console.error('[验证码生成失败] 错误:', error);
    console.error('[验证码生成失败] 错误堆栈:', error.stack);
    return jsonResponse({ 
      code: 500, 
      message: '验证码生成失败，请刷新页面重试',
      error: error.message 
    }, 500, headers);
  }
}

function generateCaptchaCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateCaptchaSVG(code) {
  const width = 120;
  const height = 44;
  
  const colors = ['#d4af37', '#f0d466', '#ff6b6b', '#4ecdc4'];
  
  const fontSize = 24;
  const startX = 15;
  const startY = 30;
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="100%" height="100%" fill="rgba(10, 10, 10, 0.7)"/>`;
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const x = startX + (i * 25);
    const y = startY + (Math.random() * 6 - 3);
    const rotation = (Math.random() * 30 - 15);
    const charColor = colors[Math.floor(Math.random() * colors.length)];
    
    svg += `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="bold" fill="${charColor}" transform="rotate(${rotation}, ${x}, ${y})">${char}</text>`;
  }
  
  svg += `</svg>`;
  
  // 直接返回 SVG 字符串，不进行 Base64 编码
  return svg;
}
