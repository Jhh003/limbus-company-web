/**
 * modal-new.js - 改进的模态对话框系统
 * 
 * 特点：
 * - Promise-based API
 * - 样式隔离
 * - 无障碍支持 (ARIA)
 * - 动画效果
 * - 可配置性强
 */

class Modal {
    constructor(options = {}) {
        this.options = {
            animationDuration: 300,
            closeOnEscape: true,
            closeOnOverlayClick: true,
            ...options
        };
        
        this.modalContainer = null;
        this.isOpen = false;
    }
    
    /**
     * 初始化模态容器
     */
    initContainer() {
        if (this.modalContainer) return;
        
        this.modalContainer = document.createElement('div');
        this.modalContainer.id = 'custom-modal-container';
        this.modalContainer.setAttribute('role', 'region');
        this.modalContainer.setAttribute('aria-label', '对话框容器');
        this.modalContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: none;
            z-index: 10000;
        `;
        
        this.modalContainer.innerHTML = `
            <div class="modal-overlay" style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0);
                transition: background 0.3s ease;
            ">
                <div class="modal-box" style="
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(0.95);
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    max-width: 500px;
                    width: 90%;
                    opacity: 0;
                    transition: all 0.3s ease;
                    z-index: 10001;
                ">
                    <div class="modal-header" style="
                        padding: 20px;
                        border-bottom: 1px solid #eee;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <h3 class="modal-title" style="
                            margin: 0;
                            font-size: 18px;
                            font-weight: 600;
                        "></h3>
                        <button class="modal-close-btn" aria-label="关闭对话框" style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: #666;
                            padding: 0;
                            width: 32px;
                            height: 32px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">×</button>
                    </div>
                    <div class="modal-body" style="
                        padding: 20px;
                        max-height: 400px;
                        overflow-y: auto;
                    ">
                        <p class="modal-message" style="
                            margin: 0;
                            line-height: 1.6;
                            color: #333;
                        "></p>
                    </div>
                    <div class="modal-footer" style="
                        padding: 20px;
                        border-top: 1px solid #eee;
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                    "></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modalContainer);
        
