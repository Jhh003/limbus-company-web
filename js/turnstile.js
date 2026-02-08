/**
 * Cloudflare Turnstile集成
 * 完全免费的人机验证服务
 */

// 渲染Turnstile widget
function renderTurnstile(containerId, siteKey, callback) {
  if (typeof turnstile === 'undefined') {
    console.error('[Turnstile] Turnstile未加载，等待脚本加载...');
    // 等待Turnstile加载
    const checkTurnstile = setInterval(() => {
      if (typeof turnstile !== 'undefined') {
        clearInterval(checkTurnstile);
        console.log('[Turnstile] Turnstile已加载，开始渲染');
        doRenderTurnstile(containerId, siteKey, callback);
      }
    }, 100);
    return;
  }
  
  doRenderTurnstile(containerId, siteKey, callback);
}

function doRenderTurnstile(containerId, siteKey, callback) {
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
