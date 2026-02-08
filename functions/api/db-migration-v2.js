
// 数据库迁移脚本 v2
// 添加软删除字段和创建删除日志表

export async function migrateDatabaseV2(env) {
  try {
    console.log('[DB Migration V2] 开始数据库迁移...');
    const results = {
      guides_cols: false,
      rankings_cols: false,
      log_table: false
    };

    // 1. 为 guides 表添加软删除字段
    try {
      await env.DB.prepare('SELECT deleted_at FROM guides LIMIT 1').all();
      results.guides_cols = '已存在';
    } catch (e) {
      try {
        await env.DB.prepare("ALTER TABLE guides ADD COLUMN deleted_at DATETIME").run();
        await env.DB.prepare("ALTER TABLE guides ADD COLUMN deleted_by TEXT").run();
        results.guides_cols = '已添加';
      } catch (alterError) {
        console.error('[DB Migration V2] guides 表字段添加失败:', alterError.message);
        results.guides_cols = '失败: ' + alterError.message;
      }
    }

    // 2. 为 rankings 表添加软删除字段
    try {
      await env.DB.prepare('SELECT deleted_at FROM rankings LIMIT 1').all();
      results.rankings_cols = '已存在';
    } catch (e) {
      try {
        await env.DB.prepare("ALTER TABLE rankings ADD COLUMN deleted_at DATETIME").run();
        await env.DB.prepare("ALTER TABLE rankings ADD COLUMN deleted_by TEXT").run();
        results.rankings_cols = '已添加';
      } catch (alterError) {
        console.error('[DB Migration V2] rankings 表字段添加失败:', alterError.message);
        results.rankings_cols = '失败: ' + alterError.message;
      }
    }

    // 3. 创建删除日志表
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS user_content_delete_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          content_id INTEGER NOT NULL,
          content_type TEXT NOT NULL, -- 'guide' or 'ranking'
          deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          ip_address TEXT
        )
      `).run();
      
      // 创建索引
      await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_delete_log_user ON user_content_delete_log(username)`).run();
      await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_delete_log_time ON user_content_delete_log(deleted_at DESC)`).run();
      
      results.log_table = '创建成功';
    } catch (e) {
      console.error('[DB Migration V2] 日志表创建失败:', e.message);
      results.log_table = '失败: ' + e.message;
    }

    return { success: true, results };
  } catch (error) {
    console.error('[DB Migration V2] 迁移失败:', error);
    return { success: false, error: error.message };
  }
}
