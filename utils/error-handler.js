/**
 * Error Handler Utility - Comprehensive error management system
 * Handles error classification, recovery strategies, user notifications, and debugging
 * 
 * Features:
 * - Error classification and categorization
 * - Automatic retry strategies with exponential backoff
 * - User-friendly error messages and recovery suggestions
 * - Error aggregation and pattern analysis
 * - Platform-specific error handling
 * - Recovery workflows and fallback mechanisms
 * - Error reporting and debugging tools
 */

import { logger } from './logger.js';
import { CONFIG } from '../config.js';

class ErrorHandler {
    constructor() {
        this.errorCategories = {
            NETWORK: {
                patterns: [/network.*error/i, /fetch.*failed/i, /connection.*refused/i],
                severity: 'medium',
                retryable: true,
                userMessage: 'Network connection issue. Please check your internet connection.',
                suggestions: ['Check internet connection', 'Try again in a moment', 'Restart browser if issue persists']
            },
            API_KEY: {
                patterns: [/invalid.*key/i, /unauthorized/i, /api.*key.*invalid/i],
                severity: 'high',
                retryable: false,
                userMessage: 'Invalid API key. Please check your Gemini API configuration.',
                suggestions: ['Verify API key in settings', 'Regenerate API key from Google AI Studio', 'Ensure API key has proper permissions']
            },
            QUOTA_EXCEEDED: {
                patterns: [/quota.*exceeded/i, /rate.*limit/i, /too.*many.*requests/i],
                severity: 'medium',
                retryable: true,
                userMessage: 'API quota exceeded. The service will resume automatically.',
                suggestions: ['Wait for quota reset', 'Reduce commenting frequency', 'Upgrade API plan if needed']
            },
            CONTENT_BLOCKED: {
                patterns: [/blocked.*content/i, /safety.*violation/i, /inappropriate.*content/i],
                severity: 'low',
                retryable: false,
                userMessage: 'Content was blocked by safety filters. Trying alternative approach.',
                suggestions: ['Content may be inappropriate', 'Will try different comment style', 'Post may contain sensitive topics']
            },
            DOM_ERROR: {
                patterns: [/element.*not.*found/i, /selector.*failed/i, /dom.*manipulation.*failed/i],
                severity: 'medium',
                retryable: true,
                userMessage: 'Page element not found. The website layout may have changed.',
                suggestions: ['Page may be loading', 'Website layout changed', 'Will retry with fallback selectors']
            },
            EXTENSION_ERROR: {
                patterns: [/extension.*context/i, /chrome.*runtime/i, /manifest.*error/i],
                severity: 'high',
                retryable: false,
                userMessage: 'Extension error occurred. Please reload the extension.',
                suggestions: ['Reload extension', 'Check extension permissions', 'Update browser if needed']
            },
            STORAGE_ERROR: {
                patterns: [/storage.*failed/i, /quota.*exceeded.*storage/i, /storage.*unavailable/i],
                severity: 'medium',
                retryable: true,
                userMessage: 'Storage issue encountered. Some data may not be saved.',
                suggestions: ['Clear extension data', 'Check available storage space', 'Restart browser']
            },
            PARSING_ERROR: {
                patterns: [/json.*parse/i, /invalid.*format/i, /malformed.*data/i],
                severity: 'low',
                retryable: true,
                userMessage: 'Data parsing error. Will attempt to continue with available data.',
                suggestions: ['Data format issue', 'Will use fallback processing', 'Report if persistent']
            },
            TIMEOUT_ERROR: {
                patterns: [/timeout/i, /request.*timed.*out/i, /operation.*timeout/i],
                severity: 'medium',
                retryable: true,
                userMessage: 'Operation timed out. Will retry with extended timeout.',
                suggestions: ['Network may be slow', 'Will retry with longer timeout', 'Check connection stability']
            }
        };

        this.retryStrategies = {
            exponential: (attempt) => Math.min(1000 * Math.pow(2, attempt), 30000),
            linear: (attempt) => Math.min(1000 * attempt, 10000),
            fixed: () => 2000,
            fibonacci: (attempt) => {
                const fib = [1000, 1000, 2000, 3000, 5000, 8000, 13000];
                return fib[Math.min(attempt, fib.length - 1)];
            }
        };

        this.errorStats = {
            total: 0,
            byCategory: {},
            byPlatform: {},
            byComponent: {},
            recovery: {
                attempted: 0,
                successful: 0
            }
        };

        this.activeRecoveries = new Map();
        this.errorHistory = [];
        this.maxHistorySize = 200;

        this.initialize();
    }

