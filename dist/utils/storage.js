/**
 * Storage Management Utility for Social Media Auto-Comment Extension
 * 
 * Provides comprehensive storage operations for settings, logs, processed posts,
 * and statistics with data validation and migration support.
 */

/**
 * Storage Manager Class
 * Handles all Chrome storage operations with proper error handling and data validation
 */
class StorageManager {
    constructor() {
        this.STORAGE_KEYS = {
            SETTINGS: 'extension_settings',
            PROCESSED_POSTS: 'processed_posts',
            LOGS: 'extension_logs',
            STATISTICS: 'extension_statistics',
            SESSION_DATA: 'session_data'
        };

        this.MAX_LOG_ENTRIES = 1000;
        this.MAX_PROCESSED_POSTS = 5000;
    }

    /**
     * Initialize storage with default values
     */
    async initialize() {
        try {
            console.log('Initializing storage manager...');

            // Set up default values if they don't exist
            await this.initializeDefaults();

            // Clean up old data periodically
            await this.cleanupOldData();

            console.log('Storage manager initialized successfully');

        } catch (error) {
            console.error('Error initializing storage manager:', error);
            throw error;
        }
    }

    /**
     * Initialize default storage values
     */
    async initializeDefaults() {
        const defaults = {
            [this.STORAGE_KEYS.SETTINGS]: {
                isEnabled: false,
                selectedPlatforms: [],
                apiKey: '',
                commentInterval: { min: 70000, max: 90000 }, // milliseconds
                csFilterEnabled: true,
                smartTypingEnabled: true,
                totalCommentsMade: 0,
                lastProcessedPosts: {},
                createdAt: Date.now(),
                version: '1.0.0'
            },
            [this.STORAGE_KEYS.PROCESSED_POSTS]: {},
            [this.STORAGE_KEYS.LOGS]: [],
            [this.STORAGE_KEYS.STATISTICS]: {
                totalComments: 0,
                totalSessions: 0,
                totalPostsProcessed: 0,
                averageCommentsPerSession: 0,
                lastSessionDate: null,
                platformStats: {
                    LINKEDIN: { comments: 0, posts: 0 },
                    TWITTER: { comments: 0, posts: 0 }
                }
            },
            [this.STORAGE_KEYS.SESSION_DATA]: {
                currentSessionId: null,
                sessionStartTime: null,
                commentsThisSession: 0,
                postsProcessedThisSession: 0,
                lastCommentTime: null
            }
        };

        // Check existing data and only set defaults for missing keys
        for (const [key, defaultValue] of Object.entries(defaults)) {
            const existing = await this.get(key);
            if (!existing) {
                await this.set(key, defaultValue);
                console.log(`Initialized default value for ${key}`);
            }
        }
    }

    /**
     * Get data from storage
     */
    async get(key) {
        try {
            if (Array.isArray(key)) {
                const result = await chrome.storage.local.get(key);
                return result;
            } else {
                const result = await chrome.storage.local.get([key]);
                return result[key];
            }
        } catch (error) {
            console.error(`Error getting storage key ${key}:`, error);
            return null;
        }
    }

    /**
     * Set data in storage
     */
    async set(key, value) {
        try {
            await chrome.storage.local.set({ [key]: value });
            console.log(`Storage updated: ${key}`);
            return true;
        } catch (error) {
            console.error(`Error setting storage key ${key}:`, error);
            return false;
        }
    }

