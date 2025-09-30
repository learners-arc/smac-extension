/**
 * Performance Optimizer Utility - Memory leak prevention and performance optimization
 * Monitors and optimizes extension performance to prevent memory issues
 * 
 * Features:
 * - Memory usage monitoring and cleanup
 * - DOM observer cleanup prevention
 * - Event listener lifecycle management
 * - Storage optimization and cleanup
 * - Performance bottleneck detection
 * - Automatic garbage collection triggers
 */

import { logger } from './logger.js';

class PerformanceOptimizer {
    constructor() {
        this.observers = new Set();
        this.eventListeners = new Map();
        this.timers = new Set();
        this.intervals = new Set();
        this.performanceThresholds = {
            memoryUsage: 50 * 1024 * 1024, // 50MB
            domNodes: 10000,
            eventListeners: 1000,
            observers: 50,
            cacheSize: 1000
        };

        this.monitoringActive = false;
        this.cleanupScheduled = false;
        this.lastCleanup = Date.now();
        this.cleanupInterval = 5 * 60 * 1000; // 5 minutes

        this.initialize();
    }

    /**
     * Initialize performance monitoring
     */
    async initialize() {
        logger.info('Performance Optimizer initialized', {
            component: 'PerformanceOptimizer'
        });

        this.startMonitoring();
        this.schedulePeriodicCleanup();
    }

    /**
     * Start performance monitoring
     */
    startMonitoring() {
        if (this.monitoringActive) return;

        this.monitoringActive = true;

        // Monitor memory usage every 30 seconds
        const memoryMonitor = setInterval(() => {
            this.checkMemoryUsage();
        }, 30000);

        this.intervals.add(memoryMonitor);

        // Monitor DOM size every 60 seconds (only in content script context)
        const domMonitor = setInterval(() => {
            if (typeof document !== 'undefined') {
                this.checkDOMSize();
            }
        }, 60000);

        this.intervals.add(domMonitor);

        logger.debug('Performance monitoring started', {
            component: 'PerformanceOptimizer'
        });
    }

    /**
     * Stop performance monitoring
     */
    stopMonitoring() {
        this.monitoringActive = false;

        // Clear all monitoring intervals
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals.clear();

        logger.debug('Performance monitoring stopped', {
            component: 'PerformanceOptimizer'
        });
    }

    /**
     * Check memory usage and trigger cleanup if needed
     */
    async checkMemoryUsage() {
        try {
            if (typeof performance.memory !== 'undefined') {
                const memoryInfo = performance.memory;
                const usedMemory = memoryInfo.usedJSHeapSize;

                logger.debug('Memory usage check', {
                    component: 'PerformanceOptimizer',
                    usedMemory: this.formatBytes(usedMemory),
                    totalMemory: this.formatBytes(memoryInfo.totalJSHeapSize),
                    limit: this.formatBytes(memoryInfo.jsHeapSizeLimit)
                });

                if (usedMemory > this.performanceThresholds.memoryUsage) {
                    logger.warn('High memory usage detected, triggering cleanup', {
                        component: 'PerformanceOptimizer',
                        usedMemory: this.formatBytes(usedMemory)
                    });

                    await this.performMemoryCleanup();
                }
            }
        } catch (error) {
            logger.error('Error checking memory usage', {
                component: 'PerformanceOptimizer',
                error: error.message
            });
        }
    }

    /**
     * Check DOM size and complexity
     */
    checkDOMSize() {
        try {
            // Only run in contexts where document is available
            if (typeof document === 'undefined') {
                return;
            }

            const elementCount = document.querySelectorAll('*').length;
            const eventListenerCount = this.estimateEventListeners();
            const observerCount = this.observers.size;

            // Update statistics
            this.stats.domChecks++;
            this.stats.lastDOMCheck = Date.now();

            if (elementCount > this.performanceThresholds.domElements) {
                logger.warn('High DOM element count detected', {
                    component: 'PerformanceOptimizer',
                    elementCount
                });
            }

            if (eventListenerCount > this.performanceThresholds.eventListeners) {
                logger.warn('High event listener count detected', {
                    component: 'PerformanceOptimizer',
                    eventListenerCount
                });
            }

            if (observerCount > this.performanceThresholds.observers) {
                logger.warn('High observer count detected', {
                    component: 'PerformanceOptimizer',
                    observerCount
                });
            }
        } catch (error) {
            logger.error('Error checking DOM size', {
                component: 'PerformanceOptimizer',
                error: error.message
            });
        }
    }    /**
     * Perform memory cleanup
     */
    async performMemoryCleanup() {
        try {
            logger.info('Starting memory cleanup', {
                component: 'PerformanceOptimizer'
            });

            // Clean up disconnected observers
            await this.cleanupObservers();

            // Clean up unused event listeners
            await this.cleanupEventListeners();

            // Clean up timers and intervals
            await this.cleanupTimers();

            // Clean up storage caches
            await this.cleanupStorageCaches();

            // Force garbage collection if available (only in window context)
            if (typeof window !== 'undefined' && typeof window.gc === 'function') {
                window.gc();
                logger.debug('Forced garbage collection', {
                    component: 'PerformanceOptimizer'
                });
            }

            this.lastCleanup = Date.now();

            logger.info('Memory cleanup completed', {
                component: 'PerformanceOptimizer'
            });

        } catch (error) {
            logger.error('Error during memory cleanup', {
                component: 'PerformanceOptimizer',
                error: error.message
            });
        }
    }

