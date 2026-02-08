// 数据库初始化脚本
// 用于创建必要的数据表

export async function initDatabase(env) {
  try {
    console.log('[DB Init] 开始初始化数据库...');
    
    // 创建排行榜表
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS rankings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        sinner TEXT NOT NULL,
        persona TEXT NOT NULL,
        floor_level TEXT NOT NULL,
        time INTEGER NOT NULL,
        screenshot_url TEXT,
        video_url TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB Init] rankings 表创建成功');
    
    // 创建攻略表
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS guides (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        sinner TEXT NOT NULL,
        persona TEXT NOT NULL,
        floorLevel TEXT NOT NULL,
        mediaType TEXT DEFAULT 'video',
        content TEXT NOT NULL,
        media_urls TEXT,
        coverUrl TEXT,
        content_images TEXT,
        tags TEXT,
        linkedRankingId INTEGER,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB Init] guides 表创建成功');
    
    // 创建管理员表
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        status TEXT DEFAULT 'active',
        last_login_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB Init] admins 表创建成功');
    
    // 创建用户表
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME
      )
    `);
    console.log('[DB Init] users 表创建成功');
    
    console.log('[DB Init] 数据库初始化完成');
    return { success: true };
  } catch (error) {
    console.error('[DB Init] 数据库初始化失败:', error);
    return { success: false, error: error.message };
  }
}
