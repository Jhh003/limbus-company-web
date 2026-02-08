/**
 * 设置控制器 - 管理用户设置和人格偏好
 * 
 * 职责：
 * - 创建设置UI
 * - 管理人格偏好设置
 * - 批量操作（全选、反选）
 * - 设置持久化
 * 
 * @module SettingsController
 */

import { appState } from '../core/appState.js';
import { eventBus, GameEvents } from '../core/eventBus.js';
import { logger } from '../core/logger.js';
import { sinnerData } from '../../data/characters.js';

export class SettingsController {
    constructor() {
        this.dom = {
            personalitySettingsContainer: null,
            saveSettingsButton: null,
            resetSettingsButton: null
        };
        
        this.initialized = false;
    }
    
    /**
     * 初始化DOM元素
     * @param {Object} domElements - DOM元素映射
     */
    initDOM(domElements) {
        Object.assign(this.dom, domElements);
        this.initialized = true;
        logger.info('[SettingsController] DOM初始化完成');
    }
    
    /**
     * 创建人格设置UI
     */
    createPersonalitySettings() {
        if (!this.dom.personalitySettingsContainer) {
            logger.warn('[SettingsController] 人格设置容器未找到');
            return;
        }
        
        // 创建标签页导航和内容容器
        const tabNav = document.createElement('div');
        tabNav.className = 'personality-tab-nav';
        
        const tabContent = document.createElement('div');
        tabContent.className = 'personality-tab-content';
        
        // 获取已启用的罪人列表 - 直接检查state中的值
        const sinnerFilters = appState.get('filters.sinners') || {};
        const enabledSinners = sinnerData.filter(sinner => {
            // 如果在过滤器中明确设置为false，则禁用
            // 否则启用（默认值）
            return sinnerFilters[sinner.id] !== false;
        });
        
        // 如果没有选中的罪人，显示提示
        if (enabledSinners.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'personality-empty-state';
            emptyState.innerHTML = `
                <p>⚠️ 请先在"罪人筛选设置"中选择至少一个罪人</p>
                <p style="font-size: 0.9em; color: #888;">选中罪人后，这里将显示对应的人格设置</p>
            `;
            this.dom.personalitySettingsContainer.innerHTML = '';
            this.dom.personalitySettingsContainer.appendChild(emptyState);
            return;
        }
        
        // 为每个启用的罪人创建标签页
        enabledSinners.forEach((sinner, index) => {
            // 创建标签按钮
            const tabBtn = document.createElement('button');
            tabBtn.className = 'personality-tab-btn';
            if (index === 0) tabBtn.classList.add('active');
            tabBtn.dataset.sinnerId = sinner.id;
            tabBtn.style.borderColor = sinner.color || '#fff';
            tabBtn.innerHTML = `
                <img src="${sinner.avatar}" alt="${sinner.name}" onerror="this.style.display='none'">
                <span>${sinner.name}</span>
            `;
            
            tabBtn.addEventListener('click', () => {
                this.switchTab(sinner.id);
            });
            
            tabNav.appendChild(tabBtn);
            
            // 创建标签页内容
            const tabPane = document.createElement('div');
            tabPane.className = 'personality-tab-pane';
            if (index === 0) tabPane.classList.add('active');
            tabPane.dataset.sinnerId = sinner.id;
            
            const section = this.createSinnerSection(sinner);
            tabPane.appendChild(section);
            
            tabContent.appendChild(tabPane);
        });
        
        this.dom.personalitySettingsContainer.innerHTML = '';
        this.dom.personalitySettingsContainer.appendChild(tabNav);
        this.dom.personalitySettingsContainer.appendChild(tabContent);
        
        // 确保第一个标签页被激活（修复初始显示bug）
        const firstSinner = enabledSinners[0];
        if (firstSinner) {
            this.switchTab(firstSinner.id);
        }
        
        logger.info(`[SettingsController] 人格设置UI创建完成，共 ${enabledSinners.length} 个罪人`);
    }
    
