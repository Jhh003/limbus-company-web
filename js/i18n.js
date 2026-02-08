/**
 * 多语言管理器
 * 语言文件在 HTML 中静态加载
 */

const I18nManager = {
    currentLang: localStorage.getItem('rankingLang') || 'zh',
    
    // 获取当前语言的翻译
    get translations() {
        return this.currentLang === 'zh' ? i18nZH : i18nEN;
    },
    
    // 获取罪人名称映射
    get sinnerMap() {
        return this.currentLang === 'zh' ? sinnerNamesZH : sinnerNamesEN;
    },
    
    // 初始化
    init() {
        this.updateLanguage();
        document.getElementById('lang-label').textContent = this.currentLang === 'zh' ? 'EN' : 'CN';
    },
    
    // 切换语言
    toggle() {
        this.currentLang = this.currentLang === 'zh' ? 'en' : 'zh';
        localStorage.setItem('rankingLang', this.currentLang);
        document.getElementById('lang-label').textContent = this.currentLang === 'zh' ? 'EN' : 'CN';
        this.updateLanguage(); // 调用此方法会同时更新所有文本和罪人按钮
    },
    
    // 获取翻译
    t(key) {
        return this.translations[key] || key;
    },
    
    // 更新页面文本
    updateLanguage() {
        const t = this.translations;
        
        // 普通文本
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) {
                el.innerHTML = t[key];
            }
        });
        
        // Placeholders
        document.querySelectorAll('[data-i18n-ph]').forEach(el => {
            const key = el.getAttribute('data-i18n-ph');
            if (t[key]) {
                el.placeholder = t[key];
            }
        });
        
        // 楼层按钮
        document.querySelectorAll('.floor-btn').forEach(btn => {
            const key = btn.getAttribute('data-i18n');
            if (key && t[key]) {
                btn.textContent = t[key];
            }
        });
        
        // 排序下拉框
        document.querySelectorAll('#sort-dropdown option').forEach(opt => {
            const key = opt.getAttribute('data-i18n');
            if (key && t[key]) {
                opt.textContent = t[key];
            }
        });
        
        // 罪人筛选按钮 - 关键修复：更新所有罪人按钮的显示名
        this.updateSinnerButtons();
    },
    
    // 重新渲染罪人按钮 - 支持语言切换
    updateSinnerButtons() {
        document.querySelectorAll('.sinner-filter-btn').forEach(btn => {
            const enName = btn.getAttribute('data-en');
            if (enName) {
                // 根据当前语言显示对应名称
                if (this.currentLang === 'zh') {
                    // 中文环境，从英文查找中文
                    btn.textContent = sinnerNamesZH[enName] || enName;
                } else {
                    // 英文环境，直接显示英文
                    btn.textContent = enName;
                }
            }
        });
    },
    
    // 获取罪人显示名
    getSinnerName(enName) {
        return this.currentLang === 'zh' ? (sinnerNamesZH[enName] || enName) : enName;
    }
};

// 全局暴露
window.I18nManager = I18nManager;
window.toggleLanguage = () => I18nManager.toggle();
