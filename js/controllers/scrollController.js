/**
 * 滚动控制器 - 管理罪人和人格的滚动动画和选择
 * 
 * 职责：
 * - 创建滚动列表UI
 * - 管理滚动动画
 * - 处理滚动开始/停止
 * - 更新选中项高亮显示
 * 
 * @module ScrollController
 */

import { appState } from '../core/appState.js';
import { eventBus, GameEvents } from '../core/eventBus.js';
import { logger } from '../core/logger.js';
import { Config } from '../../data/config.js';
import { secureRandInt } from '../../data/utils/helpers.js';

const easterEggConfig = {
    2: { // 浮士德 (Faust)
        '黑兽-卯魁首': 'assets/videos/faust_mao_kui_shou.mp4'
    },
    5: { // 默尔索 (Meursault)
        '拇指东部指挥官IIII': 'assets/videos/meursault_thumbs.mp4'
    },
    6: { // 鸿璐 (Hong Lu)
        '鸿园的君主': 'assets/videos/Hong_Lu_Hong_Yuan_The_King.mp4'
    },
    9: { // 罗佳 (Rodion)
        '脑叶公司E.G.O:泪锋之剑': 'assets/videos/rodion_tear_sword.mp4'
    }
};

export class ScrollController {
    constructor() {
        this.dom = {
            sinnerScrollContainer: null,
            personaScrollContainer: null,
            sinnerScrollList: null,
            personaScrollList: null,
            startSinnerButton: null,
            stopSinnerButton: null,
            startPersonaButton: null,
            stopPersonaButton: null,
            sinnerEmptyEl: null,
            personaEmptyEl: null,
            selectedSinnerEl: null,
            selectedPersonaEl: null,
            resultDisplayEl: null,
            resultFinalEl: null,
            resultSinnerImg: null,
            resultSinnerFallback: null,
            resultPersonaImg: null,
            resultPersonaFallback: null,
            resultGuidesSection: null,
            guidesBtn: null,
            guidesCount: null
        };
        
        this.scrollIntervals = {
            sinner: null,
            persona: null
        };
        
        this.currentSinnerList = [];
        this.currentPersonaList = [];

        this.sinnerOffset = 0;
        this.personaOffset = 0;
        this.itemHeight = Config.itemHeight || 50;
        
        this.initialized = false;
        
        // 监听筛选变化事件
        this._setupEventListeners();
    }
    
    /**
     * 设置事件监听
     * @private
     */
    _setupEventListeners() {
        // ✓ 监听滚动停止请求（用于防止竞态条件）
        eventBus.subscribe('SCROLL_STOP_REQUEST', (data) => {
            if (data.type === 'both' || data.type === 'sinner') {
                this.stopSinnerScroll(true);
                logger.debug('[ScrollController] 收到滚动停止请求（罪人）');
            }
            if (data.type === 'both' || data.type === 'persona') {
                this.stopPersonaScroll(true);
                logger.debug('[ScrollController] 收到滚动停止请求（人格）');
            }
        });
        
        // 监听筛选变化
        eventBus.subscribe(GameEvents.FILTER_CHANGED, (data) => {
            if (data.filteredData) {
                logger.debug('[ScrollController] 筛选已变化，更新罪人列表');
                // ✓ 应用筛选后，如果只有1个罪人自动选择（用户没有其他选择）
                // 但人格列表会设置为不自动选择，让用户手动滚动
                this.createSinnerScrollList(data.filteredData, { 
                    autoSelect: true,
                    personaAutoSelect: false  // 传递给人格列表
                });
                
                // ✓ 清空人格列表（因为筛选变化后需要重新选择罪人）
                this.clearPersonaList();
            }
        });
        
        // 监听罪人选择事件
        eventBus.subscribe(GameEvents.SINNER_SELECTED, (data) => {
            if (data.sinner && data.sinner.personalities) {
                logger.debug('[ScrollController] 罪人已选择，更新人格列表');
                // 用户主动选择罪人后，允许自动选择人格
                this.createPersonaScrollList(data.sinner.personalities, { autoSelect: true });
            }
        });
    }
    
    /**
     * 初始化DOM元素
     * @param {Object} domElements - DOM元素映射
     */
    initDOM(domElements) {
        Object.assign(this.dom, domElements);
        this.initialized = true;
        this.itemHeight = Config.itemHeight || this.itemHeight;
        logger.info('[ScrollController] DOM初始化完成');
    }
    
