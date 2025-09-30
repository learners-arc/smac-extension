/**
 * Duplicate Checker Utility - Prevents duplicate comments and tracks posting history
 * Maintains records of posted comments to avoid spamming and ensure natural behavior
 * 
 * Features:
 * - Comment history tracking with content hashing
 * - Duplicate detection with similarity algorithms
 * - Post cooldown management to prevent rapid posting
 * - Platform-specific duplicate handling
 * - Storage cleanup and maintenance
 * - Analytics and reporting on comment patterns
 */

class DuplicateChecker {
    constructor() {
        this.config = {
            storage: {
                maxRecords: 1000,        // Maximum comment records to keep
                cleanupThreshold: 1200,  // Trigger cleanup when records exceed this
                retentionDays: 30        // Keep records for 30 days
            },
            duplicates: {
                similarityThreshold: 0.8, // 80% similarity threshold
                exactMatchCheck: true,
                timeWindow: 24 * 60 * 60 * 1000, // 24 hours for duplicate checking
                contentHashLength: 32
            },
            cooldowns: {
                samePost: 60 * 60 * 1000,      // 1 hour before commenting on same post again
                similarContent: 30 * 60 * 1000, // 30 minutes before similar comment
                platform: 5 * 60 * 1000        // 5 minutes between any comments on platform
            }
        };

        this.storageKey = 'commentHistory';
        this.statisticsKey = 'duplicateStatistics';

        // Initialize statistics
        this.statistics = {
            totalChecks: 0,
            duplicatesDetected: 0,
            uniqueComments: 0,
            cooldownsTriggered: 0,
            lastCleanup: null
        };
    }

    /**
     * Check if a comment would be a duplicate
     * @param {string} postId - The post ID
     * @param {string} comment - The comment text
     * @param {string} platform - Platform name ('linkedin' or 'twitter')
     * @return {Promise<boolean>} - True if duplicate detected
     */
    async isCommentDuplicate(postId, comment, platform) {
        try {
            this.statistics.totalChecks++;

            console.log(`[Duplicate Checker] Checking for duplicates: ${platform} post ${postId}`);

            // Get comment history
            const history = await this.getCommentHistory();

            // Check exact post duplicate
            if (await this.hasCommentedOnPost(postId, platform, history)) {
                console.log('[Duplicate Checker] Already commented on this post');
                this.statistics.duplicatesDetected++;
                return true;
            }

            // Check content similarity
            if (await this.isSimilarContentPosted(comment, platform, history)) {
                console.log('[Duplicate Checker] Similar content already posted');
                this.statistics.duplicatesDetected++;
                return true;
            }

            // Check platform cooldown
            if (await this.isPlatformOnCooldown(platform, history)) {
                console.log('[Duplicate Checker] Platform cooldown active');
                this.statistics.cooldownsTriggered++;
                return true;
            }

            console.log('[Duplicate Checker] No duplicates detected');
            return false;

        } catch (error) {
            console.error('[Duplicate Checker] Error checking duplicates:', error);
            return false; // Allow comment if check fails
        }
    }

    /**
     * Record a successfully posted comment
     * @param {string} postId - The post ID
     * @param {string} comment - The comment text
     * @param {string} platform - Platform name
     * @return {Promise<void>}
     */
    async recordComment(postId, comment, platform) {
        try {
            console.log(`[Duplicate Checker] Recording comment for ${platform} post ${postId}`);

            const record = {
                id: this.generateRecordId(),
                postId,
                comment,
                platform,
                timestamp: Date.now(),
                contentHash: this.generateContentHash(comment),
                wordCount: comment.split(' ').length,
                characterCount: comment.length
            };

            // Get existing history
            const history = await this.getCommentHistory();

            // Add new record
            history.unshift(record);

            // Cleanup if needed
            if (history.length > this.config.storage.cleanupThreshold) {
                await this.cleanupHistory(history);
            }

            // Save updated history
            await this.saveCommentHistory(history);

            // Update statistics
            this.statistics.uniqueComments++;
            await this.saveStatistics();

            console.log('[Duplicate Checker] Comment recorded successfully');

        } catch (error) {
            console.error('[Duplicate Checker] Error recording comment:', error);
        }
    }

