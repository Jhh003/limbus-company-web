/**
 * 动画控制器 - 管理页面动画效果
 * 
 * 职责：
 * - 倒计时动画
 * - 文字动画效果
 * - 过渡动画管理
 * 
 * @module AnimationController
 */

import { logger } from '../core/logger.js';

export class AnimationController {
    constructor() {
        this.dom = {
            countdownElement: null
        };
        
        this.countdownInterval = null;
        this.targetDate = null;
        this.initialized = false;
    }
    
    /**
     * 初始化DOM元素
     * @param {Object} domElements - DOM元素映射
     */
    initDOM(domElements) {
        Object.assign(this.dom, domElements);
        this.initialized = true;
        logger.info('[AnimationController] DOM初始化完成');
    }
    
    /**
     * 初始化倒计时
     * @param {Date|string} targetDate - 目标日期
     */
    initCountdown(targetDate) {
        this.targetDate = new Date(targetDate);
        
        if (isNaN(this.targetDate.getTime())) {
            logger.error('[AnimationController] 无效的目标日期');
            return;
        }
        
        // 立即更新一次
        this.updateCountdown();
        
        // 每秒更新
        this.countdownInterval = setInterval(() => {
            this.updateCountdown();
        }, 1000);
        
        logger.info('[AnimationController] 倒计时已启动');
    }
    
    /**
     * 更新倒计时显示
     */
    updateCountdown() {
        if (!this.dom.countdownElement || !this.targetDate) return;
        
        const now = new Date();
        const diff = this.targetDate - now;
        
        if (diff <= 0) {
            this.dom.countdownElement.textContent = '已到达目标时间';
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
            return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const parts = [];
        if (days > 0) parts.push(`${days}天`);
        if (hours > 0) parts.push(`${hours}小时`);
        if (minutes > 0) parts.push(`${minutes}分钟`);
        parts.push(`${seconds}秒`);
        
        this.dom.countdownElement.textContent = parts.join(' ');
    }
    
    /**
     * 创建动画文字效果
     * @param {string} text - 文字内容
     * @param {HTMLElement} container - 容器元素
     */
    createAnimatedText(text, container) {
        if (!container) return;
        
        container.innerHTML = '';
        
        const chars = text.split('');
        chars.forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char;
            span.style.animationDelay = `${index * 0.05}s`;
            span.className = 'animated-char';
            container.appendChild(span);
        });
    }
    
    /**
     * 淡入动画
     * @param {HTMLElement} element - 目标元素
     * @param {number} duration - 持续时间（毫秒）
     */
    fadeIn(element, duration = 300) {
        if (!element) return Promise.resolve();
        
        return new Promise(resolve => {
            element.style.opacity = '0';
            element.style.transition = `opacity ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                element.style.opacity = '1';
            }, 10);
            
            setTimeout(() => {
                element.style.transition = '';
                resolve();
            }, duration);
        });
    }
    
    /**
     * 淡出动画
     * @param {HTMLElement} element - 目标元素
     * @param {number} duration - 持续时间（毫秒）
     */
    fadeOut(element, duration = 300) {
        if (!element) return Promise.resolve();
        
        return new Promise(resolve => {
            element.style.transition = `opacity ${duration}ms ease-in-out`;
            element.style.opacity = '0';
            
            setTimeout(() => {
                element.style.transition = '';
                resolve();
            }, duration);
        });
    }
    
    /**
     * 清理资源
     */
    destroy() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        logger.info('[AnimationController] 已清理');
    }
}

// 导出单例
export const animationController = new AnimationController();