    /**
     * Clean up disconnected observers
     */
    async cleanupObservers() {
        let cleanedCount = 0;

        this.observers.forEach(observer => {
            try {
                if (observer && typeof observer.disconnect === 'function') {
                    // Check if observer is still connected to DOM
                    const records = observer.takeRecords();
                    if (records.length === 0) {
                        observer.disconnect();
                        this.observers.delete(observer);
                        cleanedCount++;
                    }
                }
            } catch (error) {
                // Observer already disconnected or invalid
                this.observers.delete(observer);
                cleanedCount++;
            }
        });

        if (cleanedCount > 0) {
            logger.debug('Cleaned up disconnected observers', {
                component: 'PerformanceOptimizer',
                cleanedCount
            });
        }
    }

    /**
     * Clean up unused event listeners
     */
    async cleanupEventListeners() {
        let cleanedCount = 0;

        this.eventListeners.forEach((listeners, element) => {
            try {
                if (!document.contains(element)) {
                    // Element no longer in DOM, remove all listeners
                    listeners.forEach(({ event, handler, options }) => {
                        element.removeEventListener(event, handler, options);
                    });
                    this.eventListeners.delete(element);
                    cleanedCount += listeners.length;
                }
            } catch (error) {
                this.eventListeners.delete(element);
                cleanedCount += listeners.length;
            }
        });

        if (cleanedCount > 0) {
            logger.debug('Cleaned up unused event listeners', {
                component: 'PerformanceOptimizer',
                cleanedCount
            });
        }
    }

    /**
     * Clean up timers and intervals
     */
    async cleanupTimers() {
        let cleanedCount = 0;

        // Clean up completed timers
        this.timers.forEach(timer => {
            if (timer.completed || Date.now() > timer.expiryTime) {
                clearTimeout(timer.id);
                this.timers.delete(timer);
                cleanedCount++;
            }
        });

        if (cleanedCount > 0) {
            logger.debug('Cleaned up expired timers', {
                component: 'PerformanceOptimizer',
                cleanedCount
            });
        }
    }

    /**
     * Clean up storage caches
     */
    async cleanupStorageCaches() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                // Get current storage usage
                const storageData = await chrome.storage.local.get(null);
                const cacheKeys = Object.keys(storageData).filter(key =>
                    key.startsWith('cache_') || key.startsWith('temp_')
                );

