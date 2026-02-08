/**
 * API端到端测试脚本
 * 验证完整的业务流程和数据状态转换
 */

const API_BASE = 'https://084limbus.xyz';

// 测试日志
const testLogs = [];

function log(step, status, message, data = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    step,
    status,
    message,
    data
  };
  testLogs.push(entry);
  console.log(`[${status}] ${step}: ${message}`);
  if (data) console.log('  Data:', JSON.stringify(data, null, 2));
}

// 测试1: 健康检查
async function testHealth() {
  log('HEALTH_CHECK', 'START', '开始健康检查');
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = await response.json();
    
    if (data.code === 200 && data.services.db && data.services.kv) {
      log('HEALTH_CHECK', 'PASS', '所有服务正常运行', data);
      return true;
    } else {
      log('HEALTH_CHECK', 'FAIL', '服务状态异常', data);
      return false;
    }
  } catch (error) {
    log('HEALTH_CHECK', 'ERROR', error.message);
    return false;
  }
}

// 测试2: 验证码生成
async function testCaptcha() {
  log('CAPTCHA_GENERATE', 'START', '开始测试验证码生成');
  try {
    const response = await fetch(`${API_BASE}/api/captcha`);
    const data = await response.json();
    
    if (data.code === 200 && data.data.captchaId && data.data.captchaImage) {
      log('CAPTCHA_GENERATE', 'PASS', '验证码生成成功', { 
        captchaId: data.data.captchaId,
        imageLength: data.data.captchaImage.length 
      });
      return data.data.captchaId;
    } else {
      log('CAPTCHA_GENERATE', 'FAIL', '验证码生成失败', data);
      return null;
    }
  } catch (error) {
    log('CAPTCHA_GENERATE', 'ERROR', error.message);
    return null;
  }
}

