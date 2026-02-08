/**
 * 筛选控制器 - 管理罪人和人格的筛选逻辑
 * 
 * 职责：
 * - 创建和管理筛选UI
 * - 处理罪人和人格的启用/禁用
 * - 应用筛选规则到数据
 * - 与AppState同步筛选状态
 * 
 * @module FilterController
 */

import { appState } from '../core/appState.js';
import { eventBus, GameEvents } from '../core/eventBus.js';
import { logger } from '../core/logger.js';
import { sinnerData } from '../../data/characters.js';

export class FilterController {
    constructor() {
        this.dom = {
            sinnerFilterContainer: null,
            toggleAllButton: null,
            invertButton: null,
            sinnerStartButton: null,
            availableSinnersEl: null
        };
        
        this.initialized = false;
    }

    /**
     * 创建头像占位符
     * @param {Object} sinner - 罪人数据
     * @returns {HTMLElement}
     */
    createAvatarPlaceholder(sinner) {
        const placeholder = document.createElement('span');
        placeholder.className = 'filter-avatar-placeholder avatar-placeholder';
        placeholder.style.backgroundColor = sinner.color || '#666';
        placeholder.textContent = '?';
        return placeholder;
    }
    
    /**
     * 初始化DOM元素
     * @param {Object} domElements - DOM元素映射
     */
    initDOM(domElements) {
        Object.assign(this.dom, domElements);
        this.initialized = true;
        logger.info('[FilterController] DOM初始化完成');
    }
    
