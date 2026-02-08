/**
 * 计时器控制器 - 管理计时器逻辑和显示
 * 
 * 职责：
 * - 计时器启动、暂停、重置
 * - 时间格式化
 * - 计时器状态管理
 * - 定时更新UI
 * 
 * @module TimerController
 */

import { appState } from '../core/appState.js';
import { eventBus, GameEvents } from '../core/eventBus.js';
import { logger } from '../core/logger.js';

export class TimerController {
    constructor() {
        this.dom = {
            timerModal: null,
            timerToggleBtn: null,
            timerCloseBtn: null,
            timerDisplay: null,
            startButton: null,
            pauseButton: null,
            resetButton: null,
            submitToLocalBtn: null,
            submitToGlobalBtn: null,
            sinnerNameEl: null,
            personaNameEl: null
        };
        
        this.updateInterval = null;
        this.baseSeconds = 0; // 基础累积秒数（暂停前的总时长）
        this.sessionStartTime = null; // 本次运行开始的时间戳
        this.initialized = false;
    }
    
    /**
     * 初始化DOM元素
     * @param {Object} domElements - DOM元素映射
     */
    initDOM(domElements) {
        Object.assign(this.dom, domElements);
        this.initialized = true;
        logger.info('[TimerController] DOM初始化完成');
        
        // 绑定按钮事件
        this._bindEvents();

        // 初始化显示与按钮状态
        this.updateDisplay(appState.get('timer.elapsedSeconds') || 0);
        this._updateButtonStates();
    }
    
    /**
     * 绑定按钮事件
     * @private
     */
    _bindEvents() {
        if (this.dom.timerToggleBtn && this.dom.timerModal) {
            this.dom.timerToggleBtn.addEventListener('click', () => this.openTimerModal());
        }
        if (this.dom.timerCloseBtn && this.dom.timerModal) {
            this.dom.timerCloseBtn.addEventListener('click', () => this.closeTimerModal());
        }
        if (this.dom.timerModal) {
            this.dom.timerModal.addEventListener('click', (e) => {
                if (e.target === this.dom.timerModal) {
                    this.closeTimerModal();
                }
            });
        }
        if (this.dom.startButton) {
            this.dom.startButton.addEventListener('click', () => this.start());
        }
        if (this.dom.pauseButton) {
            this.dom.pauseButton.addEventListener('click', () => this.pause());
        }
        if (this.dom.resetButton) {
            this.dom.resetButton.addEventListener('click', () => this.reset());
        }

        // 保存到本地按钮
        if (this.dom.submitToLocalBtn) {
            this.dom.submitToLocalBtn.addEventListener('click', () => {
                this.saveToLocalRanking();
            });
        }

        // 提交到全球排行榜按钮
        if (this.dom.submitToGlobalBtn) {
            this.dom.submitToGlobalBtn.addEventListener('click', () => {
                this.submitToGlobalRanking();
            });
        }

        // 订阅选择器事件，实时更新罪人和人格显示
        eventBus.subscribe(GameEvents.SINNER_SELECTED, () => {
            this.updateSelectionInfo();
        });
        
        eventBus.subscribe(GameEvents.PERSONA_SELECTED, () => {
            this.updateSelectionInfo();
        });
        
        // 弹窗打开时更新一次选择信息
        if (this.dom.timerToggleBtn) {
            this.dom.timerToggleBtn.addEventListener('click', () => {
                this.updateSelectionInfo();
            });
        }
    }
    
    /**
     * 启动计时器
     */
    start() {
        if (appState.get('timer.isRunning')) {
            logger.warn('[TimerController] 计时器已在运行');
            return;
        }
        
        // 记录本次运行开始时间
        this.sessionStartTime = Date.now();
        appState.set('timer.isRunning', true);
        appState.set('timer.startTime', this.sessionStartTime);
        
        // 开始更新循环
        this.updateInterval = setInterval(() => {
            this._tick();
        }, 1000);
        
        // 立即更新一次显示
        this._tick();
        
        // 更新按钮状态
        this._updateButtonStates();
        
        eventBus.emit(GameEvents.TIMER_START);
        logger.info('[TimerController] 计时器启动');
    }
    
