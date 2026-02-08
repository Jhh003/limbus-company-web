/**
 * 应用中央状态管理模块
 * 
 * AppState是应用的单一数据源，所有状态都在这里统一管理。
 * 通过getter和setter方法访问状态，确保一致性和可追踪性。
 * 
 * 特点：
 * - 单一数据源（Single Source of Truth）
 * - 状态变化通知机制（订阅者模式）
 * - localStorage持久化
 * - TypeScript友好的文档
 * 
 * @module appState
 * @requires eventBus - 事件总线（用于状态变化通知）
 */

/**
 * 应用全局状态定义
 * 这个对象包含了应用的所有状态数据
 */
class AppState {
    constructor() {
        // 初始化状态对象
        this._state = {
            // 应用级状态
            app: {
                currentPage: 'main',              // 当前页面: 'main' | 'ranking' | 'settings'
                hasUnsavedChanges: false,         // 是否有未保存的更改
                isInitialized: false              // 应用是否已初始化完成
            },
            
            // 游戏状态
            game: {
                selectedSinner: null,             // 当前选中的罪人对象
                selectedPersona: null,            // 当前选中的人格对象
                isScrolling: false,               // 是否正在滚动
                easterEggTriggered: null          // 触发的彩蛋ID（如果有）
            },
            
            // 过滤器状态
            filters: {
                sinners: {},                      // 启用的罪人ID对象 {sinnerId: true/false}
                personalities: {}                 // 启用的人格 {sinnerId: {index: true/false}}
            },
            
            // 设置状态
            settings: {
                personality: new Map(),           // 人格偏好设置 Map<sinnerId, Set<personaIndex>>
                theme: 'dark',                    // 主题: 'dark' | 'light'
                language: 'zh-cn'                 // 语言: 'zh-cn' | 'en'
            },
            
            // 计时器状态
            timer: {
                isRunning: false,                 // 计时器是否运行中
                elapsedSeconds: 0,                // 已用时间（秒）
                totalSeconds: 0,                  // 总耗时（秒）
                startTime: null,                  // 开始时间戳
                pausedTime: null                  // 暂停时的时间戳
            },
            
            // 排行榜状态
            ranking: {
                localRecords: [],                 // 本地记录数组
                globalRecords: [],                // 全局记录数组
                lastUpdateTime: null              // 最后更新时间
            }
        };
        
        // 订阅者列表
        this._listeners = [];
        
        // 事件总线（延迟注入）
        this._eventBus = null;
        
        // 加载持久化状态
        this._loadFromStorage();
    }
    
    /**
     * 设置事件总线实例（依赖注入）
     * @param {Object} eventBus - EventBus实例
     */
    setEventBus(eventBus) {
        this._eventBus = eventBus;
    }
    
    /**
     * 获取完整状态对象（内部使用）
     * @private
     * @returns {Object} 完整的应用状态
     */
    getState() {
        const state = JSON.parse(JSON.stringify(this._state));
        // 修复 Map 序列化丢失问题
        if (this._state.settings.personality instanceof Map) {
            state.settings.personality = new Map(this._state.settings.personality);
        }
        return state;
    }
    
    /**
     * 获取状态的特定部分
     * @param {string} path - 状态路径，如 'game.selectedSinner' 或 'game'
     * @returns {*} 对应的状态值
     * 
     * @example
     * AppState.get('game.selectedSinner')  // 获取选中的罪人
     * AppState.get('filters.sinner')       // 获取罪人过滤器
     */
    get(path) {
        const keys = path.split('.');
        let value = this._state;
        
        for (const key of keys) {
            if (value == null) return undefined;
            value = value[key];
        }
        
        // 对于Set和Map，返回克隆
        if (value instanceof Set) return new Set(value);
        if (value instanceof Map) return new Map(value);
        if (typeof value === 'object' && value !== null) {
            return JSON.parse(JSON.stringify(value));
        }
        
        return value;
    }
    
