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
    const TURNSTILE_SITE_KEY: '0x4AAAAAACZSYpsYj5RndDNV',
    
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
        this.onUserChange = options.onUserChange || (() => {});
        this.showMessage = options.showMessage || ((msg, type) => alert(msg));
        
        // 从localStorage读取用户信息
        this.currentUser = JSON.parse(localStorage.getItem('limbus_user') || 'null');
        
        // 触发初始状态回调（延迟执行，确保DOM已加载）
        setTimeout(() => {
            this.onUserChange(this.currentUser);
        }, 0);
        
        return this;
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
