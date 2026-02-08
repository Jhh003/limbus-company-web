/**
 * 应用事件总线（EventBus/EventEmitter）
 * 
 * 负责应用模块间的通信，遵循发布-订阅模式。
 * 解耦不同的功能模块，使它们可以独立发展和测试。
 * 
 * 特点：
 * - 发布-订阅模式（Pub-Sub）
 * - 支持事件优先级
 * - 内置错误处理
 * - 支持一次性订阅（once）
 * - 事件中间件支持
 * 
 * @module eventBus
 */

/**
 * 应用事件常量
 * 使用常量而不是字符串，避免拼写错误
 */
export const GameEvents = {
    // 应用生命周期事件
    APP_INITIALIZED: 'app:initialized',
    APP_READY: 'app:ready',
    PAGE_CHANGED: 'app:page-changed',
    
    // 滚动系统事件
    SCROLL_START: 'scroll:start',
    SCROLL_STOP: 'scroll:stop',
    SINNER_SELECTED: 'sinner:selected',
    PERSONA_SELECTED: 'persona:selected',
    
    // 过滤器事件
    FILTER_CHANGED: 'filter:changed',
    SINNER_FILTER_CHANGED: 'filter:sinner-changed',
    PERSONA_FILTER_CHANGED: 'filter:persona-changed',
    
    // 设置事件
    SETTINGS_CHANGED: 'settings:changed',
    PERSONALITY_TOGGLED: 'settings:personality-toggled',
    PERSONALITY_SAVED: 'settings:personality-saved',
    
    // 计时器事件
    TIMER_START: 'timer:start',
    TIMER_STOP: 'timer:stop',
    TIMER_TICK: 'timer:tick',
    TIMER_RESET: 'timer:reset',
    TIMER_PAUSED: 'timer:paused',
    TIMER_RESUMED: 'timer:resumed',
    
    // 排行榜事件
    RANKING_LOADED: 'ranking:loaded',
    RANKING_UPDATED: 'ranking:updated',
    RECORD_SUBMITTED: 'ranking:record-submitted',
    LOCAL_RECORD_SAVED: 'ranking:local-record-saved',
    
    // 彩蛋事件
    EASTER_EGG_TRIGGERED: 'game:easter-egg-triggered',
    VIDEO_PLAY: 'media:video-play',
    VIDEO_ENDED: 'media:video-ended',
    
    // 模态框事件
    MODAL_OPEN: 'modal:open',
    MODAL_CLOSE: 'modal:close',
    
    // 错误事件
    ERROR: 'error:occurred'
};

/**
 * 事件总线类
 * 实现发布-订阅模式的事件系统
 */
class EventBus {
    constructor() {
        // 事件映射: eventName -> Array<{handler, priority, id}>
        this.events = {};
        
        // 中间件数组
        this.middlewares = [];
        
        // 错误处理器
        this.errorHandler = null;
        
        // 调试模式
        this.debug = false;
        
        // 事件历史（调试用）
        this.eventHistory = [];
        this.maxHistorySize = 100;
    }
    
    /**
     * 订阅事件
     * @param {string} eventName - 事件名称（使用GameEvents常量）
     * @param {Function} handler - 事件处理器函数
     * @param {number} priority - 优先级（数字越大，执行越早）
     * @returns {Function} 取消订阅函数
     * 
     * @example
     * const unsubscribe = bus.subscribe(GameEvents.SINNER_SELECTED, (sinner) => {
     *   console.log('罪人被选择:', sinner)
     * }, 10)  // 优先级10
     * 
     * // 取消订阅
     * unsubscribe()
     */
    subscribe(eventName, handler, priority = 0) {
        // 参数验证
        if (typeof eventName !== 'string' || eventName.trim() === '') {
            throw new Error('Event name must be a non-empty string');
        }
        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }
        if (typeof priority !== 'number') {
            throw new Error('Priority must be a number');
        }
        
        // 初始化事件数组
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        
        // 创建订阅者对象
        const subscriber = {
            id: this._generateId(),
            handler,
            priority,
            once: false,
            createdAt: Date.now()
        };
        
        // 添加到事件列表
        this.events[eventName].push(subscriber);
        
        // 按优先级排序（优先级高的排在前面）
        this.events[eventName].sort((a, b) => b.priority - a.priority);
        