    /**
     * 设置状态值
     * @param {string} path - 状态路径
     * @param {*} value - 新值
     * @param {Object} options - 选项
     * @param {boolean} options.notify - 是否通知订阅者（默认true）
     * @param {string} options.reason - 变化原因（用于日志）
     * 
     * @example
     * AppState.set('game.selectedSinner', sinnerObj)
     * AppState.set('timer.elapsedSeconds', 120, { reason: 'timer:tick' })
     */
    set(path, value, options = {}) {
        const { notify = true, reason = '', markUnsaved = true } = options;
        
        const keys = path.split('.');
        const lastKey = keys.pop();
        let obj = this._state;
        
        // 导航到目标对象
        for (const key of keys) {
            if (!(key in obj)) {
                obj[key] = {};
            }
            obj = obj[key];
        }
        
        // 检查值是否真的改变了
        const oldValue = obj[lastKey];
        if (oldValue === value) return;
        
        // 设置新值
        obj[lastKey] = value;
        
        // 标记为有未保存的更改（仅针对筛选和设置）
        if (markUnsaved && path !== 'app.hasUnsavedChanges') {
            const shouldMarkUnsaved = path.startsWith('filters.') || path.startsWith('settings.');
            if (shouldMarkUnsaved) {
                this._state.app.hasUnsavedChanges = true;
            }
        }
        
        // 保存到storage
        this._saveToStorage();
        
        // 通知订阅者
        if (notify) {
            this._notifyListeners(path, value, oldValue, reason);
        }
    }
    
    /**
     * 批量设置多个状态值
     * @param {Object} updates - 更新对象，键为状态路径
     * @param {Object} options - 选项
     * 
     * @example
     * AppState.setMultiple({
     *   'game.selectedSinner': sinner,
     *   'game.selectedPersona': persona
     * })
     */
    setMultiple(updates, options = {}) {
        for (const [path, value] of Object.entries(updates)) {
            this.set(path, value, { ...options, notify: false });
        }
        
        // 只通知一次
        this._notifyListeners('_multiple', updates, null, options.reason || '');
    }
    
    // ========== 游戏状态便捷方法 ==========
    
    /**
     * 切换罪人筛选状态
     * @param {string} sinnerId - 罪人ID
     * @param {boolean} enabled - 是否启用
     */
    toggleSinnerFilter(sinnerId, enabled) {
        const filters = this.get('filters.sinners') || {};
        filters[sinnerId] = enabled;
        this.set('filters.sinners', filters, { reason: 'filter:sinner:toggle' });
    }
    
    /**
     * 切换人格筛选状态
     * @param {string} sinnerId - 罪人ID
     * @param {number} personaIndex - 人格索引
     * @param {boolean} enabled - 是否启用
     */
    togglePersonalityFilter(sinnerId, personaIndex, enabled) {
        const path = `filters.personalities.${sinnerId}.${personaIndex}`;
        this.set(path, enabled, { reason: 'filter:personality:toggle' });
    }
    
    /**
     * 检查罪人是否被启用
     * @param {string} sinnerId - 罪人ID
     * @returns {boolean}
     */
    isSinnerEnabled(sinnerId) {
        const filters = this.get('filters.sinners') || {};
        return filters[sinnerId] !== false; // 默认启用
    }
    
    /**
     * 检查人格是否被启用
     * @param {string} sinnerId - 罪人ID
     * @param {number} personaIndex - 人格索引
     * @returns {boolean}
     */
    isPersonalityEnabled(sinnerId, personaIndex) {
        const path = `filters.personalities.${sinnerId}.${personaIndex}`;
        const value = this.get(path);
        return value !== false; // 默认启用
    }
    
    /**
     * 设置选中的罪人
     * @param {Object} sinner - 罪人对象或null
     */
    setSinner(sinner) {
        this.set('game.selectedSinner', sinner, { reason: 'sinner:selected' });
    }
    