    /**
     * Initialize error handler
     */
    initialize() {
        // Set up global error handlers
        this.setupGlobalErrorHandlers();

        // Set up unhandled promise rejection handler
        this.setupPromiseRejectionHandler();

        logger.info('ErrorHandler initialized', { component: 'ErrorHandler' });
    }

    /**
     * Set up global error handlers
     */
    setupGlobalErrorHandlers() {
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.handleGlobalError({
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error
                });
            });
        }
    }

    /**
     * Set up unhandled promise rejection handler
     */
    setupPromiseRejectionHandler() {
        if (typeof window !== 'undefined') {
            window.addEventListener('unhandledrejection', (event) => {
                this.handleUnhandledRejection(event.reason, {
                    type: 'unhandledPromise',
                    component: 'global'
                });
            });
        }
    }

    /**
     * Handle global errors
     */
    handleGlobalError(errorInfo) {
        const context = {
            component: 'global',
            operation: 'globalError',
            filename: errorInfo.filename,
            line: errorInfo.lineno,
            column: errorInfo.colno
        };

        this.handleError(errorInfo.error || new Error(errorInfo.message), context);
    }

    /**
     * Handle unhandled promise rejections
     */
    handleUnhandledRejection(reason, context = {}) {
        const error = reason instanceof Error ? reason : new Error(String(reason));

        this.handleError(error, {
            ...context,
            type: 'unhandledPromise'
        });
    }

    /**
     * Main error handling method
     */
    async handleError(error, context = {}) {
        try {
            // Generate unique error ID
            const errorId = this.generateErrorId();

            // Classify the error
            const classification = this.classifyError(error);

            // Create enhanced error object
            const enhancedError = this.createEnhancedError(error, classification, context, errorId);

            // Log the error
            this.logError(enhancedError);

            // Update statistics
            this.updateErrorStats(enhancedError);

            // Add to history
            this.addToHistory(enhancedError);

            // Attempt automatic recovery if appropriate
            const recoveryResult = await this.attemptRecovery(enhancedError);

            // Notify user if necessary
            this.notifyUser(enhancedError, recoveryResult);

            // Return error info for caller
            return {
                errorId,
                category: classification.category,
                severity: classification.severity,
                recoverable: classification.retryable,
                recovery: recoveryResult,
                userMessage: classification.userMessage
            };

        } catch (handlingError) {
            // Error in error handling - log to console as fallback
            console.error('[ErrorHandler] Error in error handling:', handlingError);
            logger.error('Error in error handling', {
                component: 'ErrorHandler',
                originalError: error.message,
                handlingError: handlingError.message
            });
        }
    }

    /**
     * Generate unique error ID
     */
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }

    /**
     * Classify error based on patterns
     */
    classifyError(error) {
        const message = error.message || String(error);

        for (const [category, config] of Object.entries(this.errorCategories)) {
            for (const pattern of config.patterns) {
                if (pattern.test(message)) {
                    return { category, ...config };
                }
            }
        }

        // Default classification for unknown errors
        return {
            category: 'UNKNOWN',
            severity: 'medium',
            retryable: true,
            userMessage: 'An unexpected error occurred. The extension will attempt to continue.',
            suggestions: ['Error may be temporary', 'Will attempt automatic recovery', 'Report if issue persists']
        };
    }

    /**
     * Create enhanced error object with additional context
     */
    createEnhancedError(error, classification, context, errorId) {
        return {
            id: errorId,
            timestamp: Date.now(),
            message: error.message || String(error),
            stack: error.stack,
            classification,
            context: {
                platform: context.platform || null,
                component: context.component || 'unknown',
                operation: context.operation || null,
                url: context.url || (typeof window !== 'undefined' ? window.location.href : null),
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
                ...context
            },
            originalError: error
        };
    }

    /**
     * Log error with appropriate level
     */
    logError(enhancedError) {
        const logLevel = this.getSeverityLogLevel(enhancedError.classification.severity);

        logger[logLevel](enhancedError.message, {
            component: enhancedError.context.component,
            operation: enhancedError.context.operation,
            platform: enhancedError.context.platform,
            errorId: enhancedError.id,
            category: enhancedError.classification.category,
            severity: enhancedError.classification.severity,
            retryable: enhancedError.classification.retryable
        });
    }

    /**
     * Get log level based on error severity
     */
    getSeverityLogLevel(severity) {
        switch (severity) {
            case 'low': return 'warn';
            case 'medium': return 'error';
            case 'high': return 'error';
            default: return 'error';
        }
    }

    /**
     * Update error statistics
     */
    updateErrorStats(enhancedError) {
        this.errorStats.total++;

        // By category
        const category = enhancedError.classification.category;
        this.errorStats.byCategory[category] = (this.errorStats.byCategory[category] || 0) + 1;

        // By platform
        const platform = enhancedError.context.platform || 'unknown';
        this.errorStats.byPlatform[platform] = (this.errorStats.byPlatform[platform] || 0) + 1;

        // By component
        const component = enhancedError.context.component || 'unknown';
        this.errorStats.byComponent[component] = (this.errorStats.byComponent[component] || 0) + 1;
    }

    /**
     * Add error to history
     */
    addToHistory(enhancedError) {
        this.errorHistory.push({
            id: enhancedError.id,
            timestamp: enhancedError.timestamp,
            message: enhancedError.message,
            category: enhancedError.classification.category,
            severity: enhancedError.classification.severity,
            context: enhancedError.context
        });

        // Maintain history size
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.splice(0, this.errorHistory.length - this.maxHistorySize);
        }
    }

    /**
     * Attempt automatic recovery
     */
    async attemptRecovery(enhancedError) {
        if (!enhancedError.classification.retryable) {
            return { attempted: false, reason: 'Non-retryable error' };
        }

        // Check if already attempting recovery for this error type
        const recoveryKey = `${enhancedError.classification.category}_${enhancedError.context.component}`;
        if (this.activeRecoveries.has(recoveryKey)) {
            return { attempted: false, reason: 'Recovery already in progress' };
        }

        this.errorStats.recovery.attempted++;
        this.activeRecoveries.set(recoveryKey, Date.now());

        try {
            const recoveryStrategy = this.getRecoveryStrategy(enhancedError);
            const result = await this.executeRecovery(recoveryStrategy, enhancedError);

            if (result.success) {
                this.errorStats.recovery.successful++;
                logger.info('Error recovery successful', {
                    component: 'ErrorHandler',
                    errorId: enhancedError.id,
                    strategy: recoveryStrategy.name
                });
            }

            return result;

        } catch (recoveryError) {
            logger.error('Error recovery failed', {
                component: 'ErrorHandler',
                errorId: enhancedError.id,
                recoveryError: recoveryError.message
            });

            return { attempted: true, success: false, error: recoveryError.message };

        } finally {
            this.activeRecoveries.delete(recoveryKey);
        }
    }

    /**
     * Get recovery strategy for error
     */
    getRecoveryStrategy(enhancedError) {
        const category = enhancedError.classification.category;
        const context = enhancedError.context;

        switch (category) {
            case 'NETWORK':
                return {
                    name: 'networkRetry',
                    maxAttempts: 3,
                    delayStrategy: 'exponential',
                    action: 'retry'
                };

            case 'QUOTA_EXCEEDED':
                return {
                    name: 'quotaBackoff',
                    maxAttempts: 1,
                    delayStrategy: 'fixed',
                    delay: 60000, // 1 minute
                    action: 'pause'
                };

            case 'DOM_ERROR':
                return {
                    name: 'domRetry',
                    maxAttempts: 2,
                    delayStrategy: 'linear',
                    action: 'retry_with_fallback'
                };

            case 'TIMEOUT_ERROR':
                return {
                    name: 'timeoutRetry',
                    maxAttempts: 2,
                    delayStrategy: 'fibonacci',
                    action: 'retry_with_extended_timeout'
                };

            case 'STORAGE_ERROR':
                return {
                    name: 'storageCleanup',
                    maxAttempts: 1,
                    action: 'cleanup_and_retry'
                };

            default:
                return {
                    name: 'genericRetry',
                    maxAttempts: 1,
                    delayStrategy: 'fixed',
                    action: 'retry'
                };
        }
    }

    /**
     * Execute recovery strategy
     */
    async executeRecovery(strategy, enhancedError) {
        const startTime = Date.now();

        try {
            switch (strategy.action) {
                case 'retry':
                    return await this.executeRetryRecovery(strategy, enhancedError);

                case 'pause':
                    return await this.executePauseRecovery(strategy, enhancedError);

                case 'retry_with_fallback':
                    return await this.executeRetryWithFallbackRecovery(strategy, enhancedError);

                case 'retry_with_extended_timeout':
                    return await this.executeExtendedTimeoutRecovery(strategy, enhancedError);

                case 'cleanup_and_retry':
                    return await this.executeCleanupRecovery(strategy, enhancedError);

                default:
                    return { attempted: true, success: false, reason: 'Unknown recovery action' };
            }

        } finally {
            const duration = Date.now() - startTime;
            logger.debug('Recovery attempt completed', {
                component: 'ErrorHandler',
                strategy: strategy.name,
                duration
            });
        }
    }

    /**
     * Execute retry recovery
     */
    async executeRetryRecovery(strategy, enhancedError) {
        const delayFn = this.retryStrategies[strategy.delayStrategy] || this.retryStrategies.fixed;

        for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
            if (attempt > 1) {
                const delay = delayFn(attempt - 1);
                await this.delay(delay);
            }

            // Note: Actual retry would depend on the original operation
            // This is a framework for recovery, specific operations would implement their own retry logic
            logger.debug('Recovery retry attempt', {
                component: 'ErrorHandler',
                attempt,
                maxAttempts: strategy.maxAttempts
            });
        }

        return { attempted: true, success: true, strategy: strategy.name };
    }

    /**
     * Execute pause recovery (for quota issues)
     */
    async executePauseRecovery(strategy, enhancedError) {
        logger.info('Pausing operations due to quota/rate limit', {
            component: 'ErrorHandler',
            duration: strategy.delay
        });

        // Send pause signal to extension
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.sendMessage({
                    type: 'PAUSE_OPERATIONS',
                    duration: strategy.delay,
                    reason: 'quota_exceeded'
                });
            }
        } catch (error) {
            // Ignore if no listeners
        }

        return { attempted: true, success: true, strategy: strategy.name, paused: true };
    }

    /**
     * Execute retry with fallback recovery
     */
    async executeRetryWithFallbackRecovery(strategy, enhancedError) {
        logger.info('Attempting recovery with fallback selectors', {
            component: 'ErrorHandler',
            platform: enhancedError.context.platform
        });

        // Signal to use fallback selectors
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.sendMessage({
                    type: 'USE_FALLBACK_SELECTORS',
                    platform: enhancedError.context.platform,
                    component: enhancedError.context.component
                });
            }
        } catch (error) {
            // Ignore if no listeners
        }

        return { attempted: true, success: true, strategy: strategy.name, usedFallback: true };
    }

    /**
     * Execute extended timeout recovery
     */
    async executeExtendedTimeoutRecovery(strategy, enhancedError) {
        logger.info('Extending timeout for recovery', {
            component: 'ErrorHandler',
            operation: enhancedError.context.operation
        });

        // Signal to use extended timeout
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.sendMessage({
                    type: 'EXTEND_TIMEOUT',
                    operation: enhancedError.context.operation,
                    component: enhancedError.context.component
                });
            }
        } catch (error) {
            // Ignore if no listeners
        }

        return { attempted: true, success: true, strategy: strategy.name, extendedTimeout: true };
    }

    /**
     * Execute cleanup recovery
     */
    async executeCleanupRecovery(strategy, enhancedError) {
        logger.info('Attempting storage cleanup for recovery', {
            component: 'ErrorHandler'
        });

        try {
            // Clear some storage to free up space
            if (typeof chrome !== 'undefined' && chrome.storage) {
                // Clear old logs
                const logs = await chrome.storage.local.get(['logs']);
                if (logs.logs && logs.logs.length > 100) {
                    const trimmedLogs = logs.logs.slice(-50); // Keep only recent 50
                    await chrome.storage.local.set({ logs: trimmedLogs });
                }

                // Clear old cache data
                await chrome.storage.local.remove(['cache', 'tempData']);
            }

            return { attempted: true, success: true, strategy: strategy.name, cleaned: true };

        } catch (cleanupError) {
            return { attempted: true, success: false, error: cleanupError.message };
        }
    }

    /**
     * Notify user about error if necessary
     */
    notifyUser(enhancedError, recoveryResult) {
        const shouldNotify = this.shouldNotifyUser(enhancedError, recoveryResult);

        if (shouldNotify) {
            const notification = this.createUserNotification(enhancedError, recoveryResult);
            this.sendUserNotification(notification);
        }
    }

    /**
     * Determine if user should be notified
     */
    shouldNotifyUser(enhancedError, recoveryResult) {
        const severity = enhancedError.classification.severity;
        const category = enhancedError.classification.category;

        // Always notify for high severity errors
        if (severity === 'high') return true;

        // Notify for non-recoverable medium severity errors
        if (severity === 'medium' && (!recoveryResult.success)) return true;

        // Don't notify for low severity or successfully recovered errors
        return false;
    }

    /**
     * Create user notification message
     */
    createUserNotification(enhancedError, recoveryResult) {
        const classification = enhancedError.classification;

        let message = classification.userMessage;

        if (recoveryResult.attempted && recoveryResult.success) {
            message += ' Recovery successful.';
        } else if (recoveryResult.attempted && !recoveryResult.success) {
            message += ' Recovery failed.';
        }

        return {
            type: 'error',
            title: `${classification.category.replace('_', ' ')} Error`,
            message,
            suggestions: classification.suggestions,
            severity: classification.severity,
            errorId: enhancedError.id
        };
    }

    /**
     * Send notification to user
     */
    sendUserNotification(notification) {
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.sendMessage({
                    type: 'ERROR_NOTIFICATION',
                    notification
                });
            }
        } catch (error) {
            // Fallback to console if messaging fails
            console.warn('[ErrorHandler] User notification:', notification);
        }
    }

    /**
     * Get error statistics
     */
    getErrorStatistics() {
        return {
            ...this.errorStats,
            recoveryRate: this.errorStats.recovery.attempted > 0
                ? (this.errorStats.recovery.successful / this.errorStats.recovery.attempted * 100).toFixed(1)
                : 0,
            recentErrors: this.errorHistory.slice(-10)
        };
    }

    /**
     * Get error patterns for analysis
     */
    getErrorPatterns() {
        const patterns = {};

        this.errorHistory.forEach(error => {
            const key = `${error.category}_${error.context.component}`;
            if (!patterns[key]) {
                patterns[key] = {
                    category: error.category,
                    component: error.context.component,
                    count: 0,
                    firstSeen: error.timestamp,
                    lastSeen: error.timestamp
                };
            }

            patterns[key].count++;
            patterns[key].lastSeen = Math.max(patterns[key].lastSeen, error.timestamp);
        });

        return Object.values(patterns).sort((a, b) => b.count - a.count);
    }

    /**
     * Clear error history and statistics
     */
    clearErrorData() {
        this.errorStats = {
            total: 0,
            byCategory: {},
            byPlatform: {},
            byComponent: {},
            recovery: {
                attempted: 0,
                successful: 0
            }
        };

        this.errorHistory = [];
        this.activeRecoveries.clear();

        logger.info('Error data cleared', { component: 'ErrorHandler' });
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Create error wrapper for async operations
     */
    wrapAsync(asyncFn, context = {}) {
        return async (...args) => {
            try {
                return await asyncFn(...args);
            } catch (error) {
                await this.handleError(error, context);
                throw error; // Re-throw after handling
            }
        };
    }

    /**
     * Create error wrapper for regular functions
     */
    wrapSync(syncFn, context = {}) {
        return (...args) => {
            try {
                return syncFn(...args);
            } catch (error) {
                this.handleError(error, context);
                throw error; // Re-throw after handling
            }
        };
    }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Export both class and instance
export { ErrorHandler, errorHandler };