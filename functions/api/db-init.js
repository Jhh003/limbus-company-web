// 数据库初始化脚本
// 用于创建必要的数据表

export async function initDatabase(env) {
  try {
    console.log('[DB Init] 开始初始化数据库...');
    
    // 检查并创建/修复排行榜表
    try {
      // 尝试查询表结构
      await env.DB.prepare('SELECT status FROM rankings LIMIT 1').all();
      console.log('[DB Init] rankings 表已存在且结构正确');
    } catch (e) {
      if (e.message.includes('no such table')) {
        // 表不存在，创建新表
        await env.DB.exec(`
          CREATE TABLE rankings (
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
      } else if (e.message.includes('no such column')) {
        // 表存在但缺少字段，删除重建
        console.log('[DB Init] rankings 表结构不正确，重建中...');
        await env.DB.exec('DROP TABLE rankings');
        await env.DB.exec(`
          CREATE TABLE rankings (
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
        console.log('[DB Init] rankings 表重建成功');
      }
    }
    
    // 检查并创建/修复攻略表
    try {
      await env.DB.prepare('SELECT status FROM guides LIMIT 1').all();
      console.log('[DB Init] guides 表已存在且结构正确');
    } catch (e) {
      if (e.message.includes('no such table')) {
        await env.DB.exec(`
          CREATE TABLE guides (
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
      } else if (e.message.includes('no such column')) {
        console.log('[DB Init] guides 表结构不正确，重建中...');
        await env.DB.exec('DROP TABLE guides');
        await env.DB.exec(`
          CREATE TABLE guides (
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
        console.log('[DB Init] guides 表重建成功');
      }
    }
    
    // 检查并创建/修复管理员表
    try {
      await env.DB.prepare('SELECT status FROM admins LIMIT 1').all();
      console.log('[DB Init] admins 表已存在且结构正确');
    } catch (e) {
      if (e.message.includes('no such table')) {
        await env.DB.exec(`
          CREATE TABLE admins (
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
      } else if (e.message.includes('no such column')) {
        console.log('[DB Init] admins 表结构不正确，重建中...');
        await env.DB.exec('DROP TABLE admins');
        await env.DB.exec(`
          CREATE TABLE admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            status TEXT DEFAULT 'active',
            last_login_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('[DB Init] admins 表重建成功');
      }
    }
    
    // 创建默认管理员账号
    const adminExists = await env.DB.prepare('SELECT * FROM admins WHERE username = ?').bind('admin').first();
    if (!adminExists) {
      // 密码 Admin@123456 的 SHA256 哈希值
      const hashedPassword = 'c7ad44cbad762a5da0a452f9e854fdc1e0e7a52a38015f23f3eab1d80b931dd472634dfac71cd34ebc35d16ab7fb8a90c81f975113d6c7538dc69dd8de9077ec';
      await env.DB.prepare(`
        INSERT INTO admins (username, password, role, status) VALUES (?, ?, ?, ?)
      `).bind('admin', hashedPassword, 'superadmin', 'active').run();
      console.log('[DB Init] 默认管理员账号创建成功');
    } else {
      console.log('[DB Init] 管理员账号已存在');
    }
    
    console.log('[DB Init] 数据库初始化完成');
    return { success: true };
  } catch (error) {
    console.error('[DB Init] 数据库初始化失败:', error);
    return { success: false, error: error.message };
  }
}
