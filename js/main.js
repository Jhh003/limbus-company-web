/**
 * main.js - 边狱公司应用主入口点
 * 
 * 架构特点：
 * - 使用AppState管理全局状态
 * - 通过EventBus实现模块通信
 * - 清晰的初始化流程
 * - 零全局变量污染
 * 
 * 初始化顺序：
 * 1. 导入所有模块
 * 2. 初始化核心服务（AppState, EventBus, Logger）
 * 3. 创建Controller实例
 * 4. 初始化DOM和事件监听
 * 5. 启动应用
 */

// ==================== 导入核心模块 ====================
import { sinnerData } from '../data/characters.js';
import { secureRandInt } from '../data/utils/helpers.js';
import { Config } from '../data/config.js';
import modal from './modal.js';
import UI from './ui.js';

// 导入核心服务（使用单例）
import { appState } from './core/appState.js';
import { eventBus } from './core/eventBus.js';
import { logger } from './core/logger.js';

// 导入Controllers（使用单例）
import { filterController } from './controllers/filterController.js';
import { scrollController } from './controllers/scrollController.js';
import { settingsController } from './controllers/settingsController.js';
import { timerController } from './controllers/timerController.js';
import { animationController } from './controllers/animationController.js';
import { uiController } from './controllers/uiController.js';

// ==================== 初始化核心服务 ====================

/**
 * 初始化应用的核心服务和状态管理
 */
function initializeCoreServices() {
    // 使用导入的单例实例
    window.appState = appState;
    window.eventBus = eventBus;
    window.logger = logger;
    
    // AppState和EventBus关联
    appState.setEventBus(eventBus);
    
    logger.debug('核心服务已初始化');
    
    return {
        appState,
        eventBus,
        logger
    };
}

/**
 * 获取所有Controller单例
 */
function initializeControllers(services) {
    // 使用导入的单例实例
    const controllers = {
        filterController,
        scrollController,
        settingsController,
        timerController,
        animationController,
        uiController
    };
    
    // 保存到window以便调试和访问
    window.controllers = controllers;
    
    services.logger.debug('所有Controller已准备就绪');
    
    return controllers;
}

/**
 * 初始化DOM元素和事件监听
 */