    /**
     * 创建罪人筛选UI
     */
    createSinnerFilter() {
        if (!this.dom.sinnerFilterContainer) {
            logger.warn('[FilterController] 罪人筛选容器未找到');
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        sinnerData.forEach(sinner => {
            // ✓ 确保每个罪人都有明确的状态（不依赖undefined默认值）
            const currentState = appState.get(`filters.sinners.${sinner.id}`);
            const isEnabled = currentState !== undefined ? currentState : true;
            
            // ✓ 如果是第一次创建，明确设置状态
            if (currentState === undefined) {
                appState.toggleSinnerFilter(sinner.id, true);
            }
            
            const label = document.createElement('label');
            label.className = 'sinner-checkbox-label';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `filter-${sinner.id}`;
            checkbox.value = sinner.id;
            checkbox.checked = isEnabled;
            checkbox.dataset.sinnerId = sinner.id;
            
            checkbox.addEventListener('change', (e) => {
                this.toggleSinner(sinner.id, e.target.checked);
            });
            
            if (sinner.avatar) {
                const avatarImg = document.createElement('img');
                avatarImg.className = 'filter-avatar';
                avatarImg.src = sinner.avatar;
                avatarImg.alt = sinner.name;
                avatarImg.onerror = () => {
                    const placeholder = this.createAvatarPlaceholder(sinner);
                    if (avatarImg.parentNode) {
                        avatarImg.parentNode.replaceChild(placeholder, avatarImg);
                    }
                };
                label.appendChild(checkbox);
                label.appendChild(avatarImg);
            } else {
                const placeholder = this.createAvatarPlaceholder(sinner);
                label.appendChild(checkbox);
                label.appendChild(placeholder);
            }
            
            label.appendChild(document.createTextNode(sinner.name));
            fragment.appendChild(label);
        });
        
        this.dom.sinnerFilterContainer.innerHTML = '';
        this.dom.sinnerFilterContainer.appendChild(fragment);
        
        this.updateAvailableSinnersDisplay();
        logger.info('[FilterController] 罪人筛选UI创建完成');
    }
    
    /**
     * 切换罪人启用状态
     * @param {string} sinnerId - 罪人ID
     * @param {boolean} enabled - 是否启用
     */
    toggleSinner(sinnerId, enabled) {
        appState.toggleSinnerFilter(sinnerId, enabled);
        appState.set('app.hasUnsavedChanges', true, { markUnsaved: false });
        this.updateAvailableSinnersDisplay();
        
        eventBus.emit(GameEvents.SINNER_FILTER_CHANGED, {
            sinnerId,
            enabled
        });
        
        // 触发人格设置UI重建
        eventBus.emit('SINNER_SELECTION_CHANGED');
        
        logger.debug(`[FilterController] 罪人 ${sinnerId} ${enabled ? '启用' : '禁用'}`);
    }
    
    /**
     * 切换人格启用状态
     * @param {string} sinnerId - 罪人ID
     * @param {number} personaIndex - 人格索引
     * @param {boolean} enabled - 是否启用
     */
    togglePersonality(sinnerId, personaIndex, enabled) {
        appState.togglePersonalityFilter(sinnerId, personaIndex, enabled);
        appState.set('app.hasUnsavedChanges', true, { markUnsaved: false });
        
        eventBus.emit(GameEvents.PERSONA_FILTER_CHANGED, {
            sinnerId,
            personaIndex,
            enabled
        });
        
        logger.debug(`[FilterController] 人格 ${sinnerId}[${personaIndex}] ${enabled ? '启用' : '禁用'}`);
    }
    
    /**
     * 切换所有罪人启用状态
     * @param {boolean} enabled - 是否启用
     */
    toggleAllSinners(enabled) {
        sinnerData.forEach(sinner => {
            appState.toggleSinnerFilter(sinner.id, enabled);
            
            // 同步UI复选框
            const checkbox = document.getElementById(`filter-${sinner.id}`);
            if (checkbox) {
                checkbox.checked = enabled;
            }
        });
        
        appState.set('app.hasUnsavedChanges', true, { markUnsaved: false });
        this.updateAvailableSinnersDisplay();
        
        // 发送罪人选择变化事件，用于更新人格标签页
        eventBus.emit('SINNER_SELECTION_CHANGED');
        
        logger.info(`[FilterController] 所有罪人 ${enabled ? '启用' : '禁用'}`);
    }
    
    /**
     * 切换所有人格启用状态
     * @param {string} sinnerId - 罪人ID
     * @param {boolean} enabled - 是否启用
     */
    toggleAllPersonalities(sinnerId, enabled) {
        const sinner = sinnerData.find(s => s.id === sinnerId);
        if (!sinner) return;
        
        sinner.personalities.forEach((persona, index) => {
            appState.togglePersonalityFilter(sinnerId, index, enabled);
        });
        
        appState.set('app.hasUnsavedChanges', true, { markUnsaved: false });
        
        logger.info(`[FilterController] 罪人 ${sinnerId} 的所有人格 ${enabled ? '启用' : '禁用'}`);
    }
    
    /**
     * 反选罪人或人格
     * @param {string} type - 'sinner' 或 'personality'
     * @param {string} sinnerId - 罪人ID（仅用于人格反选）
     */
    invertSelection(type, sinnerId = null) {
        if (type === 'sinner') {
            sinnerData.forEach(sinner => {
                const currentState = appState.isSinnerEnabled(sinner.id);
                appState.toggleSinnerFilter(sinner.id, !currentState);
                
                // 同步UI
                const checkbox = document.getElementById(`filter-${sinner.id}`);
                if (checkbox) {
                    checkbox.checked = !currentState;
                }
            });
        } else if (type === 'personality' && sinnerId) {
            const sinner = sinnerData.find(s => s.id === sinnerId);
            if (!sinner) return;
            
            sinner.personalities.forEach((persona, index) => {
                const currentState = appState.isPersonalityEnabled(sinnerId, index);
                appState.togglePersonalityFilter(sinnerId, index, !currentState);
            });
        }
        
        appState.set('app.hasUnsavedChanges', true, { markUnsaved: false });
        this.updateAvailableSinnersDisplay();
        
        // 如果是罪人反选，发送罪人选择变化事件
        if (type === 'sinner') {
            eventBus.emit('SINNER_SELECTION_CHANGED');
        }
        
        logger.info(`[FilterController] 反选 ${type}${sinnerId ? ` (${sinnerId})` : ''}`);
    }
    
    /**
     * 应用筛选规则
     * 根据当前筛选状态过滤罪人数据
     */
    applyFilters(options = {}) {
        const { commit = true } = options;
        if (!this.validateFilterSettings()) {
            return false;
        }
        
        // ✓ 立即停止任何正在进行的滚动，避免竞态条件
        eventBus.emit('SCROLL_STOP_REQUEST', { type: 'both' });
        
        // ✓ 清空已选择的罪人和人格（防止选择被禁用的项）
        appState.setSinner(null);
        appState.setPersona(null);
        
        const filteredData = sinnerData.filter(sinner => {
            return appState.isSinnerEnabled(sinner.id);
        }).map(sinner => {
            // 过滤人格
            const filteredPersonalities = sinner.personalities.filter((persona, index) => {
                return appState.isPersonalityEnabled(sinner.id, index);
            });
            
            return {
                ...sinner,
                personalities: filteredPersonalities
            };
        });
        
        // 保存到AppState
        appState.set('app.filteredSinnerData', filteredData, { markUnsaved: false });
        if (commit) {
            appState.set('app.hasUnsavedChanges', false, { markUnsaved: false });
        }
        
        // ✓ 发送筛选应用事件（确保包含完整的filteredData）
        eventBus.emit(GameEvents.FILTER_CHANGED, {
            filteredData,
            enabledSinnerCount: filteredData.length
        });
        
        this.updateAvailableSinnersDisplay(filteredData.length);
        logger.debug(`[FilterController] 筛选应用完成，可用罪人: ${filteredData.length}`);
        return true;
    }
    
    /**
     * 获取当前筛选的罪人数据
     * @returns {Array} 筛选后的罪人数据
     */
    getFilteredData() {
        return appState.get('app.filteredSinnerData') || [];
    }
    
    /**
     * 重置所有筛选
     */
    resetFilters() {
        sinnerData.forEach(sinner => {
            appState.toggleSinnerFilter(sinner.id, true);
            sinner.personalities.forEach((persona, index) => {
                appState.togglePersonalityFilter(sinner.id, index, true);
            });
        });

        // 同步UI
        const checkboxes = document.querySelectorAll('#sinner-filter input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = true;
        });

        appState.set('app.hasUnsavedChanges', true, { markUnsaved: false });
        this.updateAvailableSinnersDisplay();
        logger.info('[FilterController] 筛选已重置');
    }