                if (cacheKeys.length > this.performanceThresholds.cacheSize) {
                    // Remove oldest cache entries
                    const toRemove = cacheKeys.slice(0, Math.floor(cacheKeys.length * 0.3));
                    await chrome.storage.local.remove(toRemove);

                    logger.debug('Cleaned up storage caches', {
                        component: 'PerformanceOptimizer',
                        removedEntries: toRemove.length
                    });
                }
            }
        } catch (error) {
            logger.error('Error cleaning storage caches', {
                component: 'PerformanceOptimizer',
                error: error.message
            });
        }
    }

    /**
     * Schedule periodic cleanup
     */
    schedulePeriodicCleanup() {
        if (this.cleanupScheduled) return;

        this.cleanupScheduled = true;

        const cleanupTimer = setInterval(async () => {
            if (Date.now() - this.lastCleanup > this.cleanupInterval) {
                await this.performMemoryCleanup();
            }
        }, this.cleanupInterval);

        this.intervals.add(cleanupTimer);

        logger.debug('Periodic cleanup scheduled', {
            component: 'PerformanceOptimizer',
            intervalMs: this.cleanupInterval
        });
    }

    /**
     * Register a mutation observer for cleanup tracking
     */
    registerObserver(observer, description = 'unknown') {
        this.observers.add(observer);

        logger.debug('Observer registered', {
            component: 'PerformanceOptimizer',
            description,
            totalObservers: this.observers.size
        });

        return observer;
    }

    /**
     * Unregister a mutation observer
     */
    unregisterObserver(observer) {
        if (this.observers.has(observer)) {
            observer.disconnect();
            this.observers.delete(observer);

            logger.debug('Observer unregistered', {
                component: 'PerformanceOptimizer',
                totalObservers: this.observers.size
            });
        }
    }

    /**
     * Register an event listener for cleanup tracking
     */
    registerEventListener(element, event, handler, options = false) {
        if (!this.eventListeners.has(element)) {
            this.eventListeners.set(element, []);
        }

        this.eventListeners.get(element).push({ event, handler, options });
        element.addEventListener(event, handler, options);

        logger.debug('Event listener registered', {
            component: 'PerformanceOptimizer',
            event,
            totalListeners: this.getTotalEventListeners()
        });
    }

    /**
     * Unregister an event listener
     */
    unregisterEventListener(element, event, handler, options = false) {
        if (this.eventListeners.has(element)) {
            const listeners = this.eventListeners.get(element);
            const index = listeners.findIndex(l =>
                l.event === event && l.handler === handler && l.options === options
            );

            if (index !== -1) {
                listeners.splice(index, 1);
                element.removeEventListener(event, handler, options);

                if (listeners.length === 0) {
                    this.eventListeners.delete(element);
                }

                logger.debug('Event listener unregistered', {
                    component: 'PerformanceOptimizer',
                    event,
                    totalListeners: this.getTotalEventListeners()
                });
            }
        }
    }

    /**
     * Register a timer for cleanup tracking
     */
    registerTimer(timerId, durationMs, description = 'unknown') {
        const timer = {
            id: timerId,
            startTime: Date.now(),
            expiryTime: Date.now() + durationMs,
            description,
            completed: false
        };

        this.timers.add(timer);

        logger.debug('Timer registered', {
            component: 'PerformanceOptimizer',
            description,
            durationMs,
            totalTimers: this.timers.size
        });

        return timer;
    }

    /**
     * Mark timer as completed
     */
    completeTimer(timer) {
        if (this.timers.has(timer)) {
            timer.completed = true;
            clearTimeout(timer.id);

            logger.debug('Timer completed', {
                component: 'PerformanceOptimizer',
                description: timer.description,
                duration: Date.now() - timer.startTime
            });
        }
    }

    /**
     * Get total number of event listeners
     */
    getTotalEventListeners() {
        let total = 0;
        this.eventListeners.forEach(listeners => {
            total += listeners.length;
        });
        return total;
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        const stats = {
            observers: this.observers.size,
            eventListeners: this.getTotalEventListeners(),
            timers: this.timers.size,
            intervals: this.intervals.size,
            lastCleanup: this.lastCleanup,
            monitoringActive: this.monitoringActive
        };

        if (typeof performance.memory !== 'undefined') {
            stats.memory = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }

        return stats;
    }

    /**
     * Force immediate cleanup
     */
    async forceCleanup() {
        logger.info('Force cleanup triggered', {
            component: 'PerformanceOptimizer'
        });

        await this.performMemoryCleanup();
    }

    /**
     * Format bytes for display
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Shutdown and cleanup all resources
     */
    async shutdown() {
        logger.info('Performance Optimizer shutting down', {
            component: 'PerformanceOptimizer'
        });

        this.stopMonitoring();
        await this.performMemoryCleanup();

        // Clear all remaining intervals
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals.clear();

        // Clear all remaining timers
        this.timers.forEach(timer => clearTimeout(timer.id));
        this.timers.clear();

        // Disconnect all observers
        this.observers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (error) {
                // Observer already disconnected
            }
        });
        this.observers.clear();

        // Clear event listeners
        this.eventListeners.clear();

        logger.info('Performance Optimizer shutdown complete', {
            component: 'PerformanceOptimizer'
        });
    }
}

// Create singleton instance
const performanceOptimizer = new PerformanceOptimizer();

// Export both class and instance
export { PerformanceOptimizer, performanceOptimizer };