function initializeDOMAndEvents(controllers, services) {
    // 获取所有必需的DOM元素
    const domElements = {
        // 页面容器
        mainSelectorPage: document.getElementById('main-selector-page'),
        settingsPage: document.getElementById('settings-page'),
        
        // 导航按钮
        mainPageBtn: document.getElementById('main-page-btn'),
        settingsPageBtn: document.getElementById('settings-page-btn'),
        
        // 滚动容器
        sinnerScrollContainer: document.getElementById('sinner-scroll-container'),
        personaScrollContainer: document.getElementById('persona-scroll-container'),
        sinnerScrollList: document.getElementById('sinner-scroll'),
        personaScrollList: document.getElementById('persona-scroll'),
        
        // 滚动按钮
        sinnerStartBtn: document.getElementById('sinner-start-btn'),
        sinnerStopBtn: document.getElementById('sinner-stop-btn'),
        personaStartBtn: document.getElementById('persona-start-btn'),
        personaStopBtn: document.getElementById('persona-stop-btn'),
        
        // 选择显示
        selectedSinnerEl: document.getElementById('selected-sinner'),
        selectedPersonaEl: document.getElementById('selected-persona'),
        sinnerEmptyEl: document.getElementById('sinner-empty'),
        personaEmptyEl: document.getElementById('persona-empty'),
        resultDisplayEl: document.getElementById('result-display'),
        resultFinalEl: document.getElementById('result-final'),
        resultSinnerImg: document.getElementById('result-sinner-img'),
        resultSinnerFallback: document.getElementById('result-sinner-fallback'),
        resultPersonaImg: document.getElementById('result-persona-img'),
        resultPersonaFallback: document.getElementById('result-persona-fallback'),
        resultGuidesSection: document.getElementById('result-guides-section'),
        guidesBtn: document.getElementById('guides-btn'),
        guidesCount: document.getElementById('guides-count'),
        
        // 筛选容器
        sinnerFilterContainer: document.getElementById('sinner-filter'),
        settingsContainer: document.getElementById('personality-settings-container'),
        selectAllBtn: document.getElementById('select-all-btn'),
        deselectAllBtn: document.getElementById('deselect-all-btn'),
        invertSelectionBtn: document.getElementById('invert-selection-btn'),
        availableSinnersEl: document.getElementById('available-sinners'),
        
        // 计时器
        timerModal: document.getElementById('timer-modal'),
        timerCloseBtn: document.getElementById('timer-close-btn'),
        timerDisplay: document.getElementById('timer-display'),
        timerStartBtn: document.getElementById('timer-start-btn'),
        timerPauseBtn: document.getElementById('timer-pause-btn'),
        timerResetBtn: document.getElementById('timer-reset-btn'),
        timerToggleBtn: document.getElementById('timer-toggle-btn'),
        submitToLocalBtn: document.getElementById('submit-to-local-btn'),
        submitToGlobalBtn: document.getElementById('submit-to-global-btn'),
        timerSinnerName: document.getElementById('timer-sinner-name'),
        timerPersonaName: document.getElementById('timer-persona-name'),
        
        // 倒计时
        countdownElement: document.getElementById('countdown'),
        
        // 帮助
        helpBtn: document.getElementById('help-btn'),
        helpModal: document.getElementById('help-modal'),
        helpCloseBtn: document.getElementById('help-close-btn')
    };
    
    // 初始化各个Controller的DOM
    controllers.filterController.initDOM({
        ...domElements,
        sinnerStartButton: domElements.sinnerStartBtn,
        availableSinnersEl: domElements.availableSinnersEl
    });
    
    // ScrollController需要特别映射
    controllers.scrollController.initDOM({
        ...domElements,
        sinnerScrollContainer: domElements.sinnerScrollContainer,
        personaScrollContainer: domElements.personaScrollContainer,
        sinnerScrollList: domElements.sinnerScrollList,
        personaScrollList: domElements.personaScrollList,
        startSinnerButton: domElements.sinnerStartBtn,
        stopSinnerButton: domElements.sinnerStopBtn,
        startPersonaButton: domElements.personaStartBtn,
        stopPersonaButton: domElements.personaStopBtn
    });
    
    controllers.settingsController.initDOM({
        ...domElements,
        personalitySettingsContainer: domElements.settingsContainer
    });
    controllers.timerController.initDOM({
        ...domElements,
        timerDisplay: domElements.timerDisplay,
        startButton: domElements.timerStartBtn,
        pauseButton: domElements.timerPauseBtn,
        resetButton: domElements.timerResetBtn,
        timerToggleBtn: domElements.timerToggleBtn,
        timerModal: domElements.timerModal,
        timerCloseBtn: domElements.timerCloseBtn,
        submitToLocalBtn: domElements.submitToLocalBtn,
        submitToGlobalBtn: domElements.submitToGlobalBtn,
        sinnerNameEl: domElements.timerSinnerName,
        personaNameEl: domElements.timerPersonaName
    });
    controllers.animationController.initDOM(domElements);
    controllers.uiController.initDOM(domElements);
    
    services.logger.debug('DOM已初始化');
    
    // 初始化滚动按钮事件
    initializeScrollButtons(domElements, controllers, services);
    
    // 初始化页面导航
    initializePageNavigation(domElements, controllers, services);
    
    // 初始化帮助模态窗口
    initializeHelpModal(domElements);
}

/**
 * 初始化滚动按钮事件
 */
function initializeScrollButtons(domElements, controllers, services) {
    const logger = services.logger;
    
    // 罪人滚动按钮
    domElements.sinnerStartBtn?.addEventListener('click', () => {
        logger.debug('开始罪人滚动');
        controllers.scrollController.startSinnerScroll();
    });
    
    domElements.sinnerStopBtn?.addEventListener('click', () => {
        logger.debug('停止罪人滚动');
        controllers.scrollController.stopSinnerScroll();
    });
    
    // 人格滚动按钮
    domElements.personaStartBtn?.addEventListener('click', () => {
        logger.debug('开始人格滚动');
        controllers.scrollController.startPersonaScroll();
    });
    
    domElements.personaStopBtn?.addEventListener('click', () => {
        logger.debug('停止人格滚动');
        controllers.scrollController.stopPersonaScroll();
    });
    
    logger.debug('滚动按钮事件已绑定');
}

/**
 * 初始化页面导航逻辑
 */
