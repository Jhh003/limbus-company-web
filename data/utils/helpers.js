// 工具函数模块

// 安全随机整数生成函数 [0, max)
export function secureRandInt(max) {
    if (max <= 0) return 0;
    try {
        if (window.crypto && crypto.randomInt) {
            return crypto.randomInt(0, max);
        }
        if (window.crypto && crypto.getRandomValues) {
            const arr = new Uint32Array(1);
            crypto.getRandomValues(arr);
            return arr[0] % max;
        }
    } catch (e) {
        console.warn('安全随机数失败，回退到 Math.random', e);
    }
    return Math.floor(Math.random() * max);
}

// 防抖函数
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
