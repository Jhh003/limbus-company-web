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
    
    // 当前验证码ID
    currentCaptchaId: null,
    
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
                        <label>验证码</label>
                        <div class="auth-captcha-row">
                            <input type="text" id="auth-captcha" required placeholder="输入验证码">
                            <div id="captcha-svg" class="auth-captcha-box" title="点击刷新">
                                点击获取
                            </div>
                        </div>
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
        
        // 绑定事件
        this._bindModalEvents(modal);
        
        // 获取验证码
        this.refreshCaptcha();
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
        
        // 验证码点击刷新
        document.getElementById('captcha-svg').addEventListener('click', () => {
            self.refreshCaptcha();
        });
        
        // 用户名实时检查
        const usernameInput = document.getElementById('auth-username');
        let checkTimeout = null;
        usernameInput.addEventListener('input', () => {
            clearTimeout(checkTimeout);
            const username = usernameInput.value;
            if (username.length >= 3 && /^[a-zA-Z0-9]+$/.test(username)) {
                checkTimeout = setTimeout(() => self.checkUsername(username), 500);
            }
        });
    },
    
    /**
     * 关闭认证弹窗
     */
    closeAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) modal.remove();
        this.currentCaptchaId = null;
    },
    
    /**
     * 刷新验证码
     */
    async refreshCaptcha() {
        const captchaEl = document.getElementById('captcha-svg');
        
        try {
            console.log('[AuthModule] 开始获取验证码...');
            
            if (captchaEl) {
                captchaEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
            }
            
            const response = await fetch(`${this.API_BASE}/captcha`);
            
            if (!response.ok) {
                console.error(`[AuthModule] 验证码请求失败: ${response.status} ${response.statusText}`);
                if (captchaEl) {
                    captchaEl.innerHTML = '<span style="color: #ff6b6b;">加载失败，点击重试</span>';
                }
                this.showMessage('验证码加载失败，请刷新页面重试', 'error');
                return;
            }
            
            const result = await response.json();
            console.log('[AuthModule] 验证码响应:', result);
            
            if (result.code === 200 && result.data) {
                this.currentCaptchaId = result.data.captchaId;
                const captchaImage = result.data.captchaImage;
                
                if (captchaEl && captchaImage) {
                    // 使用 img 标签显示验证码图片
                    captchaEl.innerHTML = `<img src="${captchaImage}" alt="验证码" style="width: 100%; height: 100%; object-fit: contain; cursor: pointer;">`;
                    
                    // 绑定图片点击事件
                    const img = captchaEl.querySelector('img');
                    if (img) {
                        img.onclick = () => this.refreshCaptcha();
                    }
                    
                    console.log('[AuthModule] 验证码加载成功');
                }
            } else {
                console.error('[AuthModule] 验证码响应错误:', result.message);
                if (captchaEl) {
                    captchaEl.innerHTML = '<span style="color: #ff6b6b;">加载失败，点击重试</span>';
                }
                this.showMessage(result.message || '验证码加载失败', 'error');
            }
        } catch (error) {
            console.error('[AuthModule] 获取验证码失败:', error);
            if (captchaEl) {
                captchaEl.innerHTML = '<span style="color: #ff6b6b;">加载失败，点击重试</span>';
            }
            this.showMessage('验证码加载失败，请检查网络连接', 'error');
        }
    },
    
    /**
     * 检查用户名是否可用
     */
    async checkUsername(username) {
        const statusEl = document.getElementById('username-status');
        if (!statusEl) return;
        
        try {
            const response = await fetch(`${this.API_BASE}/auth/check-username/${username}`);
            const result = await response.json();
            if (result.available) {
                statusEl.innerHTML = '<i class="fas fa-check-circle"></i> 用户名可用';
                statusEl.className = 'auth-status auth-status-success';
            } else {
                statusEl.textContent = result.message || '用户名已被注册';
                statusEl.className = 'auth-status auth-status-error';
            }
        } catch (error) {
            console.error('检查用户名失败:', error);
        }
    },
    
    /**
     * 处理登录
     */
    async handleLogin() {
        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value;
        const captchaText = document.getElementById('auth-captcha').value.trim();
        
        if (!username || !password || !captchaText) {
            this.showMessage('请填写所有字段', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username, 
                    password, 
                    captchaId: this.currentCaptchaId, 
                    captchaText 
                })
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
                this.refreshCaptcha();
            }
        } catch (error) {
            console.error('登录错误:', error);
            this.showMessage('登录失败: ' + error.message, 'error');
        }
    },
    
    /**
     * 处理注册
     */
    async handleRegister() {
        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value;
        const captchaText = document.getElementById('auth-captcha').value.trim();
        
        if (!username || !password || !captchaText) {
            this.showMessage('请填写所有字段', 'warning');
            return;
        }
        
        // 验证用户名格式
        if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
            this.showMessage('用户名只能包含3-20位英文字母和数字', 'warning');
            return;
        }
        
        // 验证密码格式
        if (password.length < 8 || password.length > 20) {
            this.showMessage('密码长度必须是8-20位', 'warning');
            return;
        }
        if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
            this.showMessage('密码必须同时包含字母和数字', 'warning');
            return;
        }
        if (!/^[a-zA-Z0-9]+$/.test(password)) {
            this.showMessage('密码只能包含英文字母和数字', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username, 
                    password, 
                    captchaId: this.currentCaptchaId, 
                    captchaText 
                })
            });
            
            const result = await response.json();
            
            if (result.code === 200 && result.success) {
                this.showMessage('注册成功！请使用该账号登录', 'success');
                // 清空验证码输入
                const captchaInput = document.getElementById('auth-captcha');
                if (captchaInput) captchaInput.value = '';
                this.refreshCaptcha();
            } else {
                this.showMessage(result.message || '注册失败', 'error');
                this.refreshCaptcha();
            }
        } catch (error) {
            console.error('注册错误:', error);
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