function initializePageNavigation(domElements, controllers, services) {
    const appState = services.appState;
    const eventBus = services.eventBus;
    const logger = services.logger;
    
    // 主页面按钮
    domElements.mainPageBtn?.addEventListener('click', async () => {
        // 检查是否有未保存的更改
        if (appState.get('app.hasUnsavedChanges')) {
            const choice = await Modal.confirm(
                '您有未保存的更改，是否保存后再离开？\n\n点击"确定"保存并返回，点击"取消"不保存直接返回。',
                '确认'
            );
            
            if (choice) {
                // 应用筛选设置
                controllers.filterController.applyFilters();
            } else {
                // 不保存直接返回，但仍需验证人格选择
                const applied = controllers.filterController.applyFilters({ commit: false });
                if (!applied) return;
            }
        }
        
        // 切换到主页面
        if (domElements.mainSelectorPage) {
            domElements.mainSelectorPage.style.display = 'block';
            domElements.settingsPage.style.display = 'none';
            domElements.mainPageBtn.classList.add('active');
            domElements.settingsPageBtn.classList.remove('active');
        }
    });
    
    // 设置页面按钮
    domElements.settingsPageBtn?.addEventListener('click', () => {
        // 创建人格设置UI
        controllers.settingsController.createPersonalitySettings();
        
        // 切换到设置页面
        if (domElements.mainSelectorPage) {
            domElements.mainSelectorPage.style.display = 'none';
            domElements.settingsPage.style.display = 'block';
            domElements.mainPageBtn.classList.remove('active');
            domElements.settingsPageBtn.classList.add('active');
        }
    });
    
    // 监听罪人选择变化，自动更新人格设置标签页
    eventBus.subscribe('SINNER_SELECTION_CHANGED', () => {
        // 总是更新人格设置（无论设置页面是否可见）
        controllers.settingsController.createPersonalitySettings();
        logger.debug('人格设置UI已更新（罪人选择变化）');
    });
    
    // 应用筛选设置按钮
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    applyFiltersBtn?.addEventListener('click', () => {
        // 应用筛选
        const applied = controllers.filterController.applyFilters();
        if (!applied) return;
        
        // 切换回主页面
        if (domElements.mainSelectorPage) {
            domElements.mainSelectorPage.style.display = 'block';
            domElements.settingsPage.style.display = 'none';
            domElements.mainPageBtn.classList.add('active');
            domElements.settingsPageBtn.classList.remove('active');
        }
        
        logger.info('筛选已应用');
    });
    
    // 重置筛选设置按钮
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    resetFiltersBtn?.addEventListener('click', async () => {
        const confirmed = await Modal.confirm('确定要重置所有筛选设置吗？', '确认');
        if (!confirmed) return;
        
        controllers.filterController.resetFilters();
        controllers.settingsController.createPersonalitySettings();
        controllers.filterController.createSinnerFilter();
        logger.info('筛选已重置');
    });

    // 罪人筛选快捷操作
    domElements.selectAllBtn?.addEventListener('click', () => {
        controllers.filterController.toggleAllSinners(true);
    });
    domElements.deselectAllBtn?.addEventListener('click', () => {
        controllers.filterController.toggleAllSinners(false);
    });
    domElements.invertSelectionBtn?.addEventListener('click', () => {
        controllers.filterController.invertSelection('sinner');
    });

    // 兼容HTML内联调用：全选/取消/反选全部人格
    window.toggleAllPersonalities = (enabled) => {
        controllers.settingsController.toggleAllPersonalities(enabled);
    };
    window.invertAllPersonalities = () => {
        controllers.settingsController.invertAllPersonalities();
    };
    
    logger.debug('页面导航已初始化');
}

/**
 * 初始化帮助模态窗口
 */
function initializeHelpModal(domElements) {
    if (!domElements.helpBtn || !domElements.helpModal || !domElements.helpCloseBtn) {
        return;
    }
    
    // 打开帮助
    domElements.helpBtn.addEventListener('click', () => {
        domElements.helpModal.classList.add('active');
    });
    
    // 关闭帮助
    domElements.helpCloseBtn.addEventListener('click', () => {
        domElements.helpModal.classList.remove('active');
    });
    
    // 点击背景关闭
    domElements.helpModal.addEventListener('click', (e) => {
        if (e.target === domElements.helpModal) {
            domElements.helpModal.classList.remove('active');
        }
    });
}

