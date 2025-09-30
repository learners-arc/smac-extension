/**
 * Logger Utility - Comprehensive logging system for the Chrome Extension
 * Provides structured logging, error tracking, performance monitoring, and debug tools
 * 
 * Features:
 * - Multi-level logging (DEBUG, INFO, WARN, ERROR)
 * - Structured log entries with metadata
 * - Performance tracking and analytics
 * - Real-time log viewing and filtering
 * - Export capabilities for debugging
 * - Memory-efficient log rotation
 * - Platform-specific logging contexts
 */

import { CONFIG } from '../config.js';

class Logger {
    constructor() {
        this.isDebugMode = false;
        this.logBuffer = [];
        this.maxBufferSize = 1000;
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();

        // Log levels with priorities
        this.levels = {
            DEBUG: { priority: 0, color: '#6b7280', icon: '🔍' },
            INFO: { priority: 1, color: '#3b82f6', icon: 'ℹ️' },
            WARN: { priority: 2, color: '#f59e0b', icon: '⚠️' },
            ERROR: { priority: 3, color: '#ef4444', icon: '❌' }
        };

        // Performance tracking
        this.performanceMetrics = {
            apiCalls: [],
            domOperations: [],
            commentGeneration: [],
            pageLoads: []
        };

        // Error tracking
        this.errorPatterns = new Map();
        this.errorCounts = new Map();

        this.initialize();
    }