    /**
     * 创建罪人滚动列表
     * @param {Array} sinnerList - 罪人数据数组
     * @param {Object} options - 选项
     * @param {boolean} options.autoSelect - 是否自动选择（仅1个时）
     * @param {boolean} options.personaAutoSelect - 人格是否自动选择
     */
    createSinnerScrollList(sinnerList, options = {}) {
        const { autoSelect = false, personaAutoSelect = true } = options;
        
        if (!this.dom.sinnerScrollList || !this.dom.sinnerScrollContainer) {
            logger.warn('[ScrollController] 罪人滚动容器未找到');
            return;
        }
        
        // ✓ 立即停止正在进行的滚动，防止竞态条件
        this.stopSinnerScroll(true);
        
        // 保存personaAutoSelect供后续使用
        this._personaAutoSelect = personaAutoSelect;
        
        logger.debug(`[ScrollController] createSinnerScrollList - autoSelect: ${autoSelect}, personaAutoSelect: ${personaAutoSelect}`);
        
        this.currentSinnerList = Array.isArray(sinnerList) ? sinnerList : [];
        this.dom.sinnerScrollList.innerHTML = '';
        this.sinnerOffset = 0;
        this.dom.sinnerScrollList.style.transition = 'none';
        this.dom.sinnerScrollList.style.transform = 'translateY(0px)';
        this.clearHighlight(this.dom.sinnerScrollList);
        
        // ✓ 重置选择状态（确保不会选中已禁用的项）
        appState.setSinner(null);
        appState.setPersona(null);
        window.currentSelectedSinner = null;
        window.currentSelectedPersona = null;
        if (this.dom.selectedSinnerEl) this.dom.selectedSinnerEl.textContent = '未选择';
        if (this.dom.selectedPersonaEl) this.dom.selectedPersonaEl.textContent = '未选择';
        this.resetResultDisplay();
        
        if (!this.currentSinnerList.length) {
            if (this.dom.sinnerEmptyEl) this.dom.sinnerEmptyEl.classList.remove('hidden');
            this.dom.sinnerScrollList.innerHTML = '';
            if (this.dom.startSinnerButton) this.dom.startSinnerButton.disabled = true;
            if (this.dom.startPersonaButton) this.dom.startPersonaButton.disabled = true;
            logger.debug('[ScrollController] 无可用罪人');
            return;
        }
        
        if (this.dom.sinnerEmptyEl) this.dom.sinnerEmptyEl.classList.add('hidden');
        
        const visibleRows = Math.min(
            Math.max(this.currentSinnerList.length, Config.minVisibleRows || 1),
            Config.maxVisibleRows || 5
        );
        this.dom.sinnerScrollContainer.style.height = `${visibleRows * this.itemHeight}px`;
        
        const repeat = Config.totalHeightMultiplier || 5;
        const itemsToCreate = this.currentSinnerList.length * repeat;
        for (let i = 0; i < itemsToCreate; i++) {
            const sinner = this.currentSinnerList[i % this.currentSinnerList.length];
            const item = this.createScrollItem(sinner, 'sinner', i % this.currentSinnerList.length);
            this.dom.sinnerScrollList.appendChild(item);
        }
        this.dom.sinnerScrollList.style.height = `${itemsToCreate * this.itemHeight}px`;

        if (this.dom.startSinnerButton) {
            this.dom.startSinnerButton.disabled = this.currentSinnerList.length <= 1;
        }
        if (this.dom.stopSinnerButton) {
            this.dom.stopSinnerButton.disabled = true;
        }
        
        // ✓ 只有1个罪人时，无论autoSelect如何都应自动选择（用户没有其他选择）
        if (this.currentSinnerList.length === 1) {
            logger.info('[ScrollController] 只有1个罪人，将自动选择');
            setTimeout(() => {
                this._selectSingleSinner(this.currentSinnerList[0]);
            }, 50);
        }
        
        logger.debug(`[ScrollController] 罪人滚动列表创建完成，共 ${this.currentSinnerList.length} 个罪人`);
    }
    