    /**
     * 暂停计时器
     */
    pause() {
        if (!appState.get('timer.isRunning')) {
            logger.warn('[TimerController] 计时器未运行');
            return;
        }
        
        // 计算本次运行的时长并累加到基础时长
        if (this.sessionStartTime) {
            const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            this.baseSeconds += sessionDuration;
        }
        
        // 停止计时器
        appState.set('timer.isRunning', false);
        appState.set('timer.pausedTime', Date.now());
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.sessionStartTime = null;
        
        // 更新按钮状态
        this._updateButtonStates();
        
        eventBus.emit(GameEvents.TIMER_PAUSED);
        logger.info('[TimerController] 计时器暂停');
    }
    
    /**
     * 恢复计时器（暂停后继续）
     */
    resume() {
        if (appState.get('timer.isRunning')) {
            logger.warn('[TimerController] 计时器已在运行');
            return;
        }
        
        // 检查是否曾经暂停过
        if (this.baseSeconds === 0 && !appState.get('timer.pausedTime')) {
            // 从未启动过，直接调用 start
            this.start();
            return;
        }
        
        // 记录恢复时的开始时间
        this.sessionStartTime = Date.now();
        appState.set('timer.isRunning', true);
        appState.set('timer.pausedTime', null);
        
        // 重新开始更新循环
        this.updateInterval = setInterval(() => {
            this._tick();
        }, 1000);
        
        // 立即更新一次显示
        this._tick();
        
        // 更新按钮状态
        this._updateButtonStates();
        
        eventBus.emit(GameEvents.TIMER_RESUMED);
        logger.info('[TimerController] 计时器恢复');
    }
    
    /**
     * 重置计时器
     */
    reset() {
        // 停止更新循环
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // 重置所有状态
        this.baseSeconds = 0;
        this.sessionStartTime = null;
        
        appState.set('timer.isRunning', false);
        appState.set('timer.elapsedSeconds', 0);
        appState.set('timer.totalSeconds', 0);
        appState.set('timer.startTime', null);
        appState.set('timer.pausedTime', null);
        
        // 更新显示
        this.updateDisplay(0);
        
        // 更新按钮状态
        this._updateButtonStates();
        
        eventBus.emit(GameEvents.TIMER_RESET);
        logger.info('[TimerController] 计时器重置');
    }
    
    /**
     * 计时器滴答（内部方法）
     * @private
     */
    _tick() {
        if (!this.sessionStartTime) return;
        
        // 计算当前总时长 = 基础时长 + 本次运行时长
        const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        const totalSeconds = this.baseSeconds + sessionDuration;
        
        // 更新状态
        appState.set('timer.elapsedSeconds', totalSeconds);
        appState.set('timer.totalSeconds', totalSeconds);
        
        // 更新显示
        this.updateDisplay(totalSeconds);
        
        // 更新选择信息（启用提交按钮）
        this.updateSelectionInfo();
        
        // 发送事件
        eventBus.emit(GameEvents.TIMER_TICK, { elapsedSeconds: totalSeconds });
    }
    
    /**
     * 更新按钮状态
     * @private
     */
    _updateButtonStates() {
        const isRunning = appState.get('timer.isRunning');
        
        if (this.dom.startButton) {
            this.dom.startButton.disabled = isRunning;
        }
        if (this.dom.pauseButton) {
            this.dom.pauseButton.disabled = !isRunning;
        }
    }

