/**
 * 全局 API 配置
 * 自动适配本地开发和生产环境
 */

const API_CONFIG = {
  // 开发环境配置
  development: {
    // 本地开发时使用 wrangler pages dev 的默认端口
    baseUrl: 'http://localhost:8788',
    // 如果要在本地连接远程API，取消下面注释
    // baseUrl: 'https://你的项目名.pages.dev'
  },
  
  // 生产环境配置
  production: {
    // Pages Functions 使用相对路径（同域名）
    baseUrl: ''
  }
};

/**
 * 检测当前环境
 */
function detectEnvironment() {
  const hostname = window.location.hostname;
  
  // localhost 或 IP 地址视为开发环境
  if (hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      /^192\.168\./.test(hostname) ||
      /^10\./.test(hostname)) {
    return 'development';
  }
  
  return 'production';
}

/**
 * 获取 API 基础 URL
 */
function getApiBaseUrl() {
  const env = detectEnvironment();
  const config = API_CONFIG[env];
  
  // 生产环境使用相对路径
  if (env === 'production' || !config.baseUrl) {
    return '/api';
  }
  
  // 开发环境使用完整 URL
  return config.baseUrl + '/api';
}

/**
 * 获取完整 API URL
 * @param {string} path - API 路径 (如 '/guides/list')
 * @returns {string} 完整 URL
 */
function getApiUrl(path) {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return baseUrl + cleanPath;
}

// 导出到全局
window.API_CONFIG = API_CONFIG;
window.getApiBaseUrl = getApiBaseUrl;
window.getApiUrl = getApiUrl;

// 兼容旧代码的 API_BASE 变量
window.API_BASE = getApiBaseUrl();

// 检测环境变化时刷新
window.addEventListener('focus', () => {
  window.API_BASE = getApiBaseUrl();
});

console.log(`[API Config] 当前环境: ${detectEnvironment()}, API_BASE: ${window.API_BASE}`);