    /**
     * 创建人格滚动列表
     * @param {Array} personaList - 人格数据数组
     * @param {Object} options - 选项
     * @param {boolean} options.autoSelect - 是否自动选择（仅1个时）
     */
    createPersonaScrollList(personaList, options = {}) {
        const { autoSelect = false } = options;
        
        logger.debug(`[ScrollController] createPersonaScrollList 开始 - 人格数: ${personaList.length}, autoSelect: ${autoSelect}`);
        
        if (!this.dom.personaScrollList || !this.dom.personaScrollContainer) {
            logger.warn('[ScrollController] 人格滚动容器未找到');
            return;
        }
        
        this.currentPersonaList = Array.isArray(personaList) ? personaList : [];
        this.dom.personaScrollList.innerHTML = '';
        this.personaOffset = 0;
        this.dom.personaScrollList.style.transition = 'none';
        this.dom.personaScrollList.style.transform = 'translateY(0px)';
        this.clearHighlight(this.dom.personaScrollList);
        
        if (!this.currentPersonaList.length) {
            if (this.dom.personaEmptyEl) this.dom.personaEmptyEl.classList.remove('hidden');
            if (this.dom.startPersonaButton) this.dom.startPersonaButton.disabled = true;
            if (this.dom.stopPersonaButton) this.dom.stopPersonaButton.disabled = true;
            return;
        }
        
        if (this.dom.personaEmptyEl) this.dom.personaEmptyEl.classList.add('hidden');
        
        const visibleRows = Math.min(
            Math.max(this.currentPersonaList.length, Config.minVisibleRows || 1),
            Config.maxVisibleRows || 5
        );
        this.dom.personaScrollContainer.style.height = `${visibleRows * this.itemHeight}px`;
        
        const repeat = Config.totalHeightMultiplier || 5;
        const itemsToCreate = this.currentPersonaList.length * repeat;
        for (let i = 0; i < itemsToCreate; i++) {
            const persona = this.currentPersonaList[i % this.currentPersonaList.length];
            const item = this.createScrollItem(persona, 'persona', i % this.currentPersonaList.length);
            this.dom.personaScrollList.appendChild(item);
        }
        this.dom.personaScrollList.style.height = `${itemsToCreate * this.itemHeight}px`;
        
        // 只有1个人格时，根据autoSelect决定是否禁用按钮
        if (this.dom.startPersonaButton) {
            this.dom.startPersonaButton.disabled = this.currentPersonaList.length < 2;
        }
        if (this.dom.stopPersonaButton) this.dom.stopPersonaButton.disabled = true;
        
        // 如果只有1个人格，无论autoSelect如何都应自动选择（用户没有其他选择）
        if (this.currentPersonaList.length === 1) {
            logger.info('[ScrollController] 只有1个人格，将自动选择');
            setTimeout(() => {
                const persona = this.currentPersonaList[0];
                appState.setPersona(persona);
                window.currentSelectedPersona = persona;
                if (this.dom.selectedPersonaEl) this.dom.selectedPersonaEl.textContent = persona.name;
                this.highlightSelectedItemByIndex(this.dom.personaScrollList, 0);
                this.updateResultDisplay();
                this.checkEasterEgg();
                eventBus.emit(GameEvents.PERSONA_SELECTED, { persona });
                logger.info('[ScrollController] 人格已自动选择并显示');
            }, 100);
        }
        
        logger.debug(`[ScrollController] 人格滚动列表创建完成，共 ${this.currentPersonaList.length} 个人格`);
    }
    
    /**
     * 创建单个滚动项
     * @param {Object} data - 罪人或人格数据
     * @param {string} type - 'sinner' 或 'persona'
     * @returns {HTMLElement} 滚动项元素
     */
    createScrollItem(data, type, originalIndex = 0) {
        const item = document.createElement('div');
        item.className = 'scroll-item';
        item.style.height = `${this.itemHeight}px`;
        item.dataset.originalIndex = originalIndex;
        
        if (type === 'sinner') {
            item.dataset.sinnerId = data.id;
            item.style.color = data.color || '#fff';
        } else if (type === 'persona') {
            item.dataset.personaName = data.name;
        }
        
        // 创建内容包裹器
        const contentEl = document.createElement('div');
        contentEl.className = 'scroll-item-content';
        
        // 添加头像图片
        if (data.avatar) {
            const avatarEl = document.createElement('img');
            avatarEl.className = 'avatar-placeholder';
            avatarEl.src = data.avatar;
            avatarEl.alt = data.name;
            avatarEl.onerror = function() {
                // 图片加载失败时显示占位符
                const fallback = document.createElement('div');
                fallback.className = 'avatar-placeholder';
                fallback.textContent = '?';
                fallback.style.backgroundColor = data.color || '#666';
                this.parentNode.replaceChild(fallback, this);
            };
            contentEl.appendChild(avatarEl);
        } else {
            // 没有头像时显示占位符
            const fallback = document.createElement('div');
            fallback.className = 'avatar-placeholder';
            fallback.textContent = '?';
            fallback.style.backgroundColor = data.color || '#666';
            contentEl.appendChild(fallback);
        }
        
        const nameEl = document.createElement('span');
        nameEl.textContent = data.name;
        contentEl.appendChild(nameEl);
        
        item.appendChild(contentEl);
        
        return item;
    }
    