    /**
     * 获取选中的罪人
     * @returns {Object|null} 选中的罪人对象
     */
    getSinner() {
        return this.get('game.selectedSinner');
    }
    
    /**
     * 设置选中的人格
     * @param {Object} persona - 人格对象或null
     */
    setPersona(persona) {
        this.set('game.selectedPersona', persona, { reason: 'persona:selected' });
    }
    
    /**
     * 获取选中的人格
     * @returns {Object|null} 选中的人格对象
     */
    getPersona() {
        return this.get('game.selectedPersona');
    }
    
    /**
     * 设置滚动状态
     * @param {boolean} isScrolling - 是否滚动中
     */
    setScrolling(isScrolling) {
        this.set('game.isScrolling', isScrolling);
    }
    
    /**
     * 是否正在滚动
     * @returns {boolean}
     */
    isScrolling() {
        return this.get('game.isScrolling');
    }
    
    /**
     * 设置触发的彩蛋
     * @param {string|null} eggId - 彩蛋ID或null
     */
    setEasterEgg(eggId) {
        this.set('game.easterEggTriggered', eggId);
    }
    
    // ========== 过滤器便捷方法 ==========
    // （新的filter方法已在行195-240定义）
    
    // ========== 计时器便捷方法 ==========
    
    /**
     * 启动计时器
     */
    startTimer() {
        this.setMultiple({
            'timer.isRunning': true,
            'timer.startTime': Date.now()
        });
    }
    
    /**
     * 停止计时器
     */
    stopTimer() {
        this.set('timer.isRunning', false, { reason: 'timer:stopped' });
    }
    
    /**
     * 重置计时器
     */
    resetTimer() {
        this.setMultiple({
            'timer.isRunning': false,
            'timer.elapsedSeconds': 0,
            'timer.totalSeconds': 0,
            'timer.startTime': null,
            'timer.pausedTime': null
        }, { reason: 'timer:reset' });
    }
    
    /**
     * 更新已用时间
     * @param {number} seconds - 秒数
     */
    setElapsedSeconds(seconds) {
        this.set('timer.elapsedSeconds', seconds, { 
            notify: false // 频繁变化，不通知避免性能问题
        });
    }
    
    /**
     * 获取已用时间
     * @returns {number} 秒数
     */
    getElapsedSeconds() {
        return this.get('timer.elapsedSeconds');
    }
    
    // ========== 设置便捷方法 ==========
    
    /**
     * 设置人格偏好设置
     * @param {Map} personalitySettings - Map<sinnerId, Set<personaIndex>>
     */
    setPersonalitySettings(personalitySettings) {
        this.set('settings.personality', personalitySettings, { reason: 'settings:personality-changed' });
    }
    
    /**
     * 获取人格偏好设置
     * @returns {Map}
     */
    getPersonalitySettings() {
        return this.get('settings.personality');
    }
    
    // ========== 排行榜便捷方法 ==========
    
    /**
     * 添加本地记录
     * @param {Object} record - 游戏记录对象
     */
    addLocalRecord(record) {
        const records = this.get('ranking.localRecords');
        records.push({
            ...record,
            timestamp: Date.now()
        });
        this.set('ranking.localRecords', records, { reason: 'ranking:local-record-added' });
    }
    
    /**
     * 设置全局排行榜数据
     * @param {Array} records - 全局记录数组
     */
    setGlobalRecords(records) {
        this.setMultiple({
            'ranking.globalRecords': records,
            'ranking.lastUpdateTime': Date.now()
        }, { reason: 'ranking:updated' });
    }
    
    /**
     * 获取本地记录
     * @returns {Array}
     */
    getLocalRecords() {
        return this.get('ranking.localRecords');
    }
    
    /**
     * 获取全局记录
     * @returns {Array}
     */
    getGlobalRecords() {
        return this.get('ranking.globalRecords');
    }
    
    // ========== 订阅管理 ==========
    