    /**
     * Check if we've already commented on a specific post
     * @param {string} postId - The post ID
     * @param {string} platform - Platform name
     * @param {Array} history - Comment history
     * @return {Promise<boolean>} - True if already commented
     */
    async hasCommentedOnPost(postId, platform, history) {
        const cutoffTime = Date.now() - this.config.cooldowns.samePost;

        return history.some(record =>
            record.postId === postId &&
            record.platform === platform &&
            record.timestamp > cutoffTime
        );
    }

    /**
     * Check if similar content has been posted recently
     * @param {string} comment - The comment text
     * @param {string} platform - Platform name
     * @param {Array} history - Comment history
     * @return {Promise<boolean>} - True if similar content found
     */
    async isSimilarContentPosted(comment, platform, history) {
        const cutoffTime = Date.now() - this.config.cooldowns.similarContent;
        const commentHash = this.generateContentHash(comment);

        // Check for exact content hash match first
        if (this.config.duplicates.exactMatchCheck) {
            const exactMatch = history.some(record =>
                record.platform === platform &&
                record.contentHash === commentHash &&
                record.timestamp > cutoffTime
            );

            if (exactMatch) {
                return true;
            }
        }

        // Check for similar content using similarity algorithm
        const recentComments = history.filter(record =>
            record.platform === platform &&
            record.timestamp > cutoffTime
        );

        for (const record of recentComments) {
            const similarity = this.calculateSimilarity(comment, record.comment);
            if (similarity >= this.config.duplicates.similarityThreshold) {
                console.log(`[Duplicate Checker] Similar content found: ${similarity}% similarity`);
                return true;
            }
        }

        return false;
    }

    /**
     * Check if platform is on cooldown
     * @param {string} platform - Platform name
     * @param {Array} history - Comment history
     * @return {Promise<boolean>} - True if on cooldown
     */
    async isPlatformOnCooldown(platform, history) {
        const cutoffTime = Date.now() - this.config.cooldowns.platform;

        return history.some(record =>
            record.platform === platform &&
            record.timestamp > cutoffTime
        );
    }