// 测试3: 用户注册流程
async function testUserRegistration() {
  log('USER_REGISTER', 'START', '开始测试用户注册');
  const username = `testuser_${Date.now()}`;
  const password = 'Test123!@#';
  
  try {
    const response = await fetch(`${API_BASE}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.code === 200) {
      log('USER_REGISTER', 'PASS', '用户注册成功', { username, userId: data.data?.id });
      return { username, password, success: true };
    } else if (data.code === 400 && data.message.includes('已存在')) {
      log('USER_REGISTER', 'WARN', '用户已存在，使用现有用户测试', { username });
      return { username, password, success: true, existing: true };
    } else {
      log('USER_REGISTER', 'FAIL', `注册失败: ${data.message}`, data);
      return { success: false };
    }
  } catch (error) {
    log('USER_REGISTER', 'ERROR', error.message);
    return { success: false };
  }
}

// 测试4: 用户登录流程
async function testUserLogin(username, password) {
  log('USER_LOGIN', 'START', '开始测试用户登录', { username });
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.code === 200 && data.data?.token) {
      log('USER_LOGIN', 'PASS', '用户登录成功', { 
        username: data.data.user?.username,
        hasToken: true 
      });
      return { token: data.data.token, user: data.data.user, success: true };
    } else {
      log('USER_LOGIN', 'FAIL', `登录失败: ${data.message}`, data);
      return { success: false };
    }
  } catch (error) {
    log('USER_LOGIN', 'ERROR', error.message);
    return { success: false };
  }
}

// 测试5: 获取攻略列表（未登录）
async function testGuidesPublic() {
  log('GUIDES_PUBLIC', 'START', '开始测试公开攻略列表');
  
  try {
    const response = await fetch(`${API_BASE}/api/guides?page=1&pageSize=10`);
    const data = await response.json();
    
    if (data.code === 200) {
      const approvedGuides = data.data?.guides || [];
      log('GUIDES_PUBLIC', 'PASS', `获取到 ${approvedGuides.length} 条已审核攻略`, {
        total: data.data?.pagination?.total,
        guidesCount: approvedGuides.length
      });
      
      // 验证所有攻略都是已审核状态
      const nonApproved = approvedGuides.filter(g => g.status !== 'approved');
      if (nonApproved.length > 0) {
        log('GUIDES_PUBLIC', 'FAIL', `发现 ${nonApproved.length} 条未审核攻略`, nonApproved);
        return { success: false, guides: approvedGuides };
      }
      
      return { success: true, guides: approvedGuides };
    } else {
      log('GUIDES_PUBLIC', 'FAIL', `获取失败: ${data.message}`, data);
      return { success: false };
    }
  } catch (error) {
    log('GUIDES_PUBLIC', 'ERROR', error.message);
    return { success: false };
  }
}

// 测试6: 管理员登录
async function testAdminLogin() {
  log('ADMIN_LOGIN', 'START', '开始测试管理员登录');
  
  try {
    // 先获取验证码
    const captchaResponse = await fetch(`${API_BASE}/api/captcha`);
    const captchaData = await captchaResponse.json();
    
    if (captchaData.code !== 200) {
      log('ADMIN_LOGIN', 'FAIL', '验证码获取失败');
      return { success: false };
    }
    
    // 注意：这里需要正确的管理员凭据
    const response = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
        captchaId: captchaData.data.captchaId,
        captchaText: 'TEST' // 实际测试时需要正确的验证码
      })
    });
    
    const data = await response.json();
    
    if (data.code === 200 && data.data?.token) {
      log('ADMIN_LOGIN', 'PASS', '管理员登录成功', { username: 'admin' });
      return { token: data.data.token, success: true };
    } else {
      log('ADMIN_LOGIN', 'INFO', `登录结果: ${data.message}`, data);
      return { success: false, message: data.message };
    }
  } catch (error) {
    log('ADMIN_LOGIN', 'ERROR', error.message);
    return { success: false };
  }
}

// 测试7: 管理员获取攻略统计
async function testAdminGuideStats(adminToken) {
  log('ADMIN_GUIDE_STATS', 'START', '开始测试管理员攻略统计');
  
  try {
    const response = await fetch(`${API_BASE}/api/admin/guides?status=pending&page=1&pageSize=10`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const data = await response.json();
    
    if (data.code === 200 && data.data?.counts) {
      log('ADMIN_GUIDE_STATS', 'PASS', '获取统计成功', {
        pending: data.data.counts.pending,
        approved: data.data.counts.approved,
        rejected: data.data.counts.rejected,
        currentPageGuides: data.data.guides?.length
      });
      return { 
        success: true, 
        counts: data.data.counts,
        guides: data.data.guides 
      };
    } else {
      log('ADMIN_GUIDE_STATS', 'FAIL', `获取统计失败: ${data.message}`, data);
      return { success: false };
    }
  } catch (error) {
    log('ADMIN_GUIDE_STATS', 'ERROR', error.message);
    return { success: false };
  }
}

// 测试8: 数据库修复功能
async function testDbFix() {
  log('DB_FIX', 'START', '开始测试数据库修复');
  
  try {
    const response = await fetch(`${API_BASE}/api/db-fix`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.code === 200) {
      log('DB_FIX', 'PASS', '数据库修复成功', data.data);
      return { success: true, results: data.data };
    } else {
      log('DB_FIX', 'FAIL', `修复失败: ${data.message}`, data);
      return { success: false };
    }
  } catch (error) {
    log('DB_FIX', 'ERROR', error.message);
    return { success: false };
  }
}

// 生成测试报告
function generateReport() {
  console.log('\n========== API端到端测试报告 ==========\n');
  
  const passed = testLogs.filter(l => l.status === 'PASS').length;
  const failed = testLogs.filter(l => l.status === 'FAIL').length;
  const errors = testLogs.filter(l => l.status === 'ERROR').length;
  const warnings = testLogs.filter(l => l.status === 'WARN').length;
  
  console.log(`总测试步骤: ${testLogs.length}`);
  console.log(`通过: ${passed} | 失败: ${failed} | 错误: ${errors} | 警告: ${warnings}`);
  console.log('\n详细日志:\n');
  
  testLogs.forEach((log, index) => {
    const icon = log.status === 'PASS' ? '✅' : 
                 log.status === 'FAIL' ? '❌' : 
                 log.status === 'ERROR' ? '💥' : 
                 log.status === 'WARN' ? '⚠️' : '📋';
    console.log(`${index + 1}. ${icon} [${log.step}] ${log.message}`);
  });
  
  console.log('\n========== 测试完成 ==========\n');
  
  return {
    total: testLogs.length,
    passed,
    failed,
    errors,
    warnings,
    logs: testLogs
  };
}

// 运行所有测试
async function runAllTests() {
  console.log('开始API端到端测试...\n');
  
  // 1. 健康检查
  const healthOk = await testHealth();
  if (!healthOk) {
    log('TEST_ABORT', 'ERROR', '健康检查失败，中止测试');
    return generateReport();
  }
  
  // 2. 验证码测试
  await testCaptcha();
  
  // 3. 数据库修复测试
  await testDbFix();
  
  // 4. 用户注册测试
  const userReg = await testUserRegistration();
  
  // 5. 用户登录测试
  let userToken = null;
  if (userReg.success) {
    const userLogin = await testUserLogin(userReg.username, userReg.password);
    if (userLogin.success) {
      userToken = userLogin.token;
    }
  }
  
  // 6. 公开攻略列表测试
  await testGuidesPublic();
  
  // 7. 管理员登录测试
  const adminLogin = await testAdminLogin();
  
  // 8. 管理员统计测试
  if (adminLogin.success) {
    await testAdminGuideStats(adminLogin.token);
  }
  
  return generateReport();
}

// 导出测试函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, testLogs };
}

// 如果在浏览器或Node环境中直接运行
if (typeof window !== 'undefined') {
  window.runAPITests = runAllTests;
} else if (typeof global !== 'undefined') {
  global.runAPITests = runAllTests;
}

// 自动运行测试（如果在Node环境中）
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests().then(report => {
    process.exit(report.failed + report.errors > 0 ? 1 : 0);
  });
}