/**
 * 初始化应用的初始状态
 */
function initializeAppState(services) {
    const appState = services.appState;
    const logger = services.logger;
    
    // 初始化罪人筛选（所有罪人默认启用）
    const allSinnersFilter = {};
    sinnerData.forEach(s => {
        allSinnersFilter[s.id] = true;
    });
    appState.set('filters.sinners', allSinnersFilter, { markUnsaved: false });
    
    // 初始化人格筛选（所有人格默认启用）
    const allPersonalitiesFilter = {};
    sinnerData.forEach(sinner => {
        allPersonalitiesFilter[sinner.id] = {};
        sinner.personalities.forEach((_, index) => {
            allPersonalitiesFilter[sinner.id][index] = true;
        });
    });
    appState.set('filters.personalities', allPersonalitiesFilter, { markUnsaved: false });
    
    // 初始化游戏状态
    appState.set('game.selectedSinner', null, { markUnsaved: false });
    appState.set('game.selectedPersona', null, { markUnsaved: false });
    appState.set('game.isScrolling', false, { markUnsaved: false });
    
    // 初始化计时器状态
    appState.set('timer.elapsedSeconds', 0, { markUnsaved: false });
    appState.set('timer.isRunning', false, { markUnsaved: false });
    
    // 初始化应用状态
    appState.set('app.hasUnsavedChanges', false, { markUnsaved: false });
    appState.set('app.isInitialized', true, { markUnsaved: false });
    
    logger.debug('应用初始状态已初始化');
}

/**
 * 计算人格总数
 * @returns {number}
 */
function calculateTotalPersonas() {
    return sinnerData.reduce((total, sinner) => {
        if (Array.isArray(sinner.personalities)) {
            return total + sinner.personalities.length;
        }
        return total;
    }, 0);
}

/**
 * 更新统计显示
 */
function updateStats() {
    const personaTotalEl = document.getElementById('persona-total');
    if (personaTotalEl) {
        personaTotalEl.textContent = calculateTotalPersonas();
    }
}

/**
 * 创建初始UI
 */
function initializeUI(controllers, services) {
    const logger = services.logger;
    
    // 更新统计信息
    updateStats();
    
    // 创建罪人筛选UI
    controllers.filterController.createSinnerFilter();
    
    // 应用初始筛选规则（这会计算filteredSinnerData并发送事件）
    controllers.filterController.applyFilters();
    
    logger.debug('UI已初始化');
}

/**
 * 订阅关键事件
 */
function subscribeToKeyEvents(services) {
    const eventBus = services.eventBus;
    const logger = services.logger;
    
    // 订阅罪人选择事件
    eventBus.subscribe('SINNER_SELECTED', (data) => {
        logger.debug('罪人已选择', data);
    });
    
    // 订阅人格选择事件
    eventBus.subscribe('PERSONA_SELECTED', (data) => {
        logger.debug('人格已选择', data);
    });
    
    // 订阅计时器事件
    eventBus.subscribe('TIMER_STARTED', () => {
        logger.debug('计时器已启动');
    });
    
    logger.debug('关键事件已订阅');
}

/**
 * 主初始化函数
 */
async function main() {
    try {
        // 1. 初始化核心服务
        const services = initializeCoreServices();
        
        // 2. 初始化Controllers
        const controllers = initializeControllers(services);
        
        // 3. 初始化应用状态
        initializeAppState(services);
        
        // 4. 订阅关键事件
        subscribeToKeyEvents(services);
        
        // 5. 等待DOM完全加载
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }
        
        // 6. 初始化DOM和事件
        initializeDOMAndEvents(controllers, services);
        
        // 7. 初始化UI
        initializeUI(controllers, services);
        
        // 8. 初始化UI模块
        UI.init();
        
        // 应用已准备完毕
        services.logger.debug('应用已成功启动');
        window.appReady = true;
        
        // 触发应用就绪事件
        window.eventBus.emit('APP_READY', {});
        
    } catch (error) {
        console.error('应用启动失败:', error);
        throw error;
    }
}

// ==================== 应用启动 ====================

// 只导出，不自动启动
// 启动由index.html中的脚本控制

// 导出便于测试和使用
export { main, initializeCoreServices, initializeControllers };