    /**
     * 验证筛选设置是否满足保底条件
     * @returns {boolean}
     */
    validateFilterSettings() {
        const filteredSinners = sinnerData.filter(sinner => appState.isSinnerEnabled(sinner.id));
        if (!filteredSinners.length) {
            window.Modal?.alert('请至少选择一个罪人！', '提示');
            return false;
        }

        const sinnersWithoutPersonalities = [];
        filteredSinners.forEach(sinner => {
            let hasPersonality = false;
            for (let i = 0; i < sinner.personalities.length; i++) {
                if (appState.isPersonalityEnabled(sinner.id, i)) {
                    hasPersonality = true;
                    break;
                }
            }
            if (!hasPersonality) {
                sinnersWithoutPersonalities.push(sinner.name);
            }
        });

        if (sinnersWithoutPersonalities.length > 0) {
            window.Modal?.alert(
                `请为以下罪人至少选择一个人格：\n${sinnersWithoutPersonalities.join('\n')}`,
                '提示'
            );
            return false;
        }

        return true;
    }

    /**
     * 更新可用罪人数量显示
     * @param {number} countOverride - 可选的数量覆盖
     */
    updateAvailableSinnersDisplay(countOverride = null) {
        if (!this.dom.availableSinnersEl) return;
        const enabledCount = countOverride ?? sinnerData.filter(s => appState.isSinnerEnabled(s.id)).length;
        this.dom.availableSinnersEl.textContent = `${enabledCount}/${sinnerData.length}`;

        if (this.dom.sinnerStartButton) {
            this.dom.sinnerStartButton.disabled = enabledCount === 0;
        }
    }
}

// 导出单例
export const filterController = new FilterController();
