/**
 * Scheduler Utility for Social Media Auto-Comment Extension
 * 
 * Manages automated commenting intervals, timing coordination, and ensures
 * human-like behavior with randomized intervals between 70-90 seconds.
 */

/**
 * Scheduler Class
 * Handles timing, intervals, and coordination of automated commenting activities
 */
class CommentScheduler {
    constructor() {
        this.isRunning = false;
        this.currentTimer = null;
        this.scheduleQueue = [];
        this.activeSchedules = new Map();
        this.statistics = {
            totalScheduledTasks: 0,
            completedTasks: 0,
            averageInterval: 0,
            lastExecutionTime: null
        };

        // Default interval bounds (in milliseconds)
        this.defaultInterval = {
            min: 70000, // 70 seconds
            max: 90000  // 90 seconds
        };

        // State tracking
        this.lastLoggedInterval = null;

        // Bind methods
        this.executeScheduledTask = this.executeScheduledTask.bind(this);
    }

    /**
     * Initialize the scheduler
     */
    async initialize() {
        try {
            console.log('Initializing comment scheduler...');

            // Load any persisted schedule data
            await this.loadScheduleState();

            console.log('Comment scheduler initialized successfully');

        } catch (error) {
            console.error('Error initializing scheduler:', error);
            throw error;
        }
    }

