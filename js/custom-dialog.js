/**
 * 自定义提示框系统
 * 用于替代浏览器原生的 alert() 和 confirm()
 */

// Toast 通知
function showToast(message, type = 'info', duration = 3000) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    const titles = {
        success: '成功',
        error: '错误',
        info: '提示'
    };

    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type]} custom-toast-icon"></i>
        <div class="custom-toast-content">
            <div class="custom-toast-title">${titles[type]}</div>
            <div class="custom-toast-message">${message}</div>
        </div>
        <button class="custom-toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(toast);

    if (duration > 0) {
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    return toast;
}

// 成功提示
function showSuccess(message, duration = 3000) {
    return showToast(message, 'success', duration);
}

// 错误提示
function showError(message, duration = 3000) {
    return showToast(message, 'error', duration);
}

// 信息提示
function showInfo(message, duration = 3000) {
    return showToast(message, 'info', duration);
}

// 确认对话框
function showConfirm(options) {
    return new Promise((resolve) => {
        const {
            title = '确认操作',
            message = '确定要执行此操作吗？',
            confirmText = '确定',
            cancelText = '取消',
            icon = 'fa-question-circle',
            isDanger = false
        } = options;

        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';
        
        const confirmBtnClass = isDanger ? 'custom-modal-btn-danger' : 'custom-modal-btn-confirm';
        
        overlay.innerHTML = `
            <div class="custom-modal">
                <div class="custom-modal-header">
                    <i class="fas ${icon} custom-modal-icon"></i>
                    <div class="custom-modal-title">${title}</div>
                </div>
                <div class="custom-modal-body">${message}</div>
                <div class="custom-modal-footer">
                    <button class="custom-modal-btn custom-modal-btn-cancel" data-action="cancel">
                        ${cancelText}
                    </button>
                    <button class="custom-modal-btn ${confirmBtnClass}" data-action="confirm">
                        ${confirmText}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.addEventListener('click', function(e) {
            const action = e.target.closest('[data-action]')?.dataset.action;
            
            if (action === 'confirm') {
                overlay.remove();
                resolve(true);
            } else if (action === 'cancel' || e.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        });
    });
}

// 简单的警告对话框
function showAlert(message, title = '提示') {
    return showConfirm({
        title: title,
        message: message,
        confirmText: '确定',
        cancelText: '',
        icon: 'fa-info-circle'
    }).then(() => {
        // Alert 只有一个确定按钮，所以总是返回 true
        return true;
    });
}

// 加载提示
function showLoading(message = '加载中...') {
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    overlay.id = 'loading-overlay';
    overlay.innerHTML = `
        <div class="custom-modal" style="text-align: center;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--lc-gold); margin-bottom: 16px;"></i>
            <div style="color: var(--lc-text);">${message}</div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    // 返回带有 close 方法的对象
    return {
        close: () => {
            overlay.remove();
        }
    };
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// 导出全局函数
window.showToast = showToast;
window.showSuccess = showSuccess;
window.showError = showError;
window.showInfo = showInfo;
window.showConfirm = showConfirm;
window.showAlert = showAlert;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
