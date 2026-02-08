/**
 * 密码哈希迁移脚本
 * 用于将现有用户的明文密码迁移为 SHA-256 哈希
 */

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // 获取所有用户
    const users = await env.DB.prepare('SELECT id, username, password FROM users').all();
    
    let migratedCount = 0;
    const errors = [];
    
    for (const user of users.results) {
      try {
        // 检查密码是否已经是哈希格式（64位十六进制）
        if (user.password && user.password.length === 64 && /^[a-f0-9]{64}$/i.test(user.password)) {
          console.log(`[迁移跳过] 用户 ${user.username} 密码已是哈希格式`);
          continue;
        }
        
        // 对密码进行哈希
        const hashedPassword = await hashPassword(user.password);
        
        // 更新数据库
        await env.DB.prepare(
          'UPDATE users SET password = ? WHERE id = ?'
        ).bind(hashedPassword, user.id).run();
        
        migratedCount++;
        console.log(`[迁移成功] 用户 ${user.username} (ID: ${user.id})`);
      } catch (error) {
        errors.push({
          username: user.username,
          id: user.id,
          error: error.message
        });
        console.error(`[迁移失败] 用户 ${user.username}:`, error);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: `迁移完成，成功迁移 ${migratedCount} 个用户`,
      migratedCount,
      totalUsers: users.results.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[迁移错误]', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}