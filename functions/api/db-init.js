// 数据库初始化脚本
// 用于创建必要的数据表

export async function initDatabase(env) {
  try {
    console.log('[DB Init] 开始初始化数据库...');
    
    // 检查 DB 是否配置
    if (!env.DB) {
      return { success: false, error: '数据库未配置' };
    }
    
    const results = {
      rankings: false,
      guides: false,
      admins: false,
      adminUser: false
    };
    
    // 创建排行榜表
    try {
      await env.DB.prepare(`
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
      `).run();
      results.rankings = true;
      console.log('[DB Init] rankings 表创建/检查成功');
    } catch (e) {
      console.error('[DB Init] rankings 表创建失败:', e.message);
      // 如果表已存在但结构不对，尝试删除重建
      try {
        await env.DB.prepare('DROP TABLE IF EXISTS rankings').run();
        await env.DB.prepare(`
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
        `).run();
        results.rankings = true;
        console.log('[DB Init] rankings 表重建成功');
      } catch (e2) {
        console.error('[DB Init] rankings 表重建失败:', e2.message);
      }
    }
    
    // 检查并创建/修复攻略表 - 总是删除重建以确保结构正确
    try {
      // 先删除旧表
      await env.DB.prepare('DROP TABLE IF EXISTS guides').run();
      console.log('[DB Init] guides 旧表已删除');
      
      // 创建新表
      await env.DB.prepare(`
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
      `).run();
      results.guides = true;
      console.log('[DB Init] guides 表创建成功');
    } catch (e) {
      console.error('[DB Init] guides 表创建失败:', e.message);
    }
    
    // 创建管理员表
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'admin',
          status TEXT DEFAULT 'active',
          last_login_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      results.admins = true;
      console.log('[DB Init] admins 表创建/检查成功');
    } catch (e) {
      console.error('[DB Init] admins 表创建失败:', e.message);
      try {
        await env.DB.prepare('DROP TABLE IF EXISTS admins').run();
        await env.DB.prepare(`
          CREATE TABLE admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            status TEXT DEFAULT 'active',
            last_login_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();
        results.admins = true;
        console.log('[DB Init] admins 表重建成功');
      } catch (e2) {
        console.error('[DB Init] admins 表重建失败:', e2.message);
      }
    }
    
    // 创建默认管理员账号
    try {
      const adminResult = await env.DB.prepare('SELECT * FROM admins WHERE username = ?').bind('admin').first();
      if (!adminResult) {
        // 密码 Admin@123456 的 SHA256 哈希值
        const hashedPassword = 'c7ad44cbad762a5da0a452f9e854fdc1e0e7a52a38015f23f3eab1d80b931dd472634dfac71cd34ebc35d16ab7fb8a90c81f975113d6c7538dc69dd8de9077ec';
        await env.DB.prepare(`
          INSERT INTO admins (username, password, role, status) VALUES (?, ?, ?, ?)
        `).bind('admin', hashedPassword, 'superadmin', 'active').run();
        results.adminUser = true;
        console.log('[DB Init] 默认管理员账号创建成功');
      } else {
        results.adminUser = true;
        console.log('[DB Init] 管理员账号已存在');
      }
    } catch (e) {
      console.error('[DB Init] 管理员账号创建失败:', e.message);
    }
    
    console.log('[DB Init] 数据库初始化完成', results);
    return { success: true, results };
  } catch (error) {
    console.error('[DB Init] 数据库初始化失败:', error);
    return { success: false, error: error.message, stack: error.stack };
  }
}
