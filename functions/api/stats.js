// 用户数据统计API
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
    const timeRange = url.searchParams.get('range') || 'day'; // day, week, month
    
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
  
  // 总注册用户数
  const { count: totalUsers } = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM users'
  ).first();
  
  // 今日活跃用户数（DAU）
  const todayStr = formatDate(now);
  const { count: todayActiveUsers } = await env.DB.prepare(
    `SELECT COUNT(DISTINCT user_id) as count 
     FROM user_activity 
     WHERE activity_date = ?`
  ).bind(todayStr).first();
  
  // 昨日活跃用户数
  const yesterdayStr = formatDate(yesterdayDate);
  const { count: yesterdayActiveUsers } = await env.DB.prepare(
    `SELECT COUNT(DISTINCT user_id) as count 
     FROM user_activity 
     WHERE activity_date = ?`
  ).bind(yesterdayStr).first();
  
  // 7日活跃用户数
  const weekAgoStr = formatDate(weekAgoDate);
  const { count: weekActiveUsers } = await env.DB.prepare(
    `SELECT COUNT(DISTINCT user_id) as count 
     FROM user_activity 
     WHERE activity_date >= ?`
  ).bind(weekAgoStr).first();
  
  // 今日新增用户数
  const { count: todayNewUsers } = await env.DB.prepare(
    `SELECT COUNT(*) as count 
     FROM users 
     WHERE DATE(created_at) = ?`
  ).bind(todayStr).first();
  
  // 用户增长趋势（最近30天）
  const trendData = await env.DB.prepare(
    `SELECT 
       DATE(created_at) as date,
       COUNT(*) as count
     FROM users 
     WHERE DATE(created_at) >= DATE('now', '-30 days')
     GROUP BY DATE(created_at)
     ORDER BY date ASC`
  ).all();
  
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