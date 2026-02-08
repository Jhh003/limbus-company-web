/**
 * 用户认证模块
 * 统一的登录/注册功能，可在多个页面复用
 */

const AuthModule = {
    // API基础路径（优先使用全局配置）
    get API_BASE() {
        return window.API_BASE || '/api';
    },
    
    // 当前用户信息
    currentUser: null,
    
    // Turnstile token
    turnstileToken: null,
    
    // Turnstile Site Key
    TURNSTILE_SITE_KEY: '0x4AAAAAACZSYpsYj5RndDNV',
    
    // UI更新回调
    onUserChange: null,
    
    // 消息提示回调
    showMessage: null,
    
    /**
     * 初始化认证模块
     * @param {Object} options 配置选项
     * @param {Function} options.onUserChange 用户状态变化时的回调
     * @param {Function} options.showMessage 消息提示函数
     */
    init(options = {}) {
        this.onUserChange = options.onUserChange || this.defaultUserUIUpdate.bind(this);
        this.showMessage = options.showMessage || ((msg, type) => alert(msg));
        
        // 注入下拉菜单样式
        this.injectDropdownStyles();
        
        // 从localStorage读取用户信息
        this.currentUser = JSON.parse(localStorage.getItem('limbus_user') || 'null');
        
        // 触发初始状态回调（延迟执行，确保DOM已加载）
        setTimeout(() => {
            this.onUserChange(this.currentUser);
        }, 0);
        
        return this;
    },
    
    /**
     * 注入下拉菜单CSS
     */
    injectDropdownStyles() {
        if (document.getElementById('auth-dropdown-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'auth-dropdown-styles';
        style.textContent = `
            .nav-user-container {
                position: relative;
                display: inline-block;
            }
            
            .user-dropdown-menu {
                display: none;
                position: absolute;
                top: 100%;
                right: 0;
                background: rgba(20, 20, 20, 0.95);
                border: 1px solid var(--lc-gold, #d4af37);
                border-radius: 4px;
                min-width: 160px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                z-index: 1000;
                margin-top: 5px;
                overflow: hidden;
            }
            
            .nav-user-container:hover .user-dropdown-menu {
                display: block;
            }
            
            .dropdown-item {
                display: block;
                padding: 10px 15px;
                color: #ccc;
                text-decoration: none;
                transition: all 0.2s;
                font-size: 14px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                text-align: left;
                cursor: pointer;
            }
            
            .dropdown-item:last-child {
                border-bottom: none;
            }
            
            .dropdown-item:hover {
                background: rgba(212, 175, 55, 0.1);
                color: var(--lc-gold, #d4af37);
                padding-left: 20px;
            }
            
            .dropdown-item i {
                width: 20px;
                margin-right: 5px;
                text-align: center;
            }
            
            /* 移动端适配 */
            @media (max-width: 768px) {
                .user-dropdown-menu {
                    position: fixed;
                    top: auto;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    width: 100%;
                    border-radius: 12px 12px 0 0;
                    background: #1a1a1a;
                    border: none;
                    border-top: 2px solid var(--lc-gold, #d4af37);
                    padding-bottom: 20px;
                    transform: translateY(100%);
                    transition: transform 0.3s;
                    display: block;
                }
                
                .nav-user-container.active .user-dropdown-menu {
                    transform: translateY(0);
                }
                
                .dropdown-item {
                    padding: 15px 20px;
                    font-size: 16px;
                }
            }
        `;
        document.head.appendChild(style);
    },
    
    /**
     * 默认的用户UI更新逻辑
     */
    defaultUserUIUpdate(user) {
        const authBtn = document.getElementById('auth-btn');
        const authText = document.getElementById('auth-text');
        
        if (!authBtn) return;
        
        // 查找或创建容器
        let container = authBtn.parentElement;
        if (!container.classList.contains('nav-user-container')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'nav-user-container';
            authBtn.parentNode.insertBefore(wrapper, authBtn);
            wrapper.appendChild(authBtn);
            container = wrapper;
        }
        
        // 移除旧菜单
        const oldMenu = container.querySelector('.user-dropdown-menu');
        if (oldMenu) oldMenu.remove();
        
        if (user) {
            if (authText) authText.textContent = user.username;
            authBtn.classList.add('logged-in');
            // 移除原本的 onclick，改为下拉菜单触发
            authBtn.onclick = (e) => {
                if (window.innerWidth <= 768) {
                    container.classList.toggle('active');
                    e.stopPropagation();
                    
                    // 点击外部关闭
                    const closeHandler = (ev) => {
                        if (!container.contains(ev.target)) {
                            container.classList.remove('active');
                            document.removeEventListener('click', closeHandler);
                        }
                    };
                    document.addEventListener('click', closeHandler);
                } else {
                    // PC端 hover 即可，点击无动作或跳转个人中心
                    // window.location.href = '/user/profile'; 
                }
            };
            
            // 创建下拉菜单
            const menu = document.createElement('div');
            menu.className = 'user-dropdown-menu';
            menu.innerHTML = `
                <a href="/user/contributions" target="_blank" class="dropdown-item">
                    <i class="fas fa-list-alt"></i> 我的投稿
                </a>
                <div class="dropdown-item" id="logout-item">
                    <i class="fas fa-sign-out-alt"></i> 退出登录
                </div>
            `;
            container.appendChild(menu);
            
            // 绑定登出事件
            menu.querySelector('#logout-item').onclick = () => {
                this.logout();
            };
            
        } else {
            if (authText) authText.textContent = '登录/注册';
            authBtn.classList.remove('logged-in');
            authBtn.onclick = () => this.openAuthModal();
        }
    },
    
    /**
     * 获取当前用户
     */
    getUser() {
        // 每次获取时重新从localStorage读取，确保多页面同步
        this.currentUser = JSON.parse(localStorage.getItem('limbus_user') || 'null');
        return this.currentUser;
    },
    
    /**
     * 检查是否已登录
     */
    isLoggedIn() {
        return !!this.getUser();
    },
    
    /**
     * 打开登录/注册弹窗
     */
    openAuthModal() {
        // 更新当前用户状态
        this.currentUser = this.getUser();
        
        if (this.currentUser) {
            // 已登录，显示登出确认
            if (confirm(`当前登录: ${this.currentUser.username}\n\n是否登出？`)) {
                this.logout();
            }
            return;
        }
        
        // 创建模态框
        const modal = document.createElement('div');
        modal.id = 'auth-modal';
        modal.className = 'auth-modal-overlay';
        modal.innerHTML = `
            <div class="auth-modal-content">
                <div class="auth-modal-header">
                    <i class="fas fa-lock"></i>
                    <h2>用户登录/注册</h2>
                </div>
                
                <div class="auth-modal-notice">
                    <p>
                        <i class="fas fa-exclamation-triangle"></i> <strong>重要提示</strong><br>
                        密码仅用于查看您的投稿记录，请务必记住！<br>
                        用户名只能使用英文字母和数字，密码需包含字母和数字组合。
                    </p>
                </div>
                
                <form id="auth-form">
                    <div class="auth-form-group">
                        <label>用户名 <span class="auth-hint">(3-20位英文数字)</span></label>
                        <input type="text" id="auth-username" pattern="[a-zA-Z0-9]+" minlength="3" maxlength="20" required
                               placeholder="例如: Player123">
                        <div id="username-status" class="auth-status"></div>
                    </div>
                    
                    <div class="auth-form-group">
                        <label>密码 <span class="auth-hint">(8-20位字母数字组合)</span></label>
                        <input type="password" id="auth-password" minlength="8" maxlength="20" required
                               placeholder="例如: Pass1234">
                    </div>
                    
                    <div class="auth-form-group">
                        <label>人机验证</label>
                        <div id="auth-turnstile" class="turnstile-container"></div>
                    </div>
                    
                    <div class="auth-btn-row">
                        <button type="submit" id="login-btn" class="auth-btn auth-btn-primary">
                            登录
                        </button>
                        <button type="button" id="register-btn" class="auth-btn auth-btn-secondary">
                            注册
                        </button>
                    </div>
                </form>
                
                <button id="auth-cancel-btn" class="auth-btn auth-btn-cancel">
                    取消
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 初始化Turnstile
        if (typeof TurnstileWidget !== 'undefined') {
            TurnstileWidget.render('auth-turnstile', this.TURNSTILE_SITE_KEY, (token) => {
                this.turnstileToken = token;
                console.log('[AuthModule] Turnstile验证成功');
            });
        }
        
        // 绑定事件
        this._bindModalEvents(modal);
    },
    
    /**
     * 绑定模态框事件
     */
    _bindModalEvents(modal) {
        const self = this;
        
        // 修复：使用 mousedown/mouseup 组合判断点击外部，避免文本选择时意外关闭
        let isMouseDownOnOverlay = false;
        
        modal.addEventListener('mousedown', (e) => {
            isMouseDownOnOverlay = (e.target === modal);
        });
        
        modal.addEventListener('click', (e) => {
            // 只有当 mousedown 和 click 都在遮罩层上时才关闭
            if (e.target === modal && isMouseDownOnOverlay) {
                self.closeAuthModal();
            }
            isMouseDownOnOverlay = false;
        });
        
        // 取消按钮
        document.getElementById('auth-cancel-btn').addEventListener('click', () => {
            self.closeAuthModal();
        });
        
        // 表单提交（登录）
        document.getElementById('auth-form').addEventListener('submit', (e) => {
            e.preventDefault();
            self.handleLogin();
        });
        
        // 注册按钮
        document.getElementById('register-btn').addEventListener('click', () => {
            self.handleRegister();
        });
    },
    
    /**
     * 关闭认证弹窗
     */
    closeAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) modal.remove();
        this.turnstileToken = null;
    },
    
    /**
     * 处理登录
     */
    async handleLogin() {
        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value;
        
        if (!username || !password) {
            this.showMessage('请填写所有字段', 'warning');
            return;
        }
        
        if (!this.turnstileToken) {
            this.showMessage('请完成人机验证', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, turnstileToken: this.turnstileToken })
            });
            
            const result = await response.json();
            
            if (result.code === 200 && result.success) {
                this.currentUser = {
                    username: result.data.username,
                    token: result.data.token
                };
                localStorage.setItem('limbus_user', JSON.stringify(this.currentUser));
                this.onUserChange(this.currentUser);
                this.closeAuthModal();
                this.showMessage('登录成功！', 'success');
            } else {
                this.showMessage(result.message || '登录失败', 'error');
                // 重置Turnstile
                if (typeof TurnstileWidget !== 'undefined') {
                    TurnstileWidget.reset('auth-turnstile');
                    this.turnstileToken = null;
                }
            }
        } catch (error) {
            console.error('[AuthModule] 登录错误:', error);
            this.showMessage('登录失败: ' + error.message, 'error');
        }
    },
    
    /**
     * 处理注册
     */
    async handleRegister() {
        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value;
        
        if (!username || !password) {
            this.showMessage('请填写所有字段', 'warning');
            return;
        }
        
        if (!this.turnstileToken) {
            this.showMessage('请完成人机验证', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, turnstileToken: this.turnstileToken })
            });
            
            const result = await response.json();
            
            if (result.code === 200 && result.success) {
                this.showMessage('注册成功！请使用该账号登录', 'success');
            } else {
                this.showMessage(result.message || '注册失败', 'error');
                // 重置Turnstile
                if (typeof TurnstileWidget !== 'undefined') {
                    TurnstileWidget.reset('auth-turnstile');
                    this.turnstileToken = null;
                }
            }
        } catch (error) {
            console.error('[AuthModule] 注册错误:', error);
            this.showMessage('注册失败: ' + error.message, 'error');
        }
    },
    
    /**
     * 登出
     */
    logout() {
        this.currentUser = null;
        localStorage.removeItem('limbus_user');
        this.onUserChange(null);
        this.showMessage('已登出', 'success');
    }
};

// ES6模块导出
export { AuthModule };

// 全局变量导出（兼容非模块化页面）
if (typeof window !== 'undefined') {
    window.AuthModule = AuthModule;
}
