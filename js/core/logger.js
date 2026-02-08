/**
 * 应用日志系统
 * 
 * 用于调试和监控应用运行状态。
 * 支持不同的日志级别和输出方式。
 * 
 * 特点：
 * - 多个日志级别（DEBUG, INFO, WARN, ERROR）
 * - 时间戳和堆栈跟踪
 * - 本地存储日志
 * - 支持日志导出
 * 
 * @module logger
 */

/**
 * 日志级别常量
 */
export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

/**
 * 日志系统类
 */
class Logger {
    constructor(options = {}) {
        this.level = options.level ?? LogLevel.INFO;
        this.maxLogs = options.maxLogs ?? 500;
        this.storageKey = options.storageKey ?? 'lam_logs';
        this.useStorage = options.useStorage ?? true;
        this.useConsole = options.useConsole ?? true;
        
        // 日志缓存
        this.logs = [];
        this._saveTimeout = null;
        
        // 加载之前的日志
        if (this.useStorage) {
            this._loadLogs();
        }
    }
    
    /**
     * 调试级别日志
     * @param {string} message - 日志消息
     * @param {*} data - 关联数据（可选）
     */
    debug(message, data) {
        this._log(LogLevel.DEBUG, message, data);
    }
    
    /**
     * 信息级别日志
     * @param {string} message - 日志消息
     * @param {*} data - 关联数据（可选）
     */
    info(message, data) {
        this._log(LogLevel.INFO, message, data);
    }
    
    /**
     * 警告级别日志
     * @param {string} message - 日志消息
     * @param {*} data - 关联数据（可选）
     */
    warn(message, data) {
        this._log(LogLevel.WARN, message, data);
    }
    
    /**
     * 错误级别日志
     * @param {string} message - 日志消息
     * @param {Error} error - 错误对象（可选）
     */
    error(message, error) {
        const data = error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
        } : error;
        