    /**
     * 开始罪人滚动
     */
    startSinnerScroll() {
        if (!this.currentSinnerList || this.currentSinnerList.length === 0) {
            window.Modal?.alert('请至少选择一个罪人！', '提示');
            return;
        }

        if (this.currentSinnerList.length === 1) {
            this._selectSingleSinner(this.currentSinnerList[0]);
            return;
        }

        // 清除之前的滚动
        this.stopSinnerScroll(true);

        const listEl = this.dom.sinnerScrollList;
        if (!listEl) return;

        if (this.dom.startSinnerButton) this.dom.startSinnerButton.disabled = true;
        if (this.dom.stopSinnerButton) this.dom.stopSinnerButton.disabled = false;
        if (this.dom.sinnerScrollContainer) this.dom.sinnerScrollContainer.classList.add('scrolling');

        const speed = Config.scrollSpeed || 150;
        const interval = Config.scrollInterval || 10;

        this.scrollIntervals.sinner = setInterval(() => {
            // ✓ 检查列表是否仍有效（防止在筛选变化时滚动继续）
            if (!this.currentSinnerList || this.currentSinnerList.length === 0) {
                this.stopSinnerScroll(true);
                return;
            }
            
            this.sinnerOffset += speed;
            listEl.style.transition = `transform ${Config.transitionDuration || '0.05s'} ${Config.transitionType || 'linear'}`;
            listEl.style.transform = `translateY(-${this.sinnerOffset}px)`;

            const totalHeight = this.currentSinnerList.length * this.itemHeight * (Config.totalHeightMultiplier || 5);
            if (this.sinnerOffset > totalHeight) {
                this.sinnerOffset = this.sinnerOffset % totalHeight;
                listEl.style.transition = 'none';
                listEl.style.transform = `translateY(-${this.sinnerOffset}px)`;
            }
        }, interval);

        appState.setScrolling(true);
        eventBus.emit(GameEvents.SCROLL_START, { type: 'sinner' });

        logger.info('[ScrollController] 罪人滚动开始');
    }
    
    /**
     * 停止罪人滚动
     */
    stopSinnerScroll(silent = false) {
        if (this.scrollIntervals.sinner) {
            clearInterval(this.scrollIntervals.sinner);
            this.scrollIntervals.sinner = null;
        }

        if (this.dom.sinnerScrollContainer) {
            this.dom.sinnerScrollContainer.classList.remove('scrolling');
        }

        if (silent) {
            if (this.dom.startSinnerButton) this.dom.startSinnerButton.disabled = false;
            if (this.dom.stopSinnerButton) this.dom.stopSinnerButton.disabled = true;
            return;
        }

        if (!this.currentSinnerList.length) {
            window.Modal?.alert('请至少选择一个罪人！', '提示');
            return;
        }

        const randomIndex = secureRandInt(this.currentSinnerList.length);
        const sinner = this.currentSinnerList[randomIndex];
        appState.setSinner(sinner);
        appState.setPersona(null);  // 显式清空已选的人格
        window.currentSelectedSinner = sinner;
        window.currentSelectedPersona = null;

        if (this.dom.selectedSinnerEl) this.dom.selectedSinnerEl.textContent = sinner.name;
        if (this.dom.selectedPersonaEl) this.dom.selectedPersonaEl.textContent = '未选择';

        // 立即清空人格显示内容，防止旧数据残留
        if (this.dom.resultPersonaImg) {
            this.dom.resultPersonaImg.src = '';
            this.dom.resultPersonaImg.style.display = 'none';
        }
        if (this.dom.resultPersonaFallback) this.dom.resultPersonaFallback.style.display = 'flex';

        // 平滑定位到选中项
        const visibleRows = Math.min(
            Math.max(this.currentSinnerList.length, Config.minVisibleRows || 1),
            Config.maxVisibleRows || 5
        );
        const centerIndex = Math.floor(visibleRows / 2);
        const centerOffset = centerIndex * this.itemHeight;
        const loopCount = Config.totalHeightMultiplier || 5;
        const loopOffset = Math.max(1, Math.floor(loopCount / 2));
        const targetOffset = (randomIndex + loopOffset * this.currentSinnerList.length) * this.itemHeight - centerOffset;
        this.sinnerOffset = targetOffset;
        if (this.dom.sinnerScrollList) {
            this.dom.sinnerScrollList.style.transition = 'transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            this.dom.sinnerScrollList.style.transform = `translateY(-${targetOffset}px)`;
        }

        setTimeout(() => {
            this.highlightSelectedItemByIndex(this.dom.sinnerScrollList, randomIndex);
        }, 1200);

        if (this.dom.startSinnerButton) this.dom.startSinnerButton.disabled = false;
        if (this.dom.stopSinnerButton) this.dom.stopSinnerButton.disabled = true;

        // 重置人格状态
        this.resetPersonaScrollState();

        // sinner.personalities 已经是筛选后的人格列表（来自 filteredData）
        // 直接使用，不需要再次筛选
        // 用户主动选择罪人后，允许自动选择人格
        this.createPersonaScrollList(sinner.personalities, { autoSelect: true });

        this.updateResultDisplay();

        appState.setScrolling(false);
        eventBus.emit(GameEvents.SINNER_SELECTED, { sinner });
        eventBus.emit(GameEvents.SCROLL_STOP, { type: 'sinner', selected: sinner });

        logger.info('[ScrollController] 罪人滚动停止');
    }
    
