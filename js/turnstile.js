/**
 * Cloudflare Turnstile集成
 * 完全免费的人机验证服务
 */

// 加载Turnstile脚本
(function() {
  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
  script.async = true;
  script.defer = true;
  script.onload = function() {
    console.log('[Turnstile] 脚本加载成功');
  };
  script.onerror = function() {
    console.error('[Turnstile] 脚本加载失败');
  };
  document.head.appendChild(script);
})();

// 渲染Turnstile widget
function renderTurnstile(containerId, siteKey, callback) {
  if (typeof turnstile === 'undefined') {
    console.error('[Turnstile] Turnstile未加载');
    return;
  }
  
  try {
    turnstile.render('#' + containerId, {
      sitekey: siteKey,
      theme: 'dark',
      callback: function(token) {
        console.log('[Turnstile] 验证成功');
        if (callback) callback(token);
      },
      'error-callback': function(error) {
        console.error('[Turnstile] 验证失败:', error);
        if (callback) callback(null);
      },
      'expired-callback': function() {
        console.log('[Turnstile] 验证码已过期');
        if (callback) callback(null);
      }
    });
  } catch (error) {
    console.error('[Turnstile] 渲染失败:', error);
  }
}

// 重置Turnstile widget
function resetTurnstile(containerId) {
  if (typeof turnstile !== 'undefined') {
    try {
      turnstile.reset('#' + containerId);
      console.log('[Turnstile] Widget已重置');
    } catch (error) {
      console.error('[Turnstile] 重置失败:', error);
    }
  }
}

// 导出函数
if (typeof window !== 'undefined') {
  window.TurnstileWidget = {
    render: renderTurnstile,
    reset: resetTurnstile
  };
}