    /**
     * Update specific fields in settings
     */
    async updateSettings(updates) {
        try {
            const currentSettings = await this.get(this.STORAGE_KEYS.SETTINGS) || {};
            const updatedSettings = { ...currentSettings, ...updates };

            await this.set(this.STORAGE_KEYS.SETTINGS, updatedSettings);
            return updatedSettings;
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    }

    /**
     * Get current extension settings
     */
    async getSettings() {
        return await this.get(this.STORAGE_KEYS.SETTINGS) || {};
    }

    /**
     * Add a processed post to prevent duplicates
     */
    async addProcessedPost(platform, postId, data = {}) {
        try {
            const processedPosts = await this.get(this.STORAGE_KEYS.PROCESSED_POSTS) || {};

            if (!processedPosts[platform]) {
                processedPosts[platform] = {};
            }

            processedPosts[platform][postId] = {
                timestamp: Date.now(),
                ...data
            };

            // Cleanup old entries if too many
            await this.cleanupProcessedPosts(processedPosts);

            await this.set(this.STORAGE_KEYS.PROCESSED_POSTS, processedPosts);
            return true;
        } catch (error) {
            console.error('Error adding processed post:', error);
            return false;
        }
    }

    /**
     * Check if a post has been processed
     */
    async isPostProcessed(platform, postId) {
        try {
            const processedPosts = await this.get(this.STORAGE_KEYS.PROCESSED_POSTS) || {};
            return !!(processedPosts[platform] && processedPosts[platform][postId]);
        } catch (error) {
            console.error('Error checking processed post:', error);
            return false;
        }
    }

    /**
     * Add log entry
     */
    async addLog(level, message, platform = null, details = {}) {
        try {
            const logs = await this.get(this.STORAGE_KEYS.LOGS) || [];

            const logEntry = {
                timestamp: Date.now(),
                level: level,
                message: message,
                platform: platform,
                details: details,
                id: this.generateId()
            };

            logs.push(logEntry);

            // Keep only recent logs
            if (logs.length > this.MAX_LOG_ENTRIES) {
                logs.splice(0, logs.length - this.MAX_LOG_ENTRIES);
            }

            await this.set(this.STORAGE_KEYS.LOGS, logs);
            return logEntry;
        } catch (error) {
            console.error('Error adding log entry:', error);
            return null;
        }
    }

    /**
     * Get recent logs
     */
    async getLogs(limit = 100) {
        try {
            const logs = await this.get(this.STORAGE_KEYS.LOGS) || [];
            return logs.slice(-limit).reverse(); // Most recent first
        } catch (error) {
            console.error('Error getting logs:', error);
            return [];
        }
    }

    /**
     * Update statistics
     */
    async updateStatistics(updates) {
        try {
            const currentStats = await this.get(this.STORAGE_KEYS.STATISTICS) || {};
            const updatedStats = { ...currentStats, ...updates };

            await this.set(this.STORAGE_KEYS.STATISTICS, updatedStats);
            return updatedStats;
        } catch (error) {
            console.error('Error updating statistics:', error);
            throw error;
        }
    }

    /**
     * Get current statistics
     */
    async getStatistics() {
        return await this.get(this.STORAGE_KEYS.STATISTICS) || {};
    }

    /**
     * Start a new session
     */
    async startSession() {
        try {
            const sessionId = this.generateId();
            const sessionData = {
                currentSessionId: sessionId,
                sessionStartTime: Date.now(),
                commentsThisSession: 0,
                postsProcessedThisSession: 0,
                lastCommentTime: null
            };

            await this.set(this.STORAGE_KEYS.SESSION_DATA, sessionData);

            // Update total sessions count
            const stats = await this.getStatistics();
            await this.updateStatistics({
                totalSessions: (stats.totalSessions || 0) + 1,
                lastSessionDate: Date.now()
            });

            await this.addLog('INFO', `New session started: ${sessionId}`, null, { sessionId });

            return sessionId;
        } catch (error) {
            console.error('Error starting session:', error);
            throw error;
        }
    }

    /**
     * End current session
     */
    async endSession() {
        try {
            const sessionData = await this.get(this.STORAGE_KEYS.SESSION_DATA) || {};

            if (sessionData.currentSessionId) {
                const sessionDuration = Date.now() - sessionData.sessionStartTime;

                await this.addLog('INFO', `Session ended: ${sessionData.currentSessionId}`, null, {
                    sessionId: sessionData.currentSessionId,
                    duration: sessionDuration,
                    commentsPosted: sessionData.commentsThisSession,
                    postsProcessed: sessionData.postsProcessedThisSession
                });

                // Update average comments per session
                const stats = await this.getStatistics();
                const totalComments = stats.totalComments || 0;
                const totalSessions = stats.totalSessions || 1;
                const averageCommentsPerSession = Math.round(totalComments / totalSessions);

                await this.updateStatistics({ averageCommentsPerSession });
            }

            // Reset session data
            await this.set(this.STORAGE_KEYS.SESSION_DATA, {
                currentSessionId: null,
                sessionStartTime: null,
                commentsThisSession: 0,
                postsProcessedThisSession: 0,
                lastCommentTime: null
            });

        } catch (error) {
            console.error('Error ending session:', error);
            throw error;
        }
    }

    /**
     * Record a comment posted
     */
    async recordComment(platform, postData) {
        try {
            // Update session data
            const sessionData = await this.get(this.STORAGE_KEYS.SESSION_DATA) || {};
            sessionData.commentsThisSession = (sessionData.commentsThisSession || 0) + 1;
            sessionData.lastCommentTime = Date.now();
            await this.set(this.STORAGE_KEYS.SESSION_DATA, sessionData);

            // Update overall statistics
            const stats = await this.getStatistics();
            const updatedStats = {
                totalComments: (stats.totalComments || 0) + 1,
                totalPostsProcessed: (stats.totalPostsProcessed || 0) + 1
            };

            // Update platform-specific stats
            if (!updatedStats.platformStats) updatedStats.platformStats = {};
            if (!updatedStats.platformStats[platform]) {
                updatedStats.platformStats[platform] = { comments: 0, posts: 0 };
            }
            updatedStats.platformStats[platform].comments++;

            await this.updateStatistics(updatedStats);

            // Update settings total
            await this.updateSettings({ totalCommentsMade: updatedStats.totalComments });

            await this.addLog('INFO', `Comment posted on ${platform}`, platform, { postData });

        } catch (error) {
            console.error('Error recording comment:', error);
            throw error;
        }
    }

    /**
     * Clean up old data to prevent storage bloat
     */
    async cleanupOldData() {
        try {
            // Clean up old processed posts (older than 30 days)
            const processedPosts = await this.get(this.STORAGE_KEYS.PROCESSED_POSTS) || {};
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            let cleaned = false;

            for (const platform in processedPosts) {
                for (const postId in processedPosts[platform]) {
                    const post = processedPosts[platform][postId];
                    if (post.timestamp < thirtyDaysAgo) {
                        delete processedPosts[platform][postId];
                        cleaned = true;
                    }
                }
            }

            if (cleaned) {
                await this.set(this.STORAGE_KEYS.PROCESSED_POSTS, processedPosts);
                await this.addLog('INFO', 'Cleaned up old processed posts');
            }

        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    /**
     * Clean up processed posts if too many
     */
    async cleanupProcessedPosts(processedPosts) {
        let totalCount = 0;
        for (const platform in processedPosts) {
            totalCount += Object.keys(processedPosts[platform]).length;
        }

        if (totalCount > this.MAX_PROCESSED_POSTS) {
            // Remove oldest entries
            const allPosts = [];
            for (const platform in processedPosts) {
                for (const postId in processedPosts[platform]) {
                    allPosts.push({
                        platform,
                        postId,
                        timestamp: processedPosts[platform][postId].timestamp
                    });
                }
            }

            // Sort by timestamp and remove oldest
            allPosts.sort((a, b) => a.timestamp - b.timestamp);
            const toRemove = allPosts.slice(0, totalCount - this.MAX_PROCESSED_POSTS);

            for (const post of toRemove) {
                delete processedPosts[post.platform][post.postId];
            }
        }
    }

    /**
     * Clear all extension data
     */
    async clearAll() {
        try {
            await chrome.storage.local.clear();
            await this.initialize(); // Reinitialize with defaults
            await this.addLog('WARN', 'All extension data cleared');
        } catch (error) {
            console.error('Error clearing all data:', error);
            throw error;
        }
    }

    /**
     * Export data for backup
     */
    async exportData() {
        try {
            const allData = await chrome.storage.local.get(null);
            return {
                exportDate: Date.now(),
                version: '1.0.0',
                data: allData
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Get storage usage statistics
     */
    async getStorageUsage() {
        try {
            const usage = await chrome.storage.local.getBytesInUse();
            const quota = chrome.storage.local.QUOTA_BYTES;

            return {
                used: usage,
                total: quota,
                percentage: Math.round((usage / quota) * 100),
                available: quota - usage
            };
        } catch (error) {
            console.error('Error getting storage usage:', error);
            return null;
        }
    }
}

// Create singleton instance
const storageManager = new StorageManager();

// Export for use in other modules
export { StorageManager, storageManager };

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StorageManager, storageManager };
}