        this._log(LogLevel.ERROR, message, data);
    }
    
    /**
     * 记录一组操作的耗时
     * @param {string} label - 操作标签
     * @returns {Function} 调用此函数来结束计时并记录
     * 
     * @example
     * const timer = logger.time('API Call')
     * // 执行操作...
     * timer()  // 记录耗时
     */
    time(label) {
        const startTime = performance.now();
        
        return () => {
            const duration = performance.now() - startTime;
            this.info(`[${label}] 耗时: ${duration.toFixed(2)}ms`);
        };
    }
    
    /**
     * 获取所有日志
     * @returns {Array} 日志数组
     */
    getLogs() {
        return [...this.logs];
    }
    
    /**
     * 清除所有日志
     */
    clear() {
        this.logs = [];
        this._saveLogs();
    }
    
    /**
     * 按级别过滤日志
     * @param {number} level - 日志级别
     * @returns {Array} 过滤后的日志数组
     */
    getLogsByLevel(level) {
        return this.logs.filter(log => log.level === level);
    }
    
    /**
     * 按消息模式过滤日志
     * @param {string|RegExp} pattern - 匹配模式
     * @returns {Array} 过滤后的日志数组
     */
    getLogsByPattern(pattern) {
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
        return this.logs.filter(log => regex.test(log.message));
    }
    
    /**
     * 导出日志为JSON字符串
     * @returns {string} JSON字符串
     */
    exportAsJSON() {
        return JSON.stringify(this.logs, null, 2);
    }
    
    /**
     * 导出日志为CSV字符串
     * @returns {string} CSV字符串
     */
    exportAsCSV() {
        const headers = ['Timestamp', 'Level', 'Message', 'Data'];
        const rows = this.logs.map(log => [
            new Date(log.timestamp).toISOString(),
            this._getLevelName(log.level),
            log.message,
            typeof log.data === 'object' ? JSON.stringify(log.data) : log.data
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        return csvContent;
    }
    
    /**
     * 下载日志文件
     * @param {string} format - 格式: 'json' 或 'csv'
     */
    downloadLogs(format = 'json') {
        const content = format === 'json' ? this.exportAsJSON() : this.exportAsCSV();
        const extension = format === 'json' ? 'json' : 'csv';
        const filename = `lam-logs-${new Date().toISOString()}.${extension}`;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    /**
     * 设置日志级别
     * @param {number} level - 日志级别
     */
    setLevel(level) {
        if (!(level in LogLevel)) {
            throw new Error('Invalid log level');
        }
        this.level = level;
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const stats = {
            total: this.logs.length,
            byLevel: {}
        };
        
        for (const [name, level] of Object.entries(LogLevel)) {
            if (typeof level === 'number') {
                stats.byLevel[name] = this.logs.filter(l => l.level === level).length;
            }
        }
        
        return stats;
    }
    
    // ========== 私有方法 ==========
    
    /**
     * 内部日志记录方法
     * @private
     */
    _log(level, message, data) {
        // 检查是否应该记录此级别
        if (level < this.level) return;
        
        const log = {
            timestamp: Date.now(),
            level,
            levelName: this._getLevelName(level),
            message,
            data
        };
        
        // 添加到内存
        this.logs.push(log);
        
        // 限制日志大小
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // 输出到控制台
        if (this.useConsole) {
            this._logToConsole(log);
        }
        
        // 保存到存储
        if (this.useStorage && this.logs.length % 10 === 0) {
            this._saveLogs();
        }
    }
    
    /**
     * 输出到浏览器控制台
     * @private
     */
    _logToConsole(log) {
        const prefix = `[LAM] [${log.levelName}] ${new Date(log.timestamp).toLocaleTimeString()}`;
        
        const style = this._getConsoleStyle(log.level);
        
        if (log.data !== undefined) {
            console.log(`%c${prefix}`, style, log.message, log.data);
        } else {
            console.log(`%c${prefix}`, style, log.message);
        }
    }
    
    /**
     * 获取控制台样式
     * @private
     */
    _getConsoleStyle(level) {
        const styles = {
            [LogLevel.DEBUG]: 'color: #999; font-size: 12px;',
            [LogLevel.INFO]: 'color: #0066cc; font-size: 12px;',
            [LogLevel.WARN]: 'color: #ff9900; font-size: 12px; font-weight: bold;',
            [LogLevel.ERROR]: 'color: #cc0000; font-size: 12px; font-weight: bold;'
        };
        return styles[level] || '';
    }
    
    /**
     * 获取日志级别名称
     * @private
     */
    _getLevelName(level) {
        const names = {
            [LogLevel.DEBUG]: 'DEBUG',
            [LogLevel.INFO]: 'INFO',
            [LogLevel.WARN]: 'WARN',
            [LogLevel.ERROR]: 'ERROR'
        };
        return names[level] || 'UNKNOWN';
    }
    
    /**
     * 保存日志到localStorage
     * @private
     */
    _saveLogs() {
        if (this._saveTimeout) clearTimeout(this._saveTimeout);
        
        // 使用 requestIdleCallback 或 setTimeout 进行防抖
        const schedule = window.requestIdleCallback || setTimeout;
        
        this._saveTimeout = schedule(() => {
            try {
                // 只保存最近的100条日志
                const logsToSave = this.logs.slice(-100);
                localStorage.setItem(this.storageKey, JSON.stringify(logsToSave));
                this._saveTimeout = null;
            } catch (error) {
                // 忽略存储错误（可能超出限制）
                console.warn('Failed to save logs:', error);
            }
        }, 1000);
    }
    
    /**
     * 从localStorage加载日志
     * @private
     */
    _loadLogs() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.logs = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load logs:', error);
        }
    }
}

// 创建并导出单例
export const logger = new Logger({
    level: LogLevel.DEBUG,
    useStorage: true,
    useConsole: true
});

// 也导出类本身，用于创建多个实例
export default Logger;