    /**
     * 切换标签页
     * @param {string} sinnerId - 罪人ID
     */
    switchTab(sinnerId) {
        // 确保sinnerId是字符串，用于data-attribute比较
        const targetId = String(sinnerId);
        
        // 更新按钮状态
        const buttons = this.dom.personalitySettingsContainer.querySelectorAll('.personality-tab-btn');
        buttons.forEach(btn => {
            if (btn.dataset.sinnerId === targetId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // 更新内容显示
        const panes = this.dom.personalitySettingsContainer.querySelectorAll('.personality-tab-pane');
        panes.forEach(pane => {
            if (pane.dataset.sinnerId === targetId) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
        
        logger.debug(`[SettingsController] 切换到罪人 ${targetId} 的人格标签页`);
    }
    
    /**
     * 创建单个罪人的设置区块
     * @param {Object} sinner - 罪人数据
     * @returns {HTMLElement} 设置区块元素
     */
    createSinnerSection(sinner) {
        const section = document.createElement('div');
        section.className = 'settings-section';
        section.dataset.sinnerId = sinner.id;
        
        // 标题行
        const header = document.createElement('div');
        header.className = 'settings-header';
        
        const title = document.createElement('h3');
        title.textContent = sinner.name;
        title.style.color = sinner.color || '#fff';
        
        const actions = document.createElement('div');
        actions.className = 'settings-actions';
        
        const selectAllBtn = this.createButton('全选', () => {
            this.selectAllPersonalities(sinner.id);
        });
        
        const deselectAllBtn = this.createButton('取消全选', () => {
            this.deselectAllPersonalities(sinner.id);
        });
        
        const invertBtn = this.createButton('反选', () => {
            this.invertPersonalities(sinner.id);
        });
        
        actions.appendChild(selectAllBtn);
        actions.appendChild(deselectAllBtn);
        actions.appendChild(invertBtn);
        
        header.appendChild(title);
        header.appendChild(actions);
        
        // 人格列表
        const personaList = document.createElement('div');
        personaList.className = 'personality-list';
        
        sinner.personalities.forEach((persona, index) => {
            const item = this.createPersonalityItem(sinner.id, persona, index);
            personaList.appendChild(item);
        });
        
        section.appendChild(header);
        section.appendChild(personaList);
        
        return section;
    }
    
    /**
     * 创建人格设置项
     * @param {string} sinnerId - 罪人ID
     * @param {Object} persona - 人格数据
     * @param {number} index - 人格索引
     * @returns {HTMLElement} 设置项元素
     */
    createPersonalityItem(sinnerId, persona, index) {
        const item = document.createElement('div');
        item.className = 'personality-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `persona-${sinnerId}-${index}`;
        checkbox.checked = appState.isPersonalityEnabled(sinnerId, index);
        checkbox.dataset.sinnerId = sinnerId;
        checkbox.dataset.personaIndex = index;
        
        checkbox.addEventListener('change', (e) => {
            this.togglePersonalityCheckbox(sinnerId, index, e.target.checked);
        });
        
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        
        // 添加头像图片
        const avatar = document.createElement('img');
        avatar.src = persona.avatar;
        avatar.alt = persona.name;
        avatar.className = 'personality-avatar';
        avatar.onerror = () => {
            // 如果图片加载失败，使用占位符
            avatar.style.display = 'none';
            const placeholder = document.createElement('div');
            placeholder.className = 'personality-avatar-placeholder';
            placeholder.textContent = '?';
            label.insertBefore(placeholder, label.firstChild);
        };
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'personality-name';
        nameSpan.textContent = persona.name;
        
        label.appendChild(avatar);
        label.appendChild(nameSpan);
        
        item.appendChild(checkbox);
        item.appendChild(label);
        
        return item;
    }
    
    /**
     * 创建按钮
     * @param {string} text - 按钮文本
     * @param {Function} onClick - 点击回调
     * @returns {HTMLElement} 按钮元素
     */
    createButton(text, onClick) {
        const button = document.createElement('button');
        button.className = 'settings-btn';
        button.textContent = text;
        button.addEventListener('click', onClick);
        return button;
    }
    
    /**
     * 切换人格复选框
     * @param {string} sinnerId - 罪人ID
     * @param {number} personaIndex - 人格索引
     * @param {boolean} checked - 是否选中
     */
    togglePersonalityCheckbox(sinnerId, personaIndex, checked) {
        appState.togglePersonalityFilter(sinnerId, personaIndex, checked);
        
        eventBus.emit(GameEvents.PERSONALITY_TOGGLED, {
            sinnerId,
            personaIndex,
            enabled: checked
        });
        
        logger.debug(`[SettingsController] 人格 ${sinnerId}[${personaIndex}] ${checked ? '启用' : '禁用'}`);
    }
    
    /**
     * 全选某个罪人的所有人格
     * @param {string} sinnerId - 罪人ID
     */
    selectAllPersonalities(sinnerId) {
        const sinner = sinnerData.find(s => s.id === sinnerId);
        if (!sinner) return;
        
        sinner.personalities.forEach((persona, index) => {
            appState.togglePersonalityFilter(sinnerId, index, true);
            
            // 同步UI
            const checkbox = document.getElementById(`persona-${sinnerId}-${index}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
        
        eventBus.emit(GameEvents.SETTINGS_CHANGED, {
            action: 'select_all',
            sinnerId
        });
        
        logger.info(`[SettingsController] 罪人 ${sinnerId} 全选人格`);
    }
    
    /**
     * 取消全选某个罪人的所有人格
     * @param {string} sinnerId - 罪人ID
     */
    deselectAllPersonalities(sinnerId) {
        const sinner = sinnerData.find(s => s.id === sinnerId);
        if (!sinner) return;
        
        sinner.personalities.forEach((persona, index) => {
            appState.togglePersonalityFilter(sinnerId, index, false);
            
            // 同步UI
            const checkbox = document.getElementById(`persona-${sinnerId}-${index}`);
            if (checkbox) {
                checkbox.checked = false;
            }
        });
        
        eventBus.emit(GameEvents.SETTINGS_CHANGED, {
            action: 'deselect_all',
            sinnerId
        });
        
        logger.info(`[SettingsController] 罪人 ${sinnerId} 取消全选人格`);
    }
    
    /**
     * 反选某个罪人的人格
     * @param {string} sinnerId - 罪人ID
     */
    invertPersonalities(sinnerId) {
        const sinner = sinnerData.find(s => s.id === sinnerId);
        if (!sinner) return;
        
        sinner.personalities.forEach((persona, index) => {
            const currentState = appState.isPersonalityEnabled(sinnerId, index);
            appState.togglePersonalityFilter(sinnerId, index, !currentState);
            
            // 同步UI
            const checkbox = document.getElementById(`persona-${sinnerId}-${index}`);
            if (checkbox) {
                checkbox.checked = !currentState;
            }
        });
        
        eventBus.emit(GameEvents.SETTINGS_CHANGED, {
            action: 'invert',
            sinnerId
        });
        
        logger.info(`[SettingsController] 罪人 ${sinnerId} 反选人格`);
    }
    
    /**
     * 保存设置
     */
    saveSettings() {
        // AppState会自动持久化到localStorage
        eventBus.emit(GameEvents.PERSONALITY_SAVED);
        
        logger.info('[SettingsController] 设置已保存');
        
        // 显示成功提示
        this.showSaveSuccess();
    }
    
    /**
     * 重置设置
     */
    resetSettings() {
        sinnerData.forEach(sinner => {
            this.selectAllPersonalities(sinner.id);
        });
        
        logger.info('[SettingsController] 设置已重置');
    }

    /**
     * 全选/取消所有人格（跨所有罪人）
     * @param {boolean} enabled - 是否启用
     */
    toggleAllPersonalities(enabled) {
        sinnerData.forEach(sinner => {
            sinner.personalities.forEach((persona, index) => {
                appState.togglePersonalityFilter(sinner.id, index, enabled);
                const checkbox = document.getElementById(`persona-${sinner.id}-${index}`);
                if (checkbox) {
                    checkbox.checked = enabled;
                }
            });
        });

        eventBus.emit(GameEvents.SETTINGS_CHANGED, {
            action: enabled ? 'select_all_global' : 'deselect_all_global'
        });

        logger.info(`[SettingsController] 所有人格${enabled ? '全选' : '取消全选'}`);
    }

    /**
     * 反选所有人格（跨所有罪人）
     */
    invertAllPersonalities() {
        sinnerData.forEach(sinner => {
            sinner.personalities.forEach((persona, index) => {
                const currentState = appState.isPersonalityEnabled(sinner.id, index);
                appState.togglePersonalityFilter(sinner.id, index, !currentState);
                const checkbox = document.getElementById(`persona-${sinner.id}-${index}`);
                if (checkbox) {
                    checkbox.checked = !currentState;
                }
            });
        });

        eventBus.emit(GameEvents.SETTINGS_CHANGED, {
            action: 'invert_global'
        });

        logger.info('[SettingsController] 所有人格反选');
    }
    
    /**
     * 显示保存成功提示
     */
    showSaveSuccess() {
        // 简单的提示实现
        const message = document.createElement('div');
        message.className = 'save-success-message';
        message.textContent = '设置已保存';
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.classList.add('fade-out');
            setTimeout(() => message.remove(), 300);
        }, 2000);
    }
    
    /**
     * 获取当前设置
     * @returns {Object} 设置对象
     */
    getSettings() {
        return {
            personality: appState.get('settings.personality'),
            theme: appState.get('settings.theme'),
            language: appState.get('settings.language')
        };
    }
}

// 导出单例
export const settingsController = new SettingsController();