        // 绑定事件
        this.bindEvents();
    }
    
    /**
     * 绑定事件处理器
     */
    bindEvents() {
        const overlay = this.modalContainer.querySelector('.modal-overlay');
        const closeBtn = this.modalContainer.querySelector('.modal-close-btn');
        
        // 关闭按钮
        closeBtn?.addEventListener('click', () => this.close());
        
        // 背景点击关闭
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay && this.options.closeOnOverlayClick) {
                this.close();
            }
        });
        
        // ESC键关闭
        this.escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen && this.options.closeOnEscape) {
                this.close();
            }
        };
    }
    
    /**
     * 显示模态
     */
    show(title, message, buttons = [], onClose = null) {
        return new Promise((resolve) => {
            this.initContainer();
            
            const titleEl = this.modalContainer.querySelector('.modal-title');
            const messageEl = this.modalContainer.querySelector('.modal-message');
            const footer = this.modalContainer.querySelector('.modal-footer');
            const box = this.modalContainer.querySelector('.modal-box');
            
            // 设置内容
            titleEl.textContent = title;
            messageEl.textContent = message;
            footer.innerHTML = '';
            
            // 添加按钮
            buttons.forEach((btn, index) => {
                const button = document.createElement('button');
                button.className = `modal-btn ${btn.className || ''}`;
                button.style.cssText = `
                    padding: 8px 16px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                    ${btn.className?.includes('primary') ? 
                        'background: #007bff; color: white; border-color: #007bff;' :
                        'background: white; color: #333;'
                    }
                `;
                
                button.textContent = btn.text;
                button.setAttribute('aria-label', btn.text);
                
                // 悬停效果
                button.addEventListener('mouseover', () => {
                    if (btn.className?.includes('primary')) {
                        button.style.background = '#0056b3';
                    } else {
                        button.style.background = '#f5f5f5';
                    }
                });
                
                button.addEventListener('mouseout', () => {
                    if (btn.className?.includes('primary')) {
                        button.style.background = '#007bff';
                    } else {
                        button.style.background = 'white';
                    }
                });
                
                button.addEventListener('click', () => {
                    const result = btn.callback ? btn.callback() : (index === buttons.length - 1);
                    this.close();
                    resolve(result);
                });
                
                footer.appendChild(button);
            });
            
            // 显示模态
            this.modalContainer.style.display = 'block';
            setTimeout(() => {
                const overlay = this.modalContainer.querySelector('.modal-overlay');
                overlay.style.background = 'rgba(0, 0, 0, 0.5)';
                box.style.opacity = '1';
                box.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 10);
            
            this.isOpen = true;
            document.addEventListener('keydown', this.escapeHandler);
            
            // 设置关闭回调
            const originalClose = this.close.bind(this);
            this.close = () => {
                originalClose();
                resolve(null);
                if (onClose) onClose();
            };
        });
    }
    
    /**
     * 关闭模态
     */
    close() {
        if (!this.isOpen || !this.modalContainer) return;
        
        const overlay = this.modalContainer.querySelector('.modal-overlay');
        const box = this.modalContainer.querySelector('.modal-box');
        
        overlay.style.background = 'rgba(0, 0, 0, 0)';
        box.style.opacity = '0';
        box.style.transform = 'translate(-50%, -50%) scale(0.95)';
        
        setTimeout(() => {
            this.modalContainer.style.display = 'none';
        }, this.options.animationDuration);
        
        this.isOpen = false;
        document.removeEventListener('keydown', this.escapeHandler);
    }
    
    /**
     * Alert对话框
     */
    alert(message, title = '提示') {
        return this.show(title, message, [
            {
                text: '确定',
                className: 'modal-btn-primary',
                callback: () => true
            }
        ]);
    }
    
    /**
     * Confirm对话框
     */
    confirm(message, title = '确认') {
        return this.show(title, message, [
            {
                text: '取消',
                className: 'modal-btn-secondary',
                callback: () => false
            },
            {
                text: '确定',
                className: 'modal-btn-primary',
                callback: () => true
            }
        ]);
    }
    
    /**
     * Prompt对话框
     */
    prompt(message, title = '输入', defaultValue = '') {
        return new Promise((resolve) => {
            this.initContainer();
            
            const titleEl = this.modalContainer.querySelector('.modal-title');
            const messageEl = this.modalContainer.querySelector('.modal-message');
            const bodyEl = this.modalContainer.querySelector('.modal-body');
            const footer = this.modalContainer.querySelector('.modal-footer');
            const box = this.modalContainer.querySelector('.modal-box');
            
            titleEl.textContent = title;
            messageEl.textContent = message;
            
            // 添加输入框
            const input = document.createElement('input');
            input.type = 'text';
            input.value = defaultValue;
            input.style.cssText = `
                width: 100%;
                padding: 8px;
                margin-top: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                box-sizing: border-box;
            `;
            
            bodyEl.appendChild(input);
            
            footer.innerHTML = '';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            cancelBtn.className = 'modal-btn modal-btn-secondary';
            cancelBtn.style.cssText = `
                padding: 8px 16px;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;
            cancelBtn.addEventListener('click', () => {
                this.close();
                resolve(null);
            });
            
            const okBtn = document.createElement('button');
            okBtn.textContent = '确定';
            okBtn.className = 'modal-btn modal-btn-primary';
            okBtn.style.cssText = `
                padding: 8px 16px;
                border: 1px solid #007bff;
                background: #007bff;
                color: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;
            okBtn.addEventListener('click', () => {
                const value = input.value;
                this.close();
                resolve(value);
            });
            
            footer.appendChild(cancelBtn);
            footer.appendChild(okBtn);
            
            // 显示模态
            this.modalContainer.style.display = 'block';
            setTimeout(() => {
                const overlay = this.modalContainer.querySelector('.modal-overlay');
                overlay.style.background = 'rgba(0, 0, 0, 0.5)';
                box.style.opacity = '1';
                box.style.transform = 'translate(-50%, -50%) scale(1)';
                input.focus();
            }, 10);
            
            this.isOpen = true;
            
            // 回车确认
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    okBtn.click();
                }
            });
        });
    }
}

// 导出单例
const modal = new Modal();

export default modal;
export { Modal };