    /**
     * 订阅状态变化
     * @param {Function} listener - 回调函数，接收 {path, newValue, oldValue, reason}
     * @returns {Function} 取消订阅函数
     * 
     * @example
     * const unsubscribe = AppState.subscribe(({path, newValue}) => {
     *   console.log(`状态变化: ${path} = ${newValue}`)
     * })
     * 
     * // 取消订阅
     * unsubscribe()
     */
    subscribe(listener) {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }
        
        this._listeners.push(listener);
        
        // 返回取消订阅函数
        return () => {
            const index = this._listeners.indexOf(listener);
            if (index > -1) {
                this._listeners.splice(index, 1);
            }
        };
    }
    
    /**
     * 通知所有订阅者
     * @private
     */
    _notifyListeners(path, newValue, oldValue, reason) {
        // 转向事件总线（如果可用）
        if (this._eventBus && reason) {
            this._eventBus.emit(`state:changed:${reason}`, {
                path,
                newValue,
                oldValue,
                timestamp: Date.now()
            });
        }
        
        // 通知直接订阅者
        this._listeners.forEach(listener => {
            try {
                listener({
                    path,
                    newValue,
                    oldValue,
                    reason,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error('Error in state listener:', error);
            }
        });
    }
    
    // ========== 持久化 ==========
    
    /**
     * 保存状态到localStorage
     * @private
     */
    _saveToStorage() {
        try {
            const persistData = {
                filters: {
                    sinners: this._state.filters.sinners,
                    personalities: this._state.filters.personalities
                },
                settings: {
                    personality: Array.from(this._state.settings.personality.entries())
                },
                ranking: {
                    localRecords: this._state.ranking.localRecords
                }
            };
            
            localStorage.setItem('lam_app_state', JSON.stringify(persistData));
        } catch (error) {
            console.warn('Failed to save state to storage:', error);
        }
    }
    
    /**
     * 从localStorage加载状态
     * @private
     */
    _loadFromStorage() {
        try {
            const savedData = localStorage.getItem('lam_app_state');
            if (!savedData) return;
            
            const data = JSON.parse(savedData);
            
            // 恢复过滤器（对象格式）
            if (data.filters) {
                this._state.filters.sinners = data.filters.sinners || {};
                this._state.filters.personalities = data.filters.personalities || {};
            }
            
            // 恢复设置
            if (data.settings) {
                this._state.settings.personality = new Map(data.settings.personality || []);
            }
            
            // 恢复本地排行榜
            if (data.ranking && data.ranking.localRecords) {
                this._state.ranking.localRecords = data.ranking.localRecords;
            }
        } catch (error) {
            console.warn('Failed to load state from storage:', error);
        }
    }
    
    /**
     * 清除所有持久化数据
     */
    clearStorage() {
        localStorage.removeItem('lam_app_state');
    }
    
    /**
     * 重置所有状态到初始值
     */
    reset() {
        this._state = {
            app: { currentPage: 'main', hasUnsavedChanges: false, isInitialized: false },
            game: { selectedSinner: null, selectedPersona: null, isScrolling: false, easterEggTriggered: null },
            filters: { sinners: {}, personalities: {} },
            settings: { personality: new Map(), theme: 'dark', language: 'zh-cn' },
            timer: { isRunning: false, elapsedSeconds: 0, totalSeconds: 0, startTime: null, pausedTime: null },
            ranking: { localRecords: [], globalRecords: [], lastUpdateTime: null }
        };
        
        this._notifyListeners('_all', this._state, null, 'state:reset');
    }
    
    /**
     * 获取状态统计信息（调试用）
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            selectedSinner: !!this._state.game.selectedSinner,
            selectedPersona: !!this._state.game.selectedPersona,
            enabledSinners: this._state.filters.sinner.size,
            localRecords: this._state.ranking.localRecords.length,
            listenerCount: this._listeners.length,
            storageSize: JSON.stringify(this._state).length
        };
    }
}

// 创建并导出单例
export const appState = new AppState();

// 也导出类本身，用于测试
export default appState;