    /**
     * Calculate similarity between two text strings
     * @param {string} text1 - First text
     * @param {string} text2 - Second text
     * @return {number} - Similarity score (0-1)
     */
    calculateSimilarity(text1, text2) {
        // Normalize texts
        const normalize = (text) => text.toLowerCase().trim().replace(/[^\w\s]/g, '');
        const norm1 = normalize(text1);
        const norm2 = normalize(text2);

        // Exact match
        if (norm1 === norm2) {
            return 1.0;
        }

        // Use Jaccard similarity with word sets
        const words1 = new Set(norm1.split(/\s+/));
        const words2 = new Set(norm2.split(/\s+/));

        const intersection = new Set([...words1].filter(word => words2.has(word)));
        const union = new Set([...words1, ...words2]);

        const jaccardSimilarity = intersection.size / union.size;

        // Use Levenshtein distance for character-level similarity
        const levenshteinSimilarity = 1 - (this.levenshteinDistance(norm1, norm2) / Math.max(norm1.length, norm2.length));

        // Combine both metrics (weighted average)
        return (jaccardSimilarity * 0.7) + (levenshteinSimilarity * 0.3);
    }

    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @return {number} - Levenshtein distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) {
            matrix[0][i] = i;
        }

        for (let j = 0; j <= str2.length; j++) {
            matrix[j][0] = j;
        }

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,     // deletion
                    matrix[j - 1][i] + 1,     // insertion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Generate content hash for comment
     * @param {string} comment - The comment text
     * @return {string} - Content hash
     */
    generateContentHash(comment) {
        // Simple hash function (can be replaced with crypto hash if needed)
        const normalized = comment.toLowerCase().replace(/[^\w\s]/g, '').trim();
        let hash = 0;

        for (let i = 0; i < normalized.length; i++) {
            const char = normalized.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }

        return Math.abs(hash).toString(36).substring(0, this.config.duplicates.contentHashLength);
    }

    /**
     * Generate unique record ID
     * @return {string} - Unique ID
     */
    generateRecordId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    /**
     * Get comment history from storage
     * @return {Promise<Array>} - Comment history array
     */
    async getCommentHistory() {
        try {
            const result = await chrome.storage.local.get([this.storageKey]);
            return result[this.storageKey] || [];
        } catch (error) {
            console.error('[Duplicate Checker] Error getting comment history:', error);
            return [];
        }
    }

    /**
     * Save comment history to storage
     * @param {Array} history - Comment history array
     * @return {Promise<void>}
     */
    async saveCommentHistory(history) {
        try {
            await chrome.storage.local.set({
                [this.storageKey]: history
            });
        } catch (error) {
            console.error('[Duplicate Checker] Error saving comment history:', error);
        }
    }

    /**
     * Cleanup old comment history
     * @param {Array} history - Comment history array
     * @return {Promise<Array>} - Cleaned history
     */
    async cleanupHistory(history) {
        console.log('[Duplicate Checker] Performing history cleanup...');

        const cutoffTime = Date.now() - (this.config.storage.retentionDays * 24 * 60 * 60 * 1000);

        // Remove old records
        const cleaned = history.filter(record => record.timestamp > cutoffTime);

        // Keep only the most recent records if still too many
        const final = cleaned.slice(0, this.config.storage.maxRecords);

        console.log(`[Duplicate Checker] Cleaned ${history.length - final.length} old records`);

        this.statistics.lastCleanup = Date.now();

        return final;
    }

    /**
     * Get duplicate checking statistics
     * @return {Promise<Object>} - Statistics object
     */
    async getStatistics() {
        try {
            const result = await chrome.storage.local.get([this.statisticsKey]);
            const stored = result[this.statisticsKey] || {};

            return {
                ...this.statistics,
                ...stored,
                duplicateRate: this.statistics.totalChecks > 0
                    ? (this.statistics.duplicatesDetected / this.statistics.totalChecks) * 100
                    : 0
            };
        } catch (error) {
            console.error('[Duplicate Checker] Error getting statistics:', error);
            return this.statistics;
        }
    }

    /**
     * Save statistics to storage
     * @return {Promise<void>}
     */
    async saveStatistics() {
        try {
            await chrome.storage.local.set({
                [this.statisticsKey]: this.statistics
            });
        } catch (error) {
            console.error('[Duplicate Checker] Error saving statistics:', error);
        }
    }

    /**
     * Reset duplicate checker data
     * @param {boolean} includeHistory - Whether to clear comment history
     * @return {Promise<void>}
     */
    async reset(includeHistory = false) {
        try {
            console.log('[Duplicate Checker] Resetting data...');

            // Reset statistics
            this.statistics = {
                totalChecks: 0,
                duplicatesDetected: 0,
                uniqueComments: 0,
                cooldownsTriggered: 0,
                lastCleanup: null
            };

            await this.saveStatistics();

            // Clear history if requested
            if (includeHistory) {
                await chrome.storage.local.remove([this.storageKey]);
                console.log('[Duplicate Checker] Comment history cleared');
            }

            console.log('[Duplicate Checker] Reset completed');

        } catch (error) {
            console.error('[Duplicate Checker] Error resetting data:', error);
        }
    }

    /**
     * Get recent comment patterns for analysis
     * @param {number} days - Number of days to analyze
     * @return {Promise<Object>} - Analysis results
     */
    async getRecentPatterns(days = 7) {
        try {
            const history = await this.getCommentHistory();
            const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

            const recentComments = history.filter(record => record.timestamp > cutoffTime);

            // Group by platform
            const platformStats = recentComments.reduce((acc, record) => {
                if (!acc[record.platform]) {
                    acc[record.platform] = {
                        count: 0,
                        avgWordCount: 0,
                        avgCharCount: 0,
                        posts: new Set()
                    };
                }

                acc[record.platform].count++;
                acc[record.platform].avgWordCount += record.wordCount || 0;
                acc[record.platform].avgCharCount += record.characterCount || 0;
                acc[record.platform].posts.add(record.postId);

                return acc;
            }, {});

            // Calculate averages
            Object.keys(platformStats).forEach(platform => {
                const stats = platformStats[platform];
                stats.avgWordCount = Math.round(stats.avgWordCount / stats.count);
                stats.avgCharCount = Math.round(stats.avgCharCount / stats.count);
                stats.uniquePosts = stats.posts.size;
                delete stats.posts; // Remove Set object for serialization
            });

            return {
                totalComments: recentComments.length,
                platforms: platformStats,
                timeRange: `${days} days`,
                analyzed: new Date().toISOString()
            };

        } catch (error) {
            console.error('[Duplicate Checker] Error analyzing patterns:', error);
            return { error: error.message };
        }
    }

    /**
     * Check if content violates posting patterns
     * @param {string} comment - Comment to check
     * @param {string} platform - Platform name
     * @return {Promise<Object>} - Violation check result
     */
    async checkPostingPatterns(comment, platform) {
        try {
            const history = await this.getCommentHistory();
            const recentComments = history.filter(record =>
                record.platform === platform &&
                record.timestamp > Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
            );

            const violations = [];

            // Check for too many similar length comments
            const avgLength = recentComments.reduce((sum, record) =>
                sum + (record.characterCount || 0), 0) / recentComments.length;

            if (Math.abs(comment.length - avgLength) < 10 && recentComments.length > 3) {
                violations.push('similar_length_pattern');
            }

            // Check for rapid posting
            if (recentComments.length > 10) {
                violations.push('high_frequency_posting');
            }

            // Check for repeated phrases
            const commentWords = comment.toLowerCase().split(/\s+/);
            for (const record of recentComments.slice(0, 5)) { // Check last 5 comments
                const recordWords = record.comment.toLowerCase().split(/\s+/);
                const sharedPhrases = this.findSharedPhrases(commentWords, recordWords);

                if (sharedPhrases.length > 2) { // More than 2 shared phrases
                    violations.push('repeated_phrases');
                    break;
                }
            }

            return {
                hasViolations: violations.length > 0,
                violations,
                riskLevel: violations.length > 2 ? 'high' : violations.length > 0 ? 'medium' : 'low'
            };

        } catch (error) {
            console.error('[Duplicate Checker] Error checking posting patterns:', error);
            return { hasViolations: false, violations: [], riskLevel: 'unknown' };
        }
    }

    /**
     * Find shared phrases between two word arrays
     * @param {Array} words1 - First word array
     * @param {Array} words2 - Second word array
     * @return {Array} - Shared phrases
     */
    findSharedPhrases(words1, words2) {
        const phrases = [];
        const minPhraseLength = 3;

        for (let i = 0; i <= words1.length - minPhraseLength; i++) {
            for (let len = minPhraseLength; len <= 5; len++) { // Max 5-word phrases
                if (i + len > words1.length) break;

                const phrase = words1.slice(i, i + len).join(' ');
                const words2Text = words2.join(' ');

                if (words2Text.includes(phrase)) {
                    phrases.push(phrase);
                }
            }
        }

        return phrases;
    }
}

// Create singleton instance
const duplicateChecker = new DuplicateChecker();

export { DuplicateChecker, duplicateChecker };