    /**
     * 打开计时器弹窗
     */
    openTimerModal() {
        if (!this.dom.timerModal) return;
        this.dom.timerModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * 关闭计时器弹窗
     */
    closeTimerModal() {
        if (!this.dom.timerModal) return;
        this.dom.timerModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    /**
     * 保存到本地排行榜
     */
    saveToLocalRanking() {
        const seconds = this.getElapsedSeconds();
        if (seconds === 0) {
            window.Modal?.alert('请先完成一次计时再保存！', '提示');
            return;
        }

        const playerNote = this.dom.playerNoteInput ? this.dom.playerNoteInput.value.trim() : '';
        const selectedSinner = appState.getSinner();
        const selectedPersona = appState.getPersona();

        try {
            if (this.dom.uploadRankingBtn) {
                this.dom.uploadRankingBtn.disabled = true;
                this.dom.uploadRankingBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
            }

            const records = JSON.parse(localStorage.getItem('personalRanking') || '[]');
            const newRecord = {
                time: seconds,
                comment: playerNote,
                timestamp: new Date().toISOString(),
                sinner: selectedSinner ? {
                    name: selectedSinner.name,
                    avatar: selectedPersona?.avatar || selectedSinner.avatar
                } : null,
                persona: selectedPersona ? {
                    name: selectedPersona.name,
                    avatar: selectedPersona.avatar
                } : null
            };

            records.push(newRecord);
            localStorage.setItem('personalRanking', JSON.stringify(records));

            window.Modal?.alert('保存成功！记录已添加到本地', '成功');
        } catch (error) {
            window.Modal?.alert(`保存失败: ${error.message}`, '错误');
        } finally {
            if (this.dom.submitToLocalBtn) {
                this.dom.submitToLocalBtn.disabled = false;
                this.dom.submitToLocalBtn.innerHTML = '<i class="fas fa-save"></i> 保存到本地';
            }
        }
    }

    /**
     * 提交到全球排行榜
     */
    submitToGlobalRanking() {
        const seconds = this.getElapsedSeconds();
        if (seconds === 0) {
            window.Modal?.alert('请先完成一次计时再提交！', '提示');
            return;
        }

        const selectedSinner = appState.getSinner();
        const selectedPersona = appState.getPersona();

        // 构建URL参数
        const params = new URLSearchParams();
        params.append('time', seconds);
        if (selectedSinner) {
            params.append('sinner', selectedSinner.name);
        }
        if (selectedPersona) {
            params.append('persona', selectedPersona.name);
        }

        // 跳转到排行榜页面
        window.location.href = `global-ranking?${params.toString()}`;
    }

    /**
     * 更新选择信息显示
     */
    updateSelectionInfo() {
        if (!this.dom.sinnerNameEl || !this.dom.personaNameEl) return;

        const selectedSinner = appState.getSinner();
        const selectedPersona = appState.getPersona();

        if (selectedSinner) {
            this.dom.sinnerNameEl.textContent = selectedSinner.name.split(' ')[0];
            this.dom.sinnerNameEl.style.color = 'var(--lc-gold)';
        } else {
            this.dom.sinnerNameEl.textContent = '未选择';
            this.dom.sinnerNameEl.style.color = 'var(--lc-text-muted)';
        }

        if (selectedPersona) {
            this.dom.personaNameEl.textContent = selectedPersona.name;
            this.dom.personaNameEl.style.color = 'var(--lc-text)';
        } else {
            this.dom.personaNameEl.textContent = '未选择';
            this.dom.personaNameEl.style.color = 'var(--lc-text-muted)';
        }

        // 只有当有计时数据时才启用提交按钮
        const hasTime = this.getElapsedSeconds() > 0;
        if (this.dom.submitToGlobalBtn) {
            this.dom.submitToGlobalBtn.disabled = !hasTime;
        }
    }
    
    /**
     * 更新显示
     * @param {number} seconds - 秒数
     */
    updateDisplay(seconds) {
        if (!this.dom.timerDisplay) return;
        
        const formatted = this.formatTime(seconds);
        this.dom.timerDisplay.textContent = formatted;
    }
    
    /**
     * 格式化时间
     * @param {number} totalSeconds - 总秒数
     * @returns {string} 格式化后的时间字符串 "HH:MM:SS"
     */
    formatTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0')
        ].join(':');
    }
    
    /**
     * 获取已用秒数
     * @returns {number} 已用秒数
     */
    getElapsedSeconds() {
        return appState.get('timer.elapsedSeconds') || 0;
    }
    
    /**
     * 获取总毫秒数
     * @returns {number} 总毫秒数
     */
    getTotalMilliseconds() {
        const seconds = this.getElapsedSeconds();
        return seconds * 1000;
    }
    
    /**
     * 检查计时器是否运行
     * @returns {boolean} 是否运行中
     */
    isRunning() {
        return appState.get('timer.isRunning') || false;
    }
    
    /**
     * 从AppState恢复计时器状态（页面刷新后）
     */
    restoreState() {
        const elapsedSeconds = appState.get('timer.elapsedSeconds') || 0;
        const isRunning = appState.get('timer.isRunning') || false;
        
        this.baseSeconds = elapsedSeconds;
        
        if (isRunning) {
            // 如果之前是运行状态，恢复运行
            this.start();
        } else if (elapsedSeconds > 0) {
            // 如果有累积时间但未运行，只更新显示
            this.updateDisplay(elapsedSeconds);
        }
        
        logger.info(`[TimerController] 状态已恢复: ${elapsedSeconds}秒, 运行中: ${isRunning}`);
    }
    
    /**
     * 清理资源
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // 保存当前状态到AppState
        if (this.sessionStartTime) {
            const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            const totalSeconds = this.baseSeconds + sessionDuration;
            appState.set('timer.elapsedSeconds', totalSeconds);
        }
        
        logger.info('[TimerController] 已清理');
    }
}

// 导出单例
export const timerController = new TimerController();