    /**
     * Initialize logger with settings and listeners
     */
    async initialize() {
        try {
            // Load debug mode setting
            const settings = await this.getStorageData('settings');
            this.isDebugMode = settings?.debugMode || false;

            // Listen for storage changes
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.onChanged.addListener((changes) => {
                    if (changes.settings?.newValue?.debugMode !== undefined) {
                        this.isDebugMode = changes.settings.newValue.debugMode;
                        this.info('Debug mode changed:', this.isDebugMode);
                    }
                });
            }

            this.info('Logger initialized', { sessionId: this.sessionId });
        } catch (error) {
            console.error('[Logger] Initialization failed:', error);
        }
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get data from Chrome storage
     */
    async getStorageData(key) {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get([key]);
                return result[key];
            }
            return null;
        } catch (error) {
            console.error(`[Logger] Storage get failed for ${key}:`, error);
            return null;
        }
    }

    /**
     * Set data to Chrome storage
     */
    async setStorageData(key, value) {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ [key]: value });
            }
        } catch (error) {
            console.error(`[Logger] Storage set failed for ${key}:`, error);
        }
    }

    /**
     * Create structured log entry
     */
    createLogEntry(level, message, context = {}) {
        const timestamp = Date.now();
        const levelInfo = this.levels[level] || this.levels.INFO;

        return {
            id: `log_${timestamp}_${Math.random().toString(36).substr(2, 5)}`,
            timestamp,
            sessionId: this.sessionId,
            level,
            priority: levelInfo.priority,
            message,
            context: {
                platform: context.platform || null,
                component: context.component || 'unknown',
                operation: context.operation || null,
                url: context.url || (typeof window !== 'undefined' ? window.location.href : null),
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
                ...context
            },
            stackTrace: level === 'ERROR' ? new Error().stack : null
        };
    }

    /**
     * Log debug message (only in debug mode)
     */
    debug(message, context = {}) {
        if (this.isDebugMode) {
            this.log('DEBUG', message, context);
        }
    }

    /**
     * Log info message
     */
    info(message, context = {}) {
        this.log('INFO', message, context);
    }

    /**
     * Log warning message
     */
    warn(message, context = {}) {
        this.log('WARN', message, context);
    }

    /**
     * Log error message
     */
    error(message, context = {}) {
        this.log('ERROR', message, context);
        this.trackError(message, context);
    }

    /**
     * Core logging method
     */
    async log(level, message, context = {}) {
        const logEntry = this.createLogEntry(level, message, context);

        // Add to buffer
        this.logBuffer.push(logEntry);
        this.rotateBuffer();

        // Console output with styling
        this.outputToConsole(logEntry);

        // Store in Chrome storage for persistence
        await this.persistLog(logEntry);

        // Real-time broadcasting for log viewers
        this.broadcastLog(logEntry);
    }

    /**
     * Rotate log buffer to prevent memory issues
     */
    rotateBuffer() {
        if (this.logBuffer.length > this.maxBufferSize) {
            const removeCount = Math.floor(this.maxBufferSize * 0.2); // Remove 20%
            this.logBuffer.splice(0, removeCount);
        }
    }

    /**
     * Output styled log to console
     */
    outputToConsole(logEntry) {
        const levelInfo = this.levels[logEntry.level];
        const timeStr = new Date(logEntry.timestamp).toLocaleTimeString();

        const style = `color: ${levelInfo.color}; font-weight: bold;`;
        const contextStr = Object.keys(logEntry.context).length > 0
            ? JSON.stringify(logEntry.context, null, 2)
            : '';

        console.log(
            `%c[${timeStr}] ${levelInfo.icon} ${logEntry.level}`,
            style,
            logEntry.message,
            contextStr
        );

        if (logEntry.stackTrace && logEntry.level === 'ERROR') {
            console.trace(logEntry.stackTrace);
        }
    }

    /**
     * Persist log entry to storage
     */
    async persistLog(logEntry) {
        try {
            const logs = await this.getStorageData('logs') || [];
            logs.push(logEntry);

            // Keep only recent logs
            const maxLogs = 500;
            if (logs.length > maxLogs) {
                logs.splice(0, logs.length - maxLogs);
            }

            await this.setStorageData('logs', logs);
        } catch (error) {
            console.error('[Logger] Failed to persist log:', error);
        }
    }

    /**
     * Broadcast log entry for real-time viewers
     */
    broadcastLog(logEntry) {
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.sendMessage({
                    type: 'LOG_ENTRY',
                    data: logEntry
                }).catch(() => {
                    // Ignore errors if no listeners
                });
            }
        } catch (error) {
            // Ignore broadcast errors
        }
    }

    /**
     * Track error patterns for analysis
     */
    trackError(message, context = {}) {
        const errorKey = this.generateErrorKey(message, context);

        // Count occurrences
        const count = this.errorCounts.get(errorKey) || 0;
        this.errorCounts.set(errorKey, count + 1);

        // Store pattern info
        if (!this.errorPatterns.has(errorKey)) {
            this.errorPatterns.set(errorKey, {
                message,
                context,
                firstSeen: Date.now(),
                count: 1
            });
        } else {
            const pattern = this.errorPatterns.get(errorKey);
            pattern.count = count + 1;
            pattern.lastSeen = Date.now();
        }
    }

    /**
     * Generate error key for pattern tracking
     */
    generateErrorKey(message, context) {
        const platformKey = context.platform || 'general';
        const componentKey = context.component || 'unknown';
        const operationKey = context.operation || 'unknown';

        return `${platformKey}:${componentKey}:${operationKey}:${message.substring(0, 50)}`;
    }

    /**
     * Performance tracking for API calls
     */
    trackApiCall(operation, duration, success, metadata = {}) {
        const entry = {
            timestamp: Date.now(),
            operation,
            duration,
            success,
            metadata
        };

        this.performanceMetrics.apiCalls.push(entry);

        // Keep only recent entries
        if (this.performanceMetrics.apiCalls.length > 100) {
            this.performanceMetrics.apiCalls.shift();
        }

        this.debug('API call tracked', { operation, duration, success });
    }

    /**
     * Performance tracking for DOM operations
     */
    trackDomOperation(operation, duration, elementCount, metadata = {}) {
        const entry = {
            timestamp: Date.now(),
            operation,
            duration,
            elementCount,
            metadata
        };

        this.performanceMetrics.domOperations.push(entry);

        // Keep only recent entries
        if (this.performanceMetrics.domOperations.length > 100) {
            this.performanceMetrics.domOperations.shift();
        }

        this.debug('DOM operation tracked', { operation, duration, elementCount });
    }

    /**
     * Performance tracking for comment generation
     */
    trackCommentGeneration(platform, duration, success, metadata = {}) {
        const entry = {
            timestamp: Date.now(),
            platform,
            duration,
            success,
            metadata
        };

        this.performanceMetrics.commentGeneration.push(entry);

        // Keep only recent entries
        if (this.performanceMetrics.commentGeneration.length > 100) {
            this.performanceMetrics.commentGeneration.shift();
        }

        this.debug('Comment generation tracked', { platform, duration, success });
    }

    /**
     * Get logs with filtering options
     */
    async getLogs(options = {}) {
        try {
            const {
                level = null,
                platform = null,
                component = null,
                limit = 100,
                since = null,
                search = null
            } = options;

            let logs = await this.getStorageData('logs') || [];

            // Apply filters
            if (level) {
                const levelPriority = this.levels[level]?.priority;
                if (levelPriority !== undefined) {
                    logs = logs.filter(log => log.priority >= levelPriority);
                }
            }

            if (platform) {
                logs = logs.filter(log => log.context.platform === platform);
            }

            if (component) {
                logs = logs.filter(log => log.context.component === component);
            }

            if (since) {
                logs = logs.filter(log => log.timestamp >= since);
            }

            if (search) {
                const searchLower = search.toLowerCase();
                logs = logs.filter(log =>
                    log.message.toLowerCase().includes(searchLower) ||
                    JSON.stringify(log.context).toLowerCase().includes(searchLower)
                );
            }

            // Sort by timestamp (newest first) and limit
            logs.sort((a, b) => b.timestamp - a.timestamp);
            return logs.slice(0, limit);

        } catch (error) {
            console.error('[Logger] Failed to get logs:', error);
            return [];
        }
    }

    /**
     * Get performance analytics
     */
    getPerformanceAnalytics() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        const analytics = {
            sessionDuration: now - this.startTime,
            apiCalls: this.analyzeApiCalls(),
            domOperations: this.analyzeDomOperations(),
            commentGeneration: this.analyzeCommentGeneration(),
            errorSummary: this.getErrorSummary()
        };

        return analytics;
    }

    /**
     * Analyze API call performance
     */
    analyzeApiCalls() {
        const calls = this.performanceMetrics.apiCalls;
        if (calls.length === 0) return null;

        const successful = calls.filter(c => c.success);
        const failed = calls.filter(c => !c.success);
        const durations = calls.map(c => c.duration);

        return {
            total: calls.length,
            successful: successful.length,
            failed: failed.length,
            successRate: (successful.length / calls.length * 100).toFixed(1),
            avgDuration: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0),
            maxDuration: Math.max(...durations),
            minDuration: Math.min(...durations)
        };
    }

    /**
     * Analyze DOM operation performance
     */
    analyzeDomOperations() {
        const operations = this.performanceMetrics.domOperations;
        if (operations.length === 0) return null;

        const durations = operations.map(o => o.duration);
        const elements = operations.map(o => o.elementCount);

        return {
            total: operations.length,
            avgDuration: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0),
            maxDuration: Math.max(...durations),
            avgElements: (elements.reduce((a, b) => a + b, 0) / elements.length).toFixed(1)
        };
    }

    /**
     * Analyze comment generation performance
     */
    analyzeCommentGeneration() {
        const generations = this.performanceMetrics.commentGeneration;
        if (generations.length === 0) return null;

        const successful = generations.filter(g => g.success);
        const failed = generations.filter(g => !g.success);
        const durations = generations.map(g => g.duration);

        const byPlatform = {};
        generations.forEach(g => {
            if (!byPlatform[g.platform]) {
                byPlatform[g.platform] = { count: 0, successful: 0 };
            }
            byPlatform[g.platform].count++;
            if (g.success) byPlatform[g.platform].successful++;
        });

        return {
            total: generations.length,
            successful: successful.length,
            failed: failed.length,
            successRate: (successful.length / generations.length * 100).toFixed(1),
            avgDuration: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0),
            byPlatform
        };
    }

    /**
     * Get error summary
     */
    getErrorSummary() {
        const topErrors = Array.from(this.errorPatterns.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([key, pattern]) => ({
                message: pattern.message,
                count: pattern.count,
                firstSeen: pattern.firstSeen,
                lastSeen: pattern.lastSeen
            }));

        return {
            totalUniqueErrors: this.errorPatterns.size,
            totalErrorCount: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0),
            topErrors
        };
    }

    /**
     * Export logs for debugging
     */
    async exportLogs(format = 'json') {
        try {
            const logs = await this.getLogs({ limit: 1000 });
            const analytics = this.getPerformanceAnalytics();

            const exportData = {
                exportTime: Date.now(),
                sessionId: this.sessionId,
                analytics,
                logs
            };

            if (format === 'json') {
                return JSON.stringify(exportData, null, 2);
            } else if (format === 'csv') {
                return this.convertLogsToCSV(logs);
            }

            return exportData;
        } catch (error) {
            this.error('Failed to export logs', { error: error.message });
            throw error;
        }
    }

    /**
     * Convert logs to CSV format
     */
    convertLogsToCSV(logs) {
        const headers = ['timestamp', 'level', 'message', 'platform', 'component', 'operation'];
        const rows = logs.map(log => [
            new Date(log.timestamp).toISOString(),
            log.level,
            `"${log.message.replace(/"/g, '""')}"`,
            log.context.platform || '',
            log.context.component || '',
            log.context.operation || ''
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    /**
     * Clear all logs
     */
    async clearLogs() {
        try {
            this.logBuffer = [];
            this.errorPatterns.clear();
            this.errorCounts.clear();
            this.performanceMetrics = {
                apiCalls: [],
                domOperations: [],
                commentGeneration: [],
                pageLoads: []
            };

            await this.setStorageData('logs', []);
            this.info('All logs cleared');
        } catch (error) {
            console.error('[Logger] Failed to clear logs:', error);
        }
    }

    /**
     * Set debug mode
     */
    async setDebugMode(enabled) {
        this.isDebugMode = enabled;
        const settings = await this.getStorageData('settings') || {};
        settings.debugMode = enabled;
        await this.setStorageData('settings', settings);

        this.info('Debug mode changed', { enabled });
    }

    /**
     * Create performance timer
     */
    createTimer(operation) {
        const startTime = performance.now();

        return {
            end: () => {
                const duration = performance.now() - startTime;
                this.debug('Operation completed', { operation, duration: Math.round(duration) });
                return duration;
            }
        };
    }

    /**
     * Log method entry (for debugging)
     */
    logMethodEntry(className, methodName, args = {}) {
        if (this.isDebugMode) {
            this.debug(`Entering ${className}.${methodName}`, {
                component: className,
                operation: methodName,
                args
            });
        }
    }

    /**
     * Log method exit (for debugging)
     */
    logMethodExit(className, methodName, result = null) {
        if (this.isDebugMode) {
            this.debug(`Exiting ${className}.${methodName}`, {
                component: className,
                operation: methodName,
                result: result ? 'success' : 'no result'
            });
        }
    }
}

// Create singleton instance
const logger = new Logger();

// Export both class and instance
export { Logger, logger };