/**
 * UI控制器 - 管理用户界面交互和状态
 * 
 * 职责：
 * - 管理模态框显示和隐藏
 * - 处理加载状态
 * - 显示通知和错误消息
 * - 管理UI元素状态
 * 
 * @module UIController
 */

import { eventBus, GameEvents } from '../core/eventBus.js';
import { logger } from '../core/logger.js';

export class UIController {
    constructor() {
        this.modals = new Map();
        this.loadingElements = new Set();
        this.initialized = false;
        this.dom = {};
    }
    
    /**
     * 初始化DOM元素
     * @param {Object} domElements - DOM元素映射
     */
    initDOM(domElements) {
        Object.assign(this.dom, domElements);
        this.initialized = true;
        logger.info('[UIController] DOM初始化完成');
        
        // 自动注册所有找到的模态框
        const modals = document.querySelectorAll('[id*="modal"]');
        modals.forEach(modal => {
            this.registerModal(modal.id, modal);
        });
    }
    
    /**
     * 注册模态框
     * @param {string} modalId - 模态框ID
     * @param {HTMLElement} modalElement - 模态框元素
     */
    registerModal(modalId, modalElement) {
        if (!modalElement) {
            logger.warn(`[UIController] 模态框元素未找到: ${modalId}`);
            return;
        }
        
        this.modals.set(modalId, {
            element: modalElement,
            isOpen: false
        });
        
        // 添加点击背景关闭功能
        modalElement.addEventListener('click', (e) => {
            if (e.target === modalElement) {
                this.closeModal(modalId);
            }
        });
        
        logger.debug(`[UIController] 模态框已注册: ${modalId}`);
    }
    
    /**
     * 打开模态框
     * @param {string} modalId - 模态框ID
     */
    openModal(modalId) {
        const modal = this.modals.get(modalId);
        
        if (!modal) {
            logger.error(`[UIController] 模态框不存在: ${modalId}`);
            return;
        }
        
        modal.element.style.display = 'flex';
        modal.isOpen = true;
        
        // 添加淡入动画
        setTimeout(() => {
            modal.element.classList.add('modal-open');
        }, 10);
        
        eventBus.emit(GameEvents.MODAL_OPEN, { modalId });
        
        logger.debug(`[UIController] 模态框已打开: ${modalId}`);
    }
    
    /**
     * 关闭模态框
     * @param {string} modalId - 模态框ID
     */
    closeModal(modalId) {
        const modal = this.modals.get(modalId);
        
        if (!modal) {
            logger.error(`[UIController] 模态框不存在: ${modalId}`);
            return;
        }
        
        modal.element.classList.remove('modal-open');
        modal.isOpen = false;
        
        // 等待动画完成后隐藏
        setTimeout(() => {
            modal.element.style.display = 'none';
        }, 300);
        
        eventBus.emit(GameEvents.MODAL_CLOSE, { modalId });
        
        logger.debug(`[UIController] 模态框已关闭: ${modalId}`);
    }
    
    /**
     * 切换模态框状态
     * @param {string} modalId - 模态框ID
     */
    toggleModal(modalId) {
        const modal = this.modals.get(modalId);
        
        if (!modal) {
            logger.error(`[UIController] 模态框不存在: ${modalId}`);
            return;
        }
        
        if (modal.isOpen) {
            this.closeModal(modalId);
        } else {
            this.openModal(modalId);
        }
    }
    
    /**
     * 显示加载状态
     * @param {HTMLElement} element - 目标元素
     * @param {string} message - 加载消息
     */
    showLoading(element, message = '加载中...') {
        if (!element) return;
        
        element.classList.add('loading');
        element.dataset.loadingMessage = message;
        
        this.loadingElements.add(element);
        
        logger.debug('[UIController] 显示加载状态');
    }
    
    /**
     * 隐藏加载状态
     * @param {HTMLElement} element - 目标元素
     */
    hideLoading(element) {
        if (!element) return;
        
        element.classList.remove('loading');
        delete element.dataset.loadingMessage;
        
        this.loadingElements.delete(element);
        
        logger.debug('[UIController] 隐藏加载状态');
    }
    
    /**
     * 显示通知消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 'success' | 'error' | 'warning' | 'info'
     * @param {number} duration - 显示时长（毫秒）
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 淡入
        setTimeout(() => {
            notification.classList.add('notification-show');
        }, 10);
        
        // 自动关闭
        setTimeout(() => {
            notification.classList.remove('notification-show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, duration);
        
        logger.info(`[UIController] 通知: ${message} (${type})`);
    }
    
    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     */
    showError(message) {
        this.showNotification(message, 'error', 5000);
        eventBus.emit(GameEvents.ERROR, { message });
    }
    
    /**
     * 显示成功消息
     * @param {string} message - 成功消息
     */
    showSuccess(message) {
        this.showNotification(message, 'success', 3000);
    }
    
    /**
     * 显示警告消息
     * @param {string} message - 警告消息
     */
    showWarning(message) {
        this.showNotification(message, 'warning', 4000);
    }
    
    /**
     * 禁用按钮
     * @param {HTMLElement} button - 按钮元素
     * @param {string} message - 禁用原因
     */
    disableButton(button, message = '') {
        if (!button) return;
        
        button.disabled = true;
        button.classList.add('btn-disabled');
        
        if (message) {
            button.title = message;
        }
    }
    
    /**
     * 启用按钮
     * @param {HTMLElement} button - 按钮元素
     */
    enableButton(button) {
        if (!button) return;
        
        button.disabled = false;
        button.classList.remove('btn-disabled');
        button.removeAttribute('title');
    }
    
    /**
     * 显示确认对话框
     * @param {string} message - 确认消息
     * @param {Function} onConfirm - 确认回调
     * @param {Function} onCancel - 取消回调
     */
    showConfirm(message, onConfirm, onCancel) {
        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        
        modal.innerHTML = `
            <div class="confirm-content">
                <p class="confirm-message">${message}</p>
                <div class="confirm-buttons">
                    <button class="btn btn-confirm">确认</button>
                    <button class="btn btn-cancel">取消</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const confirmBtn = modal.querySelector('.btn-confirm');
        const cancelBtn = modal.querySelector('.btn-cancel');
        
        const cleanup = () => {
            modal.classList.remove('modal-open');
            setTimeout(() => modal.remove(), 300);
        };
        
        confirmBtn.addEventListener('click', () => {
            if (onConfirm) onConfirm();
            cleanup();
        });
        
        cancelBtn.addEventListener('click', () => {
            if (onCancel) onCancel();
            cleanup();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (onCancel) onCancel();
                cleanup();
            }
        });
        
        // 显示模态框
        setTimeout(() => {
            modal.classList.add('modal-open');
        }, 10);
    }
    
    /**
     * 清理所有打开的模态框
     */
    closeAllModals() {
        this.modals.forEach((modal, modalId) => {
            if (modal.isOpen) {
                this.closeModal(modalId);
            }
        });
    }
    
    /**
     * 清理资源
     */
    destroy() {
        this.closeAllModals();
        this.modals.clear();
        this.loadingElements.clear();
        logger.info('[UIController] 已清理');
    }
}

// 导出单例
export const uiController = new UIController();