        if (this.debug) {
            console.log(`[EventBus] Subscribed to "${eventName}" with priority ${priority}`);
        }
        
        // 返回取消订阅函数
        return () => this.unsubscribe(eventName, subscriber.id);
    }
    
    /**
     * 一次性订阅事件
     * 事件触发一次后自动取消订阅
     * @param {string} eventName - 事件名称
     * @param {Function} handler - 事件处理器函数
     * @param {number} priority - 优先级
     * @returns {Function} 取消订阅函数
     * 
     * @example
     * bus.once(GameEvents.APP_INITIALIZED, () => {
     *   console.log('应用初始化完成')
     * })
     */
    once(eventName, handler, priority = 0) {
        const unsubscribe = this.subscribe(eventName, handler, priority);
        
        // 找到刚才添加的订阅者，标记为once
        if (this.events[eventName]) {
            const subscriber = this.events[eventName].find(s => s.handler === handler);
            if (subscriber) {
                subscriber.once = true;
            }
        }
        
        return unsubscribe;
    }
    
    /**
     * 取消订阅事件
     * @param {string} eventName - 事件名称
     * @param {string} subscriberId - 订阅者ID（subscribe返回的取消函数使用）
     * @private
     */
    unsubscribe(eventName, subscriberId) {
        if (!this.events[eventName]) return;
        
        const initialLength = this.events[eventName].length;
        this.events[eventName] = this.events[eventName].filter(
            sub => sub.id !== subscriberId
        );
        
        if (this.debug && this.events[eventName].length < initialLength) {
            console.log(`[EventBus] Unsubscribed from "${eventName}"`);
        }
        
        // 如果没有订阅者了，删除事件
        if (this.events[eventName].length === 0) {
            delete this.events[eventName];
        }
    }
    
    /**
     * 发布事件
     * @param {string} eventName - 事件名称
     * @param {*} data - 事件数据（可以是任何类型）
     * 
     * @example
     * bus.emit(GameEvents.SINNER_SELECTED, {
     *   id: 1,
     *   name: '断头台'
     * })
     */
    emit(eventName, data) {
        // 参数验证
        if (typeof eventName !== 'string' || eventName.trim() === '') {
            throw new Error('Event name must be a non-empty string');
        }
        
        if (this.debug) {
            console.log(`[EventBus] Emitting "${eventName}" with data:`, data);
        }
        
        // 记录事件历史（调试用）
        this._recordHistory(eventName, data);
        
        // 应用中间件
        let processedData = data;
        for (const middleware of this.middlewares) {
            try {
                const result = middleware(eventName, processedData);
                processedData = result ?? processedData;
            } catch (error) {
                this._handleError('Middleware error', error, eventName);
            }
        }
        
        // 如果没有订阅者，直接返回
        if (!this.events[eventName]) {
            if (this.debug) {
                console.log(`[EventBus] No subscribers for "${eventName}"`);
            }
            return;
        }
        
        // 执行所有订阅者的处理器
        // 创建副本，以支持在处理器中取消订阅
        const subscribers = [...this.events[eventName]];
        
        for (const subscriber of subscribers) {
            try {
                // 执行处理器
                subscriber.handler(processedData);
                
                // 如果是once订阅，自动取消
                if (subscriber.once) {
                    this.unsubscribe(eventName, subscriber.id);
                }
            } catch (error) {
                this._handleError(`Error in handler for "${eventName}"`, error, eventName, processedData);
            }
        }
    }
    
    /**
     * 发布异步事件
     * 等待所有订阅者处理完成后才返回
     * @param {string} eventName - 事件名称
     * @param {*} data - 事件数据
     * @returns {Promise<void>}
     * 
     * @example
     * await bus.emitAsync(GameEvents.RECORD_SUBMITTED, record)
     */
    async emitAsync(eventName, data) {
        if (!this.events[eventName]) return;
        
        const subscribers = [...this.events[eventName]];
        const promises = [];
        
        for (const subscriber of subscribers) {
            try {
                const result = subscriber.handler(data);
                if (result instanceof Promise) {
                    promises.push(result);
                }
            } catch (error) {
                this._handleError(`Error in handler for "${eventName}"`, error, eventName, data);
            }
        }
        
        await Promise.all(promises);
    }
    
    /**
     * 添加中间件
     * 中间件可以在事件发布前修改数据
     * @param {Function} middlewareFn - 中间件函数，签名: (eventName, data) => data
     * @returns {Function} 移除中间件函数
     * 
     * @example
     * bus.use((eventName, data) => {
     *   console.log(`Event: ${eventName}`)
     *   return data  // 返回修改后的数据或原数据
     * })
     */
    use(middlewareFn) {
        if (typeof middlewareFn !== 'function') {
            throw new Error('Middleware must be a function');
        }
        
        this.middlewares.push(middlewareFn);
        
        return () => {
            const index = this.middlewares.indexOf(middlewareFn);
            if (index > -1) {
                this.middlewares.splice(index, 1);
            }
        };
    }
    
    /**
     * 设置错误处理器
     * @param {Function} handler - 错误处理函数
     * 
     * @example
     * bus.onError((error, eventName, data) => {
     *   console.error(`Error in ${eventName}:`, error)
     *   // 可以上报到错误跟踪系统
     * })
     */
    onError(handler) {
        if (typeof handler !== 'function') {
            throw new Error('Error handler must be a function');
        }
        this.errorHandler = handler;
    }
    
    /**
     * 获取特定事件的订阅者数量
     * @param {string} eventName - 事件名称
     * @returns {number} 订阅者数量
     */
    listenerCount(eventName) {
        return this.events[eventName]?.length ?? 0;
    }
    
    /**
     * 获取所有已注册的事件名称
     * @returns {Array<string>} 事件名称数组
     */
    eventNames() {
        return Object.keys(this.events);
    }
    
    /**
     * 获取某个事件的所有订阅者
     * @param {string} eventName - 事件名称
     * @returns {Array} 订阅者信息数组
     */
    listeners(eventName) {
        if (!this.events[eventName]) return [];
        
        return this.events[eventName].map(sub => ({
            id: sub.id,
            priority: sub.priority,
            once: sub.once,
            createdAt: sub.createdAt
        }));
    }
    
    /**
     * 移除某个事件的所有订阅者
     * @param {string} eventName - 事件名称
     */
    removeAllListeners(eventName) {
        if (eventName) {
            delete this.events[eventName];
        } else {
            this.events = {};
        }
    }
    
    /**
     * 启用调试模式
     */
    enableDebug() {
        this.debug = true;
        console.log('[EventBus] Debug mode enabled');
    }
    
    /**
     * 禁用调试模式
     */
    disableDebug() {
        this.debug = false;
    }
    
    /**
     * 获取事件历史（最后N个事件）
     * @param {number} limit - 返回最近的N个事件
     * @returns {Array} 事件历史数组
     */
    getEventHistory(limit = 20) {
        return this.eventHistory.slice(-limit);
    }
    
    /**
     * 清除事件历史
     */
    clearEventHistory() {
        this.eventHistory = [];
    }
    
    /**
     * 获取事件总线的统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const eventCount = Object.keys(this.events).length;
        const totalListeners = Object.values(this.events).reduce(
            (sum, listeners) => sum + listeners.length,
            0
        );
        
        return {
            eventCount,
            totalListeners,
            middlewareCount: this.middlewares.length,
            eventHistory: this.eventHistory.length
        };
    }
    
    // ========== 私有方法 ==========
    
    /**
     * 生成唯一ID
     * @private
     */
    _generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 处理错误
     * @private
     */
    _handleError(message, error, eventName, data) {
        const errorInfo = {
            message,
            error,
            eventName,
            data,
            timestamp: Date.now()
        };
        
        console.error(`[EventBus Error] ${message}`, error);
        
        if (this.errorHandler) {
            try {
                this.errorHandler(errorInfo);
            } catch (err) {
                console.error('[EventBus] Error handler failed:', err);
            }
        }
    }
    
    /**
     * 记录事件历史
     * @private
     */
    _recordHistory(eventName, data) {
        let serializedData = 'undefined';
        try {
            if (data !== undefined) {
                const jsonData = JSON.stringify(data);
                serializedData = jsonData === undefined ? 'undefined' : jsonData;
            }
        } catch (error) {
            serializedData = '[unserializable]';
        }

        this.eventHistory.push({
            eventName,
            data: serializedData.substring(0, 100), // 截断长数据
            timestamp: Date.now()
        });
        
        // 限制历史大小
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }
}

// 创建并导出单例
export const eventBus = new EventBus();

// 也导出类本身，用于测试
export default eventBus;