    /**
     * 开始人格滚动
     */
    startPersonaScroll() {
        const currentSinner = appState.getSinner();
        if (!currentSinner) {
            window.Modal?.alert('请先选择一个罪人！', '提示');
            return;
        }

        if (!this.currentPersonaList || this.currentPersonaList.length === 0) {
            logger.warn('[ScrollController] 无法开始滚动：没有可用的人格');
            return;
        }

        // 只有1个人格时自动选择
        if (this.currentPersonaList.length === 1) {
            this.stopPersonaScroll(true);
            return;
        }

        // 清除之前的滚动
        this.stopPersonaScroll(true);

        const listEl = this.dom.personaScrollList;
        if (!listEl) return;

        if (this.dom.startPersonaButton) this.dom.startPersonaButton.disabled = true;
        if (this.dom.stopPersonaButton) this.dom.stopPersonaButton.disabled = false;
        if (this.dom.personaScrollContainer) this.dom.personaScrollContainer.classList.add('scrolling');

        const speed = Config.scrollSpeed || 150;
        const interval = Config.scrollInterval || 10;

        this.scrollIntervals.persona = setInterval(() => {
            // ✓ 检查列表是否仍有效（防止在筛选变化时滚动继续）
            if (!this.currentPersonaList || this.currentPersonaList.length === 0) {
                this.stopPersonaScroll(true);
                return;
            }
            
            this.personaOffset += speed;
            listEl.style.transition = `transform ${Config.transitionDuration || '0.05s'} ${Config.transitionType || 'linear'}`;
            listEl.style.transform = `translateY(-${this.personaOffset}px)`;

            const totalHeight = this.currentPersonaList.length * this.itemHeight * (Config.totalHeightMultiplier || 5);
            if (this.personaOffset > totalHeight) {
                this.personaOffset = this.personaOffset % totalHeight;
                listEl.style.transition = 'none';
                listEl.style.transform = `translateY(-${this.personaOffset}px)`;
            }
        }, interval);

        appState.setScrolling(true);
        eventBus.emit(GameEvents.SCROLL_START, { type: 'persona' });

        logger.info('[ScrollController] 人格滚动开始');
    }
    
    /**
     * 停止人格滚动
     */
    stopPersonaScroll(silent = false) {
        if (this.scrollIntervals.persona) {
            clearInterval(this.scrollIntervals.persona);
            this.scrollIntervals.persona = null;
        }

        if (this.dom.personaScrollContainer) {
            this.dom.personaScrollContainer.classList.remove('scrolling');
        }

        if (!this.currentPersonaList.length) {
            return;
        }

        if (this.currentPersonaList.length === 1) {
            const persona = this.currentPersonaList[0];
            appState.setPersona(persona);
            window.currentSelectedPersona = persona;
            if (this.dom.selectedPersonaEl) this.dom.selectedPersonaEl.textContent = persona.name;
            this.highlightSelectedItemByIndex(this.dom.personaScrollList, 0);
            this.updateResultDisplay();
            this.checkEasterEgg();
            if (this.dom.startPersonaButton) this.dom.startPersonaButton.disabled = false;
            if (this.dom.stopPersonaButton) this.dom.stopPersonaButton.disabled = true;
            eventBus.emit(GameEvents.PERSONA_SELECTED, { persona });
            return;
        }

        if (silent) {
            if (this.dom.startPersonaButton) this.dom.startPersonaButton.disabled = false;
            if (this.dom.stopPersonaButton) this.dom.stopPersonaButton.disabled = true;
            return;
        }

        const randomIndex = secureRandInt(this.currentPersonaList.length);
        const persona = this.currentPersonaList[randomIndex];
        appState.setPersona(persona);
        window.currentSelectedPersona = persona;
        if (this.dom.selectedPersonaEl) this.dom.selectedPersonaEl.textContent = persona.name;

        const visibleRows = Math.min(
            Math.max(this.currentPersonaList.length, Config.minVisibleRows || 1),
            Config.maxVisibleRows || 5
        );
        const centerIndex = Math.floor(visibleRows / 2);
        const centerOffset = centerIndex * this.itemHeight;
        const loopCount = Config.totalHeightMultiplier || 5;
        const loopOffset = Math.max(1, Math.floor(loopCount / 2));
        const targetOffset = (randomIndex + loopOffset * this.currentPersonaList.length) * this.itemHeight - centerOffset;
        this.personaOffset = targetOffset;
        if (this.dom.personaScrollList) {
            this.dom.personaScrollList.style.transition = 'transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            this.dom.personaScrollList.style.transform = `translateY(-${targetOffset}px)`;
        }

        setTimeout(() => {
            this.highlightSelectedItemByIndex(this.dom.personaScrollList, randomIndex);
        }, 1200);

        if (this.dom.startPersonaButton) this.dom.startPersonaButton.disabled = false;
        if (this.dom.stopPersonaButton) this.dom.stopPersonaButton.disabled = true;

        this.updateResultDisplay();
        this.checkEasterEgg();
        appState.setScrolling(false);
        eventBus.emit(GameEvents.PERSONA_SELECTED, { persona });
        eventBus.emit(GameEvents.SCROLL_STOP, { type: 'persona', selected: persona });

        logger.info('[ScrollController] 人格滚动停止');
    }
    