    /**
     * Start the scheduling system
     */
    async start(settings = {}) {
        try {
            if (this.isRunning) {
                console.log('Scheduler already running');
                return false;
            }

            this.isRunning = true;

            // Update interval settings if provided
            if (settings.commentInterval) {
                this.defaultInterval = settings.commentInterval;
            }

            console.log('Comment scheduler started with interval:', this.defaultInterval);

            // Schedule first task
            await this.scheduleNextTask();

            // Log the start
            await this.logSchedulerEvent('Scheduler started', {
                interval: this.defaultInterval
            });

            return true;

        } catch (error) {
            console.error('Error starting scheduler:', error);
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * Stop the scheduling system
     */
    async stop() {
        try {
            if (!this.isRunning) {
                console.log('Scheduler already stopped');
                return false;
            }

            this.isRunning = false;

            // Clear current timer
            if (this.currentTimer) {
                clearTimeout(this.currentTimer);
                this.currentTimer = null;
            }

            // Clear all active schedules
            for (const [id, timer] of this.activeSchedules) {
                clearTimeout(timer);
                this.activeSchedules.delete(id);
            }

            // Clear queue
            this.scheduleQueue = [];

            console.log('Comment scheduler stopped');

            await this.logSchedulerEvent('Scheduler stopped');

            return true;

        } catch (error) {
            console.error('Error stopping scheduler:', error);
            throw error;
        }
    }

    /**
     * Schedule the next commenting task
     */
    async scheduleNextTask() {
        try {
            if (!this.isRunning) return;

            // Generate random interval within bounds
            const interval = this.generateRandomInterval();

            console.log(`Next comment scheduled in ${Math.round(interval / 1000)} seconds`);

            // Clear any existing timer
            if (this.currentTimer) {
                clearTimeout(this.currentTimer);
            }

            // Schedule the next task
            this.currentTimer = setTimeout(() => {
                this.executeScheduledTask();
            }, interval);

            // Update statistics
            this.statistics.totalScheduledTasks++;

            return interval;

        } catch (error) {
            console.error('Error scheduling next task:', error);
            throw error;
        }
    }

    /**
     * Execute a scheduled commenting task
     */
    async executeScheduledTask() {
        try {
            if (!this.isRunning) return;

            console.log('Executing scheduled commenting task...');

            // Update statistics
            this.statistics.completedTasks++;
            this.statistics.lastExecutionTime = Date.now();

            // Send message to trigger commenting process
            const message = {
                type: 'EXECUTE_SCHEDULED_COMMENT',
                timestamp: Date.now(),
                taskId: this.generateTaskId()
            };

            // Broadcast to all tabs (content scripts will filter by platform)
            const tabs = await chrome.tabs.query({});
            const targetPlatforms = ['linkedin.com', 'x.com', 'twitter.com'];

            for (const tab of tabs) {
                if (tab.url && targetPlatforms.some(platform => tab.url.includes(platform))) {
                    try {
                        await chrome.tabs.sendMessage(tab.id, message);
                        console.log(`Sent scheduled task to tab: ${tab.url}`);
                    } catch (error) {
                        // Tab might not have content script loaded, ignore
                        console.log(`Could not send message to tab ${tab.id}: ${error.message}`);
                    }
                }
            }

            await this.logSchedulerEvent('Scheduled task executed', {
                taskId: message.taskId,
                tabCount: tabs.length
            });

            // Schedule the next task
            await this.scheduleNextTask();

        } catch (error) {
            console.error('Error executing scheduled task:', error);

            // Try to recover by scheduling next task
            if (this.isRunning) {
                setTimeout(() => this.scheduleNextTask(), 5000); // Retry in 5 seconds
            }
        }
    }

    /**
     * Schedule a one-time task with custom delay
     */
    async scheduleOneTimeTask(callback, delay, taskData = {}) {
        try {
            const taskId = this.generateTaskId();

            const timer = setTimeout(async () => {
                try {
                    await callback(taskData);
                    this.activeSchedules.delete(taskId);

                    await this.logSchedulerEvent('One-time task completed', {
                        taskId,
                        delay
                    });
                } catch (error) {
                    console.error(`Error in one-time task ${taskId}:`, error);
                    this.activeSchedules.delete(taskId);
                }
            }, delay);

            this.activeSchedules.set(taskId, timer);

            await this.logSchedulerEvent('One-time task scheduled', {
                taskId,
                delay,
                taskData
            });

            return taskId;

        } catch (error) {
            console.error('Error scheduling one-time task:', error);
            throw error;
        }
    }

    /**
     * Cancel a scheduled task
     */
    async cancelTask(taskId) {
        try {
            if (this.activeSchedules.has(taskId)) {
                clearTimeout(this.activeSchedules.get(taskId));
                this.activeSchedules.delete(taskId);

                await this.logSchedulerEvent('Task cancelled', { taskId });

                return true;
            }

            return false;

        } catch (error) {
            console.error(`Error cancelling task ${taskId}:`, error);
            return false;
        }
    }

    /**
     * Generate random interval within configured bounds
     */
    generateRandomInterval() {
        const min = this.defaultInterval.min;
        const max = this.defaultInterval.max;

        // Add some additional randomization for more human-like behavior
        const baseInterval = Math.floor(Math.random() * (max - min + 1)) + min;

        // Add small random variation (±10%)
        const variation = baseInterval * 0.1;
        const finalInterval = baseInterval + (Math.random() * variation * 2 - variation);

        // Update running average
        this.updateAverageInterval(finalInterval);

        return Math.max(min, Math.min(max, Math.floor(finalInterval)));
    }

    /**
     * Update interval bounds
     */
    updateInterval(newInterval) {
        try {
            if (newInterval.min && newInterval.max && newInterval.min < newInterval.max) {
                this.defaultInterval = { ...newInterval };

                // Only log if interval actually changed
                if (this.lastLoggedInterval?.min !== newInterval.min ||
                    this.lastLoggedInterval?.max !== newInterval.max) {
                    console.log('Scheduler interval updated:', this.defaultInterval);
                    this.lastLoggedInterval = { ...newInterval };
                }

                return true;
            }

            console.warn('Invalid interval provided:', newInterval);
            return false;

        } catch (error) {
            console.error('Error updating interval:', error);
            return false;
        }
    }

    /**
     * Get current scheduler status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            hasActiveTimer: !!this.currentTimer,
            activeSchedulesCount: this.activeSchedules.size,
            queueLength: this.scheduleQueue.length,
            currentInterval: this.defaultInterval,
            statistics: { ...this.statistics },
            nextExecutionEstimate: this.getNextExecutionEstimate()
        };
    }

    /**
     * Get next execution time estimate
     */
    getNextExecutionEstimate() {
        if (!this.currentTimer || !this.isRunning) {
            return null;
        }

        // This is an approximation since we can't get exact remaining time from setTimeout
        const averageInterval = this.statistics.averageInterval ||
            (this.defaultInterval.min + this.defaultInterval.max) / 2;

        const lastExecution = this.statistics.lastExecutionTime;
        if (lastExecution) {
            return lastExecution + averageInterval;
        }

        return Date.now() + averageInterval;
    }

    /**
     * Update running average interval
     */
    updateAverageInterval(newInterval) {
        if (this.statistics.averageInterval === 0) {
            this.statistics.averageInterval = newInterval;
        } else {
            // Exponential moving average with factor of 0.2
            this.statistics.averageInterval =
                (this.statistics.averageInterval * 0.8) + (newInterval * 0.2);
        }
    }

    /**
     * Generate unique task ID
     */
    generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Load persisted schedule state (if any)
     */
    async loadScheduleState() {
        try {
            // This could load previous state from storage if needed
            // For now, start fresh each time
            console.log('Schedule state loaded (starting fresh)');
        } catch (error) {
            console.error('Error loading schedule state:', error);
        }
    }

    /**
     * Log scheduler events
     */
    async logSchedulerEvent(message, details = {}) {
        try {
            // Import storage manager dynamically to avoid circular dependency
            const { storageManager } = await import('./storage.js');

            await storageManager.addLog('INFO', `[SCHEDULER] ${message}`, null, {
                component: 'scheduler',
                ...details
            });

        } catch (error) {
            console.error('Error logging scheduler event:', error);
        }
    }

    /**
     * Get scheduler statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            averageIntervalSeconds: Math.round(this.statistics.averageInterval / 1000),
            successRate: this.statistics.totalScheduledTasks > 0 ?
                Math.round((this.statistics.completedTasks / this.statistics.totalScheduledTasks) * 100) : 0
        };
    }

    /**
     * Reset scheduler statistics
     */
    resetStatistics() {
        this.statistics = {
            totalScheduledTasks: 0,
            completedTasks: 0,
            averageInterval: 0,
            lastExecutionTime: null
        };

        console.log('Scheduler statistics reset');
    }

    /**
     * Handle system wake from sleep
     * Reschedule tasks if too much time has passed
     */
    async handleSystemWake() {
        try {
            if (!this.isRunning) return;

            const now = Date.now();
            const lastExecution = this.statistics.lastExecutionTime;

            if (lastExecution && (now - lastExecution) > (this.defaultInterval.max * 2)) {
                console.log('System wake detected, rescheduling tasks...');

                // Clear current timer and reschedule immediately
                if (this.currentTimer) {
                    clearTimeout(this.currentTimer);
                }

                // Schedule next task with minimal delay
                await this.scheduleNextTask();

                await this.logSchedulerEvent('Tasks rescheduled after system wake');
            }

        } catch (error) {
            console.error('Error handling system wake:', error);
        }
    }

    /**
     * Cleanup and shutdown
     */
    async shutdown() {
        try {
            await this.stop();

            // Clear all references
            this.scheduleQueue = [];
            this.activeSchedules.clear();

            console.log('Scheduler shutdown complete');

        } catch (error) {
            console.error('Error during scheduler shutdown:', error);
        }
    }
}

// Create singleton instance
const commentScheduler = new CommentScheduler();

// Export for use in other modules
export { CommentScheduler, commentScheduler };

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CommentScheduler, commentScheduler };
}