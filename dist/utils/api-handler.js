/**
 * API Handler Utility - Centralized API management and error handling
 * Handles API communication patterns, retries, caching, and error recovery
 * 
 * Features:
 * - Retry mechanisms with exponential backoff
 * - Request caching for similar prompts
 * - Error classification and handling
 * - API health monitoring
 * - Rate limiting compliance
 */

class APIHandler {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.healthStatus = {
            isHealthy: true,
            lastCheck: null,
            errorCount: 0,
            successCount: 0
        };
        this.errorPatterns = {
            QUOTA_EXCEEDED: /quota.*exceeded|rate.*limit/i,
            INVALID_KEY: /invalid.*key|unauthorized/i,
            NETWORK_ERROR: /network.*error|fetch.*failed/i,
            SERVER_ERROR: /server.*error|internal.*error/i,
            CONTENT_BLOCKED: /blocked.*content|safety.*violation/i
        };
    }

    /**
     * Make an API request with comprehensive error handling
     * @param {Function} apiCall - The API function to call
     * @param {Object} params - Parameters for the API call
     * @param {Object} options - Request options (retries, timeout, cache)
     */
    async makeRequest(apiCall, params, options = {}) {
        const {
            maxRetries = 3,
            timeout = 30000,
            useCache = true,
            cacheKey = null,
            retryDelay = 1000
        } = options;

        // Check cache first
        if (useCache && cacheKey) {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('[API Handler] Returning cached result');
                return cached;
            }
        }

        let lastError = null;
        let attempt = 0;

        while (attempt < maxRetries) {
            attempt++;

            try {
                console.log(`[API Handler] Attempt ${attempt}/${maxRetries}`);

                // Create timeout promise
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Request timeout')), timeout);
                });

                // Race between API call and timeout
                const result = await Promise.race([
                    apiCall(params),
                    timeoutPromise
                ]);

                // Success - update health status and cache
                this.updateHealthStatus(true);

                if (useCache && cacheKey) {
                    this.setCache(cacheKey, result);
                }

                return result;

            } catch (error) {
                lastError = error;
                this.updateHealthStatus(false);

                const errorType = this.classifyError(error);
                console.error(`[API Handler] Attempt ${attempt} failed - ${errorType}:`, error.message);

                // Don't retry for certain error types
                if (this.shouldNotRetry(errorType)) {
                    console.error('[API Handler] Non-retryable error, stopping attempts');
                    break;
                }

                // Wait before retrying (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = retryDelay * Math.pow(2, attempt - 1);
                    console.log(`[API Handler] Waiting ${delay}ms before retry...`);
                    await this.delay(delay);
                }
            }
        }

        // All attempts failed
        const finalError = this.createEnhancedError(lastError, attempt - 1);
        throw finalError;
    }

    /**
     * Classify error type for appropriate handling
     * @param {Error} error - The error to classify
     */
    classifyError(error) {
        const message = error.message.toLowerCase();

        for (const [type, pattern] of Object.entries(this.errorPatterns)) {
            if (pattern.test(message)) {
                return type;
            }
        }

        return 'UNKNOWN_ERROR';
    }

    /**
     * Determine if an error should not be retried
     * @param {string} errorType - The classified error type
     */
    shouldNotRetry(errorType) {
        const nonRetryableErrors = [
            'INVALID_KEY',
            'CONTENT_BLOCKED'
        ];

        return nonRetryableErrors.includes(errorType);
    }

    /**
     * Create enhanced error with additional context
     * @param {Error} originalError - The original error
     * @param {number} attempts - Number of attempts made
     */
    createEnhancedError(originalError, attempts) {
        const errorType = this.classifyError(originalError);
        const enhancedError = new Error(originalError.message);

        enhancedError.type = errorType;
        enhancedError.attempts = attempts;
        enhancedError.timestamp = Date.now();
        enhancedError.originalError = originalError;

        // Add user-friendly messages based on error type
        switch (errorType) {
            case 'QUOTA_EXCEEDED':
                enhancedError.userMessage = 'API quota exceeded. Please try again later or check your API limits.';
                enhancedError.suggestion = 'Consider upgrading your API plan or implementing request spacing.';
                break;

            case 'INVALID_KEY':
                enhancedError.userMessage = 'Invalid API key. Please check your Gemini API key in settings.';
                enhancedError.suggestion = 'Verify your API key is correct and has the necessary permissions.';
                break;

            case 'NETWORK_ERROR':
                enhancedError.userMessage = 'Network connection failed. Please check your internet connection.';
                enhancedError.suggestion = 'Ensure you have a stable internet connection and try again.';
                break;

            case 'SERVER_ERROR':
                enhancedError.userMessage = 'Server error occurred. This is likely a temporary issue.';
                enhancedError.suggestion = 'Wait a few minutes and try again. If the problem persists, check the API status.';
                break;

            case 'CONTENT_BLOCKED':
                enhancedError.userMessage = 'Content was blocked by safety filters.';
                enhancedError.suggestion = 'Try adjusting the content or prompt to be more appropriate.';
                break;

            default:
                enhancedError.userMessage = 'An unexpected error occurred during API communication.';
                enhancedError.suggestion = 'Please try again. If the problem persists, contact support.';
        }

        return enhancedError;
    }

    /**
     * Update health status tracking
     * @param {boolean} success - Whether the request was successful
     */
    updateHealthStatus(success) {
        this.healthStatus.lastCheck = Date.now();

        if (success) {
            this.healthStatus.successCount++;

            // Reset error count on success
            if (this.healthStatus.errorCount > 0) {
                this.healthStatus.errorCount = Math.max(0, this.healthStatus.errorCount - 1);
            }
        } else {
            this.healthStatus.errorCount++;
        }

        // Update health status based on recent performance
        const totalRequests = this.healthStatus.successCount + this.healthStatus.errorCount;
        const errorRate = totalRequests > 0 ? this.healthStatus.errorCount / totalRequests : 0;

        this.healthStatus.isHealthy = errorRate < 0.5; // Healthy if error rate < 50%
    }

    /**
     * Get cached result
     * @param {string} key - Cache key
     */
    getFromCache(key) {
        const cached = this.cache.get(key);

        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        // Remove expired cache entry
        if (cached) {
            this.cache.delete(key);
        }

        return null;
    }

    /**
     * Set cache entry
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     */
    setCache(key, data) {
        // Limit cache size
        if (this.cache.size >= 50) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Generate cache key for API requests
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Request parameters
     */
    generateCacheKey(endpoint, params) {
        const relevantParams = {
            content: params.content?.substring(0, 100), // First 100 chars
            platform: params.platform,
            style: params.style,
            tone: params.tone
        };

        return `${endpoint}_${JSON.stringify(relevantParams)}`;
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
        console.log('[API Handler] Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        let expired = 0;
        let valid = 0;
        const now = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.cacheTimeout) {
                expired++;
            } else {
                valid++;
            }
        }

        return {
            total: this.cache.size,
            valid,
            expired,
            hitRate: this.healthStatus.successCount / Math.max(1, this.healthStatus.successCount + this.healthStatus.errorCount)
        };
    }

    /**
     * Get health status
     */
    getHealthStatus() {
        return {
            ...this.healthStatus,
            lastCheckAgo: this.healthStatus.lastCheck ? Date.now() - this.healthStatus.lastCheck : null,
            errorRate: this.healthStatus.successCount + this.healthStatus.errorCount > 0 ?
                this.healthStatus.errorCount / (this.healthStatus.successCount + this.healthStatus.errorCount) : 0
        };
    }

    /**
     * Perform health check
     * @param {Function} healthCheckCall - Function to call for health check
     */
    async performHealthCheck(healthCheckCall) {
        try {
            console.log('[API Handler] Performing health check...');

            const result = await this.makeRequest(
                healthCheckCall,
                {},
                { maxRetries: 1, useCache: false }
            );

            console.log('[API Handler] Health check passed');
            return { healthy: true, result };

        } catch (error) {
            console.error('[API Handler] Health check failed:', error);
            return { healthy: false, error: error.message };
        }
    }

    /**
     * Reset health status (useful for testing or recovery)
     */
    resetHealthStatus() {
        this.healthStatus = {
            isHealthy: true,
            lastCheck: null,
            errorCount: 0,
            successCount: 0
        };
        console.log('[API Handler] Health status reset');
    }

    /**
     * Utility function for delays
     * @param {number} ms - Milliseconds to delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Handle batch requests with rate limiting
     * @param {Array} requests - Array of request configurations
     * @param {Object} options - Batch options
     */
    async handleBatchRequests(requests, options = {}) {
        const {
            batchSize = 3,
            delayBetweenBatches = 1000,
            maxConcurrent = 2
        } = options;

        const results = [];
        const errors = [];

        // Process requests in batches
        for (let i = 0; i < requests.length; i += batchSize) {
            const batch = requests.slice(i, i + batchSize);

            console.log(`[API Handler] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(requests.length / batchSize)}`);

            // Process batch with limited concurrency
            const batchPromises = batch.slice(0, maxConcurrent).map(async (request, index) => {
                try {
                    const result = await this.makeRequest(
                        request.apiCall,
                        request.params,
                        request.options || {}
                    );

                    return {
                        index: i + index,
                        success: true,
                        result
                    };
                } catch (error) {
                    return {
                        index: i + index,
                        success: false,
                        error
                    };
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);

            // Process batch results
            batchResults.forEach(settled => {
                if (settled.status === 'fulfilled') {
                    const result = settled.value;
                    if (result.success) {
                        results[result.index] = result.result;
                    } else {
                        errors[result.index] = result.error;
                    }
                } else {
                    errors.push(settled.reason);
                }
            });

            // Delay between batches
            if (i + batchSize < requests.length) {
                await this.delay(delayBetweenBatches);
            }
        }

        return {
            results,
            errors,
            successCount: results.filter(r => r !== undefined).length,
            errorCount: errors.filter(e => e !== undefined).length
        };
    }
}

// Create singleton instance
const apiHandler = new APIHandler();

export { APIHandler, apiHandler };