    /**
     * 获取容器中间的项
     * @param {HTMLElement} container - 滚动容器
     * @returns {HTMLElement|null} 中间项元素
     */
    getMiddleItem(container) {
        if (!container) return null;
        
        const items = container.querySelectorAll('.scroll-item');
        if (items.length === 0) return null;
        
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;
        
        let closestItem = null;
        let closestDistance = Infinity;
        
        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const itemCenter = itemRect.top + itemRect.height / 2;
            const distance = Math.abs(containerCenter - itemCenter);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestItem = item;
            }
        });
        
        return closestItem;
    }
    
    /**
     * 清除高亮
     * @param {HTMLElement} container
     */
    clearHighlight(container) {
        if (!container) return;
        container.querySelectorAll('.scroll-item').forEach(item => item.classList.remove('selected'));
    }

    /**
     * 按索引高亮项目
     * @param {HTMLElement} container
     * @param {number} selectedIndex
     */
    highlightSelectedItemByIndex(container, selectedIndex) {
        if (!container) return;
        this.clearHighlight(container);
        const items = container.querySelectorAll('.scroll-item');
        if (!items.length) return;
        items.forEach(item => {
            const itemOriginalIndex = parseInt(item.dataset.originalIndex, 10);
            if (itemOriginalIndex === selectedIndex) {
                item.classList.add('selected');
            }
        });
    }

    /**
     * 重置人格滚动状态
     */
    resetPersonaScrollState() {
        this.stopPersonaScroll(true);
        this.personaOffset = 0;
        if (this.dom.personaScrollList) {
            this.dom.personaScrollList.style.transition = 'none';
            this.dom.personaScrollList.style.transform = 'translateY(0px)';
            this.dom.personaScrollList.innerHTML = '';  // ✓ 清空DOM
        }
        this.currentPersonaList = [];
        if (this.dom.personaEmptyEl) this.dom.personaEmptyEl.classList.remove('hidden');
        if (this.dom.startPersonaButton) this.dom.startPersonaButton.disabled = true;
        if (this.dom.stopPersonaButton) this.dom.stopPersonaButton.disabled = true;
        this.resetResultDisplay();
        // ✓ 清空已选人格
        appState.setPersona(null);
        window.currentSelectedPersona = null;
    }

    /**
     * 更新结果展示
     */
    updateResultDisplay() {
        const currentSelectedSinner = appState.getSinner();
        const currentSelectedPersona = appState.getPersona();
        
        if (currentSelectedSinner && currentSelectedPersona) {
            if (this.dom.resultDisplayEl) this.dom.resultDisplayEl.style.display = 'none';
            if (this.dom.resultFinalEl) this.dom.resultFinalEl.style.display = 'block';
            
            if (this.dom.selectedSinnerEl) this.dom.selectedSinnerEl.textContent = currentSelectedSinner.name;
            if (this.dom.selectedPersonaEl) this.dom.selectedPersonaEl.textContent = currentSelectedPersona.name;
            
            if (this.dom.resultSinnerImg && currentSelectedSinner.avatar) {
                this.dom.resultSinnerImg.src = currentSelectedSinner.avatar;
                this.dom.resultSinnerImg.alt = currentSelectedSinner.name;
                this.dom.resultSinnerImg.style.display = 'block';
                if (this.dom.resultSinnerFallback) this.dom.resultSinnerFallback.style.display = 'none';
                this.dom.resultSinnerImg.onerror = () => {
                    this.dom.resultSinnerImg.style.display = 'none';
                    if (this.dom.resultSinnerFallback) this.dom.resultSinnerFallback.style.display = 'flex';
                };
            }
            
            let personaAvatar = currentSelectedPersona.avatar || '';
            if (!personaAvatar && currentSelectedSinner && Array.isArray(currentSelectedSinner.personalities)) {
                const match = currentSelectedSinner.personalities.find(p => p.name === currentSelectedPersona.name);
                if (match && match.avatar) {
                    personaAvatar = match.avatar;
                }
            }
            if (this.dom.resultPersonaImg && personaAvatar) {
                this.dom.resultPersonaImg.src = personaAvatar;
                this.dom.resultPersonaImg.alt = currentSelectedPersona.name;
                this.dom.resultPersonaImg.style.display = 'block';
                if (this.dom.resultPersonaFallback) this.dom.resultPersonaFallback.style.display = 'none';
                this.dom.resultPersonaImg.onerror = () => {
                    this.dom.resultPersonaImg.style.display = 'none';
                    if (this.dom.resultPersonaFallback) this.dom.resultPersonaFallback.style.display = 'flex';
                };
            }
            
            // 检查是否有攻略
            this.checkAndShowGuides(currentSelectedSinner, currentSelectedPersona);
            
        } else if (currentSelectedSinner) {
            // 只有罪人没有人格时，显示过渡状态
            if (this.dom.resultFinalEl) this.dom.resultFinalEl.style.display = 'none';
            if (this.dom.resultDisplayEl) {
                this.dom.resultDisplayEl.style.display = 'block';
                this.dom.resultDisplayEl.innerHTML = `
                    <div class="result-empty">
                        <div class="result-sinner-preview">
                            <div class="result-sinner-avatar" style="margin: 0 auto 16px;">
                                <img src="${currentSelectedSinner.avatar || ''}" alt="${currentSelectedSinner.name}" 
                                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" 
                                    style="width:80px;height:80px;border-radius:8px;object-fit:cover;border:3px solid var(--lc-gold);">
                                <div class="avatar-fallback" style="display:none;">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                    </svg>
                                </div>
                            </div>
                            <div class="result-empty-text" style="color: var(--lc-gold);">${currentSelectedSinner.name}</div>
                            <div class="result-empty-hint">已选择罪人，请继续选择人格</div>
                        </div>
                    </div>
                `;
            }
        } else {
            // 都没选时显示空状态
            this.resetResultDisplay();
        }
    }

    /**
     * 重置结果展示
     */
    resetResultDisplay() {
        if (this.dom.resultDisplayEl) {
            this.dom.resultDisplayEl.style.display = 'block';
            this.dom.resultDisplayEl.innerHTML = `
                <div class="result-empty">
                    <div class="result-empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                        </svg>
                    </div>
                    <div class="result-empty-text">等待抽取</div>
                    <div class="result-empty-hint">完成两级选择查看结果</div>
                </div>
            `;
        }
        if (this.dom.resultFinalEl) this.dom.resultFinalEl.style.display = 'none';
        if (this.dom.resultSinnerImg) { this.dom.resultSinnerImg.style.display = 'none'; this.dom.resultSinnerImg.src = ''; }
        if (this.dom.resultSinnerFallback) this.dom.resultSinnerFallback.style.display = 'flex';
        if (this.dom.resultPersonaImg) { this.dom.resultPersonaImg.style.display = 'none'; this.dom.resultPersonaImg.src = ''; }
        if (this.dom.resultPersonaFallback) this.dom.resultPersonaFallback.style.display = 'flex';
        if (this.dom.resultGuidesSection) this.dom.resultGuidesSection.style.display = 'none';
    }

    /**
     * 检查并显示攻略入口
     * @param {Object} sinner - 罪人数据
     * @param {Object} persona - 人格数据
     */
    async checkAndShowGuides(sinner, persona) {
        if (!this.dom.resultGuidesSection || !this.dom.guidesBtn) return;
        
        try {
            const sinnerName = sinner.name.split(' ')[0]; // 获取罪人中文名
            const personaName = typeof persona === 'object' ? persona.name : persona;
            
            // 调用API检查是否有攻略
            const apiBase = typeof window !== 'undefined' && window.API_BASE ? window.API_BASE : '/api';
            const response = await fetch(
                `${apiBase}/guides/check/${encodeURIComponent(sinnerName)}/${encodeURIComponent(personaName)}`
            );
            
            if (!response.ok) {
                // API不可用时不显示攻略入口
                this.dom.resultGuidesSection.style.display = 'none';
                return;
            }
            
            const result = await response.json();
            
            if (result.success && result.data.hasGuides) {
                // 有攻略，显示入口
                this.dom.resultGuidesSection.style.display = 'block';
                this.dom.guidesBtn.href = `guides.html?sinner=${encodeURIComponent(sinnerName)}&persona=${encodeURIComponent(personaName)}`;
                
                if (this.dom.guidesCount) {
                    this.dom.guidesCount.textContent = `(${result.data.count}篇)`;
                }
            } else {
                // 没有攻略，隐藏入口
                this.dom.resultGuidesSection.style.display = 'none';
            }
        } catch (error) {
            // 出错时不显示攻略入口，避免影响用户体验
            logger.debug('[ScrollController] 检查攻略失败:', error);
            if (this.dom.resultGuidesSection) {
                this.dom.resultGuidesSection.style.display = 'none';
            }
        }
    }

    /**
     * 彩蛋检测与触发
     */
    checkEasterEgg() {
        const currentSelectedSinner = appState.getSinner();
        const currentSelectedPersona = appState.getPersona();
        if (!currentSelectedSinner || !currentSelectedPersona) return;

        const sinnerId = currentSelectedSinner.id;
        const personaName = typeof currentSelectedPersona === 'object'
            ? currentSelectedPersona.name
            : currentSelectedPersona;

        if (!easterEggConfig[sinnerId]) return;
        const videoPath = easterEggConfig[sinnerId][personaName];
        if (!videoPath) return;

        this.triggerUniversalEasterEgg(videoPath);
    }

    /**
     * 通用彩蛋视频播放器
     * @param {string} videoPath
     */
    triggerUniversalEasterEgg(videoPath) {
        const modalId = 'universal-easter-egg-modal';
        const videoId = 'universal-easter-egg-video';
        const closeBtnId = 'universal-easter-egg-close-btn';

        const modal = document.getElementById(modalId);
        const video = document.getElementById(videoId);
        const closeBtn = document.getElementById(closeBtnId);

        if (!modal || !video || !closeBtn) {
            logger.warn('通用彩蛋播放器元素未找到，请检查 index.html 结构');
            return;
        }

        const hideModal = () => {
            modal.classList.remove('fade-in');
            setTimeout(() => {
                modal.classList.remove('active');
                video.pause();
                video.currentTime = 0;
                video.src = '';
            }, 400);
        };

        closeBtn.onclick = (event) => {
            event.stopPropagation();
            hideModal();
        };

        video.onclick = (event) => {
            event.stopPropagation();
            if (video.paused) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        };

        modal.onclick = (event) => {
            if (event.target === modal) {
                hideModal();
            }
        };

        video.src = videoPath;
        video.load();

        modal.classList.add('active');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.classList.add('fade-in');
            });
        });

        setTimeout(() => {
            video.currentTime = 0;
            const playPromise = video.play();
            if (playPromise && typeof playPromise.then === 'function') {
                playPromise.catch(() => {
                    logger.info('彩蛋视频自动播放被浏览器阻止，用户可点击视频手动播放');
                });
            }
        }, 100);
    }

    /**
     * 只有一个罪人时自动选中
     * @param {Object} sinner
     */
    _selectSingleSinner(sinner) {
        logger.info('[ScrollController] _selectSingleSinner 开始执行');
        appState.setSinner(sinner);
        window.currentSelectedSinner = sinner;
        if (this.dom.selectedSinnerEl) this.dom.selectedSinnerEl.textContent = sinner.name;
        if (this.dom.selectedPersonaEl) this.dom.selectedPersonaEl.textContent = '未选择';
        this.highlightSelectedItemByIndex(this.dom.sinnerScrollList, 0);

        // ✓ sinner.personalities 已经是过滤后的（来自filteredData）
        // 不要再次过滤，直接使用
        const filteredPersonas = sinner.personalities;
        logger.debug(`[ScrollController] _selectSingleSinner - 过滤后人格数: ${filteredPersonas.length}, personaAutoSelect: ${this._personaAutoSelect}`);
        // 使用保存的personaAutoSelect设置
        const personaAutoSelect = this._personaAutoSelect !== undefined ? this._personaAutoSelect : true;
        logger.info(`[ScrollController] _selectSingleSinner - 调用createPersonaScrollList，autoSelect=${personaAutoSelect}`);
        this.createPersonaScrollList(filteredPersonas, { autoSelect: personaAutoSelect });
        this.updateResultDisplay();
        logger.info('[ScrollController] _selectSingleSinner 执行完成');
    }
    
    /**
     * 更新滚动列表
     * 当筛选改变时调用
     * @param {Array} sinnerList - 新的罪人列表
     */
    updateScrollLists(sinnerList) {
        // 停止所有滚动
        this.stopSinnerScroll(true);
        this.stopPersonaScroll(true);
        
        // 重新创建罪人列表
        this.createSinnerScrollList(sinnerList);
        this.resetPersonaScrollState();
        
        logger.info('[ScrollController] 滚动列表已更新');
    }
    
    /**
     * 清空人格列表
     */
    clearPersonaList() {
        this.resetPersonaScrollState();
        this.currentPersonaList = [];
    }
    
    /**
     * 清理资源
     */
    destroy() {
        this.stopSinnerScroll();
        this.stopPersonaScroll();
        logger.info('[ScrollController] 已清理');
    }
}

// 导出单例
export const scrollController = new ScrollController();
