/**
 * Gemini API Service - Main API interaction module
 * Handles all communication with Google's Gemini AI API
 * 
 * Features:
 * - Secure API key management
 * - Rate limiting and retry logic
 * - Comment generation for LinkedIn and Twitter
 * - Error handling and fallbacks
 * - Context-aware prompting
 */

class GeminiAPIService {
    constructor() {
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
        this.apiKey = null;
        this.rateLimitDelay = 1000; // 1 second between requests
        this.maxRetries = 3;
        this.lastRequestTime = 0;
        this.requestQueue = [];
        this.isProcessingQueue = false;
    }

    /**
     * Initialize API service with stored API key
     */
    async initialize() {
        try {
            const result = await chrome.storage.sync.get(['geminiApiKey']);
            if (result.geminiApiKey) {
                this.apiKey = result.geminiApiKey;
                console.log('[Gemini API] Service initialized successfully');
                return true;
            } else {
                console.warn('[Gemini API] No API key found in storage');
                return false;
            }
        } catch (error) {
            console.error('[Gemini API] Failed to initialize:', error);
            return false;
        }
    }

    /**
     * Set API key and save to storage
     * @param {string} apiKey - The Gemini API key
     */
    async setApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            throw new Error('Valid API key is required');
        }

        try {
            await chrome.storage.sync.set({ geminiApiKey: apiKey });
            this.apiKey = apiKey;
            console.log('[Gemini API] API key set successfully');
            return true;
        } catch (error) {
            console.error('[Gemini API] Failed to set API key:', error);
            throw error;
        }
    }

    /**
     * Validate if API key is present and properly formatted
     */
    isApiKeyValid() {
        return this.apiKey &&
            typeof this.apiKey === 'string' &&
            this.apiKey.length > 20 &&
            this.apiKey.startsWith('AIza');
    }

    /**
     * Generate a comment for a social media post
     * @param {Object} postData - The extracted post data
     * @param {string} platform - 'linkedin' or 'twitter'
     * @param {Object} options - Additional options for comment generation
     */
    async generateComment(postData, platform, options = {}) {
        if (!this.isApiKeyValid()) {
            throw new Error('Valid API key is required. Please set your Gemini API key in the popup.');
        }

        try {
            // Add to queue for rate limiting
            const request = {
                postData,
                platform,
                options,
                timestamp: Date.now(),
                resolve: null,
                reject: null
            };

            return new Promise((resolve, reject) => {
                request.resolve = resolve;
                request.reject = reject;
                this.requestQueue.push(request);
                this.processQueue();
            });
        } catch (error) {
            console.error('[Gemini API] Comment generation failed:', error);
            throw error;
        }
    }

    /**
     * Process the request queue with rate limiting
     */
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();

            try {
                // Respect rate limiting
                const timeSinceLastRequest = Date.now() - this.lastRequestTime;
                if (timeSinceLastRequest < this.rateLimitDelay) {
                    await this.delay(this.rateLimitDelay - timeSinceLastRequest);
                }

                const comment = await this.makeApiRequest(
                    request.postData,
                    request.platform,
                    request.options
                );

                this.lastRequestTime = Date.now();
                request.resolve(comment);

            } catch (error) {
                request.reject(error);
            }

            // Small delay between processing requests
            await this.delay(100);
        }

        this.isProcessingQueue = false;
    }

    /**
     * Make the actual API request to Gemini
     * @param {Object} postData - The post data
     * @param {string} platform - Platform name
     * @param {Object} options - Generation options
     */
    async makeApiRequest(postData, platform, options = {}) {
        const prompt = await this.buildPrompt(postData, platform, options);
        let lastError = null;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`[Gemini API] Attempt ${attempt}/${this.maxRetries} for comment generation`);

                const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: prompt
                            }]
                        }],
                        generationConfig: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 200,
                            stopSequences: []
                        },
                        safetySettings: [
                            {
                                category: "HARM_CATEGORY_HARASSMENT",
                                threshold: "BLOCK_MEDIUM_AND_ABOVE"
                            },
                            {
                                category: "HARM_CATEGORY_HATE_SPEECH",
                                threshold: "BLOCK_MEDIUM_AND_ABOVE"
                            },
                            {
                                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                                threshold: "BLOCK_MEDIUM_AND_ABOVE"
                            },
                            {
                                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                                threshold: "BLOCK_MEDIUM_AND_ABOVE"
                            }
                        ]
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
                }

                const data = await response.json();

                if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                    throw new Error('Invalid response format from Gemini API');
                }

                const generatedText = data.candidates[0].content.parts[0].text;
                const cleanedComment = this.cleanGeneratedComment(generatedText);

                console.log('[Gemini API] Comment generated successfully');

                // Log the interaction for debugging
                await this.logCommentGeneration(postData, cleanedComment, platform);

                return cleanedComment;

            } catch (error) {
                lastError = error;
                console.error(`[Gemini API] Attempt ${attempt} failed:`, error.message);

                // Wait before retrying (exponential backoff)
                if (attempt < this.maxRetries) {
                    await this.delay(1000 * Math.pow(2, attempt));
                }
            }
        }

        throw lastError || new Error('All retry attempts failed');
    }

    /**
     * Build the prompt for comment generation
     * @param {Object} postData - The post data
     * @param {string} platform - Platform name
     * @param {Object} options - Generation options
     */
    async buildPrompt(postData, platform, options = {}) {
        const { CommentTemplates } = await import('../prompts/comment-templates.js');

        const baseTemplate = CommentTemplates.getTemplate(platform, options.style || 'engaging');
        const contextInfo = this.extractContextInfo(postData);

        return baseTemplate
            .replace('{POST_CONTENT}', postData.content || 'No content available')
            .replace('{AUTHOR_NAME}', postData.author?.name || 'Author')
            .replace('{PLATFORM}', platform)
            .replace('{CONTEXT}', contextInfo)
            .replace('{TONE}', options.tone || 'professional yet friendly')
            .replace('{LENGTH}', options.length || 'concise (1-2 sentences)');
    }

    /**
     * Extract relevant context information from post data
     * @param {Object} postData - The post data
     */
    extractContextInfo(postData) {
        const context = [];

        if (postData.hashtags?.length > 0) {
            context.push(`Hashtags: ${postData.hashtags.slice(0, 3).join(', ')}`);
        }

        if (postData.engagementMetrics?.likes > 0) {
            context.push(`Popular post with ${postData.engagementMetrics.likes} likes`);
        }

        if (postData.author?.jobTitle) {
            context.push(`Author role: ${postData.author.jobTitle}`);
        }

        return context.join('. ') || 'Computer Science related content';
    }

    /**
     * Clean and format the generated comment
     * @param {string} text - Raw generated text
     */
    cleanGeneratedComment(text) {
        // Remove quotes if the entire comment is wrapped in them
        let cleaned = text.trim();
        if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
            (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.slice(1, -1);
        }

        // Remove any markdown formatting
        cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
        cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');     // Italic
        cleaned = cleaned.replace(/__(.*?)__/g, '$1');     // Underline

        // Ensure proper sentence ending
        if (cleaned && !cleaned.match(/[.!?]$/)) {
            cleaned += '.';
        }

        // Limit length (most platforms have limits)
        if (cleaned.length > 280) {
            cleaned = cleaned.substring(0, 277) + '...';
        }

        return cleaned.trim();
    }

    /**
     * Log comment generation for analytics and debugging
     * @param {Object} postData - The original post data
     * @param {string} comment - The generated comment
     * @param {string} platform - The platform
     */
    async logCommentGeneration(postData, comment, platform) {
        try {
            const logEntry = {
                timestamp: Date.now(),
                platform,
                postId: postData.id,
                authorName: postData.author?.name,
                originalContent: postData.content?.substring(0, 100) + '...',
                generatedComment: comment,
                wordCount: comment.split(' ').length
            };

            // Get existing logs
            const result = await chrome.storage.local.get(['commentGenerationLogs']);
            const logs = result.commentGenerationLogs || [];

            // Add new log and keep only last 100 entries
            logs.unshift(logEntry);
            const trimmedLogs = logs.slice(0, 100);

            await chrome.storage.local.set({ commentGenerationLogs: trimmedLogs });
        } catch (error) {
            console.error('[Gemini API] Failed to log comment generation:', error);
        }
    }

    /**
     * Get usage statistics
     */
    async getUsageStats() {
        try {
            const result = await chrome.storage.local.get(['commentGenerationLogs']);
            const logs = result.commentGenerationLogs || [];

            const today = new Date().toDateString();
            const todayLogs = logs.filter(log =>
                new Date(log.timestamp).toDateString() === today
            );

            return {
                totalGenerated: logs.length,
                generatedToday: todayLogs.length,
                avgWordCount: logs.length > 0 ?
                    logs.reduce((sum, log) => sum + log.wordCount, 0) / logs.length : 0,
                platformBreakdown: logs.reduce((acc, log) => {
                    acc[log.platform] = (acc[log.platform] || 0) + 1;
                    return acc;
                }, {})
            };
        } catch (error) {
            console.error('[Gemini API] Failed to get usage stats:', error);
            return { totalGenerated: 0, generatedToday: 0, avgWordCount: 0, platformBreakdown: {} };
        }
    }

    /**
     * Test API connection with a simple request
     */
    async testConnection() {
        if (!this.isApiKeyValid()) {
            throw new Error('Valid API key is required');
        }

        try {
            const testPrompt = "Generate a simple 'Hello, world!' message for testing.";

            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: testPrompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 50
                    }
                })
            });

            if (response.ok) {
                console.log('[Gemini API] Connection test successful');
                return { success: true, message: 'API connection successful' };
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Connection test failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('[Gemini API] Connection test failed:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Utility function for delays
     * @param {number} ms - Milliseconds to delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear API key from storage
     */
    async clearApiKey() {
        try {
            await chrome.storage.sync.remove(['geminiApiKey']);
            this.apiKey = null;
            console.log('[Gemini API] API key cleared');
        } catch (error) {
            console.error('[Gemini API] Failed to clear API key:', error);
            throw error;
        }
    }
}

// Create singleton instance
const geminiAPI = new GeminiAPIService();

// Initialize on script load
if (typeof chrome !== 'undefined' && chrome.storage) {
    geminiAPI.initialize().catch(console.error);
}

export { GeminiAPIService, geminiAPI };