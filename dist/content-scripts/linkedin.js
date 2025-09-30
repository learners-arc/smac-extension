/**
 * LinkedIn Content Script - Advanced post detection and commenting
 * Handles LinkedIn's dynamic content structure and implements intelligent commenting
 * 
 * Features:
 * - Advanced post detection using LinkedIn's data attributes
 * - CS-relevant content filtering
 * - Human-like comment posting with typing simulation
 * - Dynamic content monitoring with mutation observers
 * - Comprehensive error handling and retry mechanisms
 * - Gemini API integration for intelligent comment generation
 */

// Import required modules
import { ContentFilter } from '../utils/content-filter.js';
import { DataExtractor } from '../utils/data-extractor.js';
import { geminiAPI } from '../services/gemini-api.js';

/**
 * LinkedIn Auto-Comment Handler Class
 * Manages all LinkedIn-specific functionality for the extension
 */
class LinkedInHandler {
    constructor() {
        this.isInitialized = false;
        this.isScanning = false;
        this.processedPosts = new Set();
        this.observedElements = new Set();

        // Configuration
        this.config = {
            scanInterval: 5000,           // 5 seconds between scans
            maxPostsPerScan: 10,         // Limit posts processed per scan
            scrollDelay: 2000,           // Delay after scrolling
            retryAttempts: 3,            // Retry attempts for failed operations
            debugMode: false             // Debug logging
        };

        // Selectors for LinkedIn elements
        this.selectors = {
            feed: '.scaffold-finite-scroll__content',
            posts: '.feed-shared-update-v2, .ember-view[data-urn*="activity"]',
            author: {
                name: '.feed-shared-actor__name, .update-components-actor__name',
                headline: '.feed-shared-actor__description, .update-components-actor__description',
                profile: '.feed-shared-actor__name a, .update-components-actor__name a'
            },
            content: {
                text: '.feed-shared-text, .update-components-text',
                showMore: '.feed-shared-text__see-more-link'
            },
            engagement: {
                likes: '.social-counts-reactions__count',
                comments: '.social-counts-comments__count',
                shares: '.social-counts-shares__count'
            },
            actions: {
                commentButton: '.feed-shared-social-action-bar__action-button[aria-label*="comment" i]',
                commentBox: '.comments-comment-box-comment__text-editor',
                submitButton: '.comments-comment-box__submit-button:not([disabled])'
            }
        };

        // Statistics
        this.stats = {
            postsScanned: 0,
            postsRelevant: 0,
            commentsPosted: 0,
            errors: 0,
            lastScanTime: null
        };

        // Bind methods
        this.handleMessage = this.handleMessage.bind(this);
        this.scanForPosts = this.scanForPosts.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
    }

    /**
     * Initialize the LinkedIn handler
     */
    async initialize() {
        if (this.isInitialized) {
            this.log('LinkedIn handler already initialized');
            return;
        }

        try {
            this.log('Initializing LinkedIn content script...');

            // Check if we're on LinkedIn
            if (!this.isLinkedInPage()) {
                this.log('Not on LinkedIn page, skipping initialization');
                return;
            }

            // Wait for page to load completely
            await this.waitForPageLoad();

            // Set up message listener
            chrome.runtime.onMessage.addListener(this.handleMessage);

            // Set up mutation observer for dynamic content
            this.setupMutationObserver();

            // Set up scroll handler for infinite scroll
            this.setupScrollHandler();

            // Initial scan for posts
            setTimeout(() => this.scanForPosts(), 2000);

            this.isInitialized = true;
            this.log('LinkedIn handler initialized successfully');

            // Notify background script
            chrome.runtime.sendMessage({
                type: 'CONTENT_SCRIPT_READY',
                platform: 'LINKEDIN',
                url: window.location.href,
                timestamp: Date.now()
            });

        } catch (error) {
            this.error('Error initializing LinkedIn handler:', error);
        }
    }

    /**
     * Handle messages from background script
     * @param {Object} message - Message object
     * @param {Object} sender - Message sender
     * @param {Function} sendResponse - Response callback
     */
    handleMessage(message, sender, sendResponse) {
        try {
            this.log('Received message:', message.type);

            switch (message.type) {
                case 'SCAN_FOR_POSTS':
                    this.scanForPosts().then(posts => {
                        sendResponse({ success: true, posts });
                    }).catch(error => {
                        this.error('Error scanning posts:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                    return true; // Keep message channel open for async response

                case 'POST_COMMENT':
                    this.postComment(message.postId, message.comment).then(result => {
                        sendResponse(result);
                    }).catch(error => {
                        this.error('Error posting comment:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                    return true;

                case 'GET_STATS':
                    sendResponse({ success: true, stats: this.stats });
                    break;

                case 'TOGGLE_DEBUG':
                    this.config.debugMode = message.enabled;
                    sendResponse({ success: true, debugMode: this.config.debugMode });
                    break;

                default:
                    this.log('Unknown message type:', message.type);
                    sendResponse({ success: false, error: 'Unknown message type' });
            }
        } catch (error) {
            this.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Scan the page for posts and extract data
     * @returns {Promise<Array>} Array of extracted post data
     */
    async scanForPosts() {
        if (this.isScanning) {
            this.log('Scan already in progress, skipping');
            return [];
        }

        this.isScanning = true;
        const extractedPosts = [];

        try {
            this.log('Starting post scan...');
            this.stats.lastScanTime = Date.now();

            // Wait for feed to load
            await this.waitForElement(this.selectors.feed);

            // Get all post elements
            const postElements = document.querySelectorAll(this.selectors.posts);
            this.log(`Found ${postElements.length} potential posts`);

            let processed = 0;
            for (const postElement of postElements) {
                if (processed >= this.config.maxPostsPerScan) {
                    this.log(`Reached max posts per scan (${this.config.maxPostsPerScan})`);
                    break;
                }

                try {
                    const postData = await this.extractPostData(postElement);
                    if (postData && !this.processedPosts.has(postData.id)) {

                        // Analyze content for relevance
                        const analysis = this.analyzeContentRelevance(postData);
                        postData.analysis = analysis;

                        if (analysis.isRelevant) {
                            extractedPosts.push(postData);
                            this.stats.postsRelevant++;
                            this.log(`Relevant post found: ${postData.id}`);
                        }

                        this.processedPosts.add(postData.id);
                        this.stats.postsScanned++;
                        processed++;
                    }
                } catch (error) {
                    this.error('Error processing post:', error);
                    this.stats.errors++;
                }
            }

            this.log(`Scan completed: ${processed} posts processed, ${extractedPosts.length} relevant`);

            // Send results to background script if any relevant posts found
            if (extractedPosts.length > 0) {
                chrome.runtime.sendMessage({
                    type: 'POSTS_EXTRACTED',
                    platform: 'LINKEDIN',
                    posts: extractedPosts,
                    stats: this.stats,
                    timestamp: Date.now()
                });
            }

            return extractedPosts;

        } catch (error) {
            this.error('Error during post scan:', error);
            this.stats.errors++;
            return [];
        } finally {
            this.isScanning = false;
        }
    }

    /**
     * Extract data from a single post element
     * @param {Element} postElement - DOM element containing the post
     * @returns {Promise<Object|null>} Extracted post data or null if failed
     */
    async extractPostData(postElement) {
        try {
            if (!postElement || !this.isValidPost(postElement)) {
                return null;
            }

            // Expand "see more" content if available
            await this.expandPostContent(postElement);

            // Use data extractor utility (simplified version for now)
            const postData = {
                platform: 'LINKEDIN',
                id: this.extractPostId(postElement),
                author: this.extractAuthorData(postElement),
                content: this.extractContentData(postElement),
                engagement: this.extractEngagementData(postElement),
                metadata: {
                    extractedAt: new Date().toISOString(),
                    url: window.location.href,
                    postElement: postElement.outerHTML.substring(0, 500) + '...' // First 500 chars for debugging
                }
            };

            // Validate extracted data
            if (!postData.id || !postData.author.name) {
                this.log('Invalid post data, skipping');
                return null;
            }

            return postData;

        } catch (error) {
            this.error('Error extracting post data:', error);
            return null;
        }
    }

    /**
     * Extract post ID from element
     * @param {Element} postElement - Post DOM element
     * @returns {string} Post ID
     */
    extractPostId(postElement) {
        // Try data-urn attribute first
        const urn = postElement.getAttribute('data-urn') ||
            postElement.querySelector('[data-urn]')?.getAttribute('data-urn');

        if (urn) {
            const urnMatch = urn.match(/activity:(\d+)/);
            if (urnMatch) return urnMatch[1];
        }

        // Fallback: generate ID from element
        const elementId = postElement.id || postElement.className;
        return `linkedin_${Date.now()}_${this.simpleHash(elementId)}`;
    }

    /**
     * Extract author data from post element
     * @param {Element} postElement - Post DOM element
     * @returns {Object} Author data
     */
    extractAuthorData(postElement) {
        const author = { name: '', headline: '', profileUrl: '' };

        try {
            const nameElement = postElement.querySelector(this.selectors.author.name);
            if (nameElement) author.name = nameElement.textContent.trim();

            const headlineElement = postElement.querySelector(this.selectors.author.headline);
            if (headlineElement) author.headline = headlineElement.textContent.trim();

            const profileElement = postElement.querySelector(this.selectors.author.profile);
            if (profileElement) author.profileUrl = profileElement.href;

        } catch (error) {
            this.error('Error extracting author data:', error);
        }

        return author;
    }

    /**
     * Extract content data from post element
     * @param {Element} postElement - Post DOM element
     * @returns {Object} Content data
     */
    extractContentData(postElement) {
        const content = { text: '', hashtags: [] };

        try {
            const textElement = postElement.querySelector(this.selectors.content.text);
            if (textElement) {
                content.text = textElement.textContent.trim();
                content.hashtags = this.extractHashtags(content.text);
            }
        } catch (error) {
            this.error('Error extracting content data:', error);
        }

        return content;
    }

    /**
     * Extract engagement data from post element
     * @param {Element} postElement - Post DOM element
     * @returns {Object} Engagement data
     */
    extractEngagementData(postElement) {
        const engagement = { likes: 0, comments: 0, shares: 0 };

        try {
            const likesElement = postElement.querySelector(this.selectors.engagement.likes);
            if (likesElement) engagement.likes = this.parseCount(likesElement.textContent);

            const commentsElement = postElement.querySelector(this.selectors.engagement.comments);
            if (commentsElement) engagement.comments = this.parseCount(commentsElement.textContent);

            const sharesElement = postElement.querySelector(this.selectors.engagement.shares);
            if (sharesElement) engagement.shares = this.parseCount(sharesElement.textContent);

        } catch (error) {
            this.error('Error extracting engagement data:', error);
        }

        return engagement;
    }

    /**
 * Analyze content for CS relevance using simplified filtering
 * @param {Object} postData - Post data to analyze
 * @returns {Object} Analysis result
 */
    analyzeContentRelevance(postData) {
        try {
            // Simplified content analysis (full contentFilter integration would be better)
            const text = (postData.content.text + ' ' + postData.author.headline).toLowerCase();

            // CS-relevant keywords
            const csKeywords = [
                'programming', 'coding', 'software', 'development', 'developer',
                'javascript', 'python', 'java', 'react', 'nodejs', 'api',
                'algorithm', 'data structure', 'frontend', 'backend',
                'computer science', 'cs', 'internship', 'tech', 'startup'
            ];

            let score = 0;
            const foundKeywords = [];

            csKeywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    score += 1;
                    foundKeywords.push(keyword);
                }
            });

            return {
                isRelevant: score >= 2, // Require at least 2 CS keywords
                relevanceScore: score,
                foundKeywords,
                reasoning: [`Found ${foundKeywords.length} CS-related keywords: ${foundKeywords.join(', ')}`],
                confidence: Math.min(score * 20, 100) // 0-100% confidence
            };

        } catch (error) {
            this.error('Error analyzing content relevance:', error);
            return { isRelevant: false, relevanceScore: 0, reasoning: ['Analysis failed'] };
        }
    }

    /**
     * Post a comment on a LinkedIn post with Gemini API integration
     * @param {string} postId - Post ID to comment on
     * @param {string|Object} commentOrPostData - Comment text or post data object
     * @returns {Promise<Object>} Result object
     */
    async postComment(postId, commentOrPostData) {
        try {
            this.log(`Attempting to post comment on post ${postId}`);

            let comment;
            let postData;

            // Handle both old API (comment string) and new API (post data object)
            if (typeof commentOrPostData === 'string') {
                // Legacy usage - direct comment string
                comment = commentOrPostData;
            } else {
                // New usage - post data object, generate comment with Gemini API
                postData = commentOrPostData;
                comment = await this.generateCommentWithGemini(postData);

                if (!comment) {
                    throw new Error('Failed to generate comment');
                }
            }

            // Find the post element by ID
            const postElement = await this.findPostElementById(postId);
            if (!postElement) {
                throw new Error(`Post element not found for ID: ${postId}`);
            }

            // Click comment button to expand comment box
            const commentButton = postElement.querySelector(this.selectors.actions.commentButton);
            if (commentButton) {
                commentButton.click();
                await this.delay(1000);
            }

            // Find comment box
            const commentBox = postElement.querySelector(this.selectors.actions.commentBox);
            if (!commentBox) {
                throw new Error('Comment box not found');
            }

            // Type comment with human-like behavior
            await this.typeWithDelay(commentBox, comment);

            // Wait a moment before submitting
            await this.delay(2000);

            // Find and click submit button
            const submitButton = postElement.querySelector(this.selectors.actions.submitButton);
            if (!submitButton) {
                throw new Error('Submit button not found or disabled');
            }

            submitButton.click();

            // Wait for submission to complete
            await this.delay(3000);

            this.stats.commentsPosted++;
            this.log(`Comment posted successfully on post ${postId}`);

            // Log the activity if we have post data
            if (postData) {
                await this.logCommentActivity(postData, comment, 'success');
            }

            return {
                success: true,
                postId,
                comment,
                generatedComment: postData ? true : false,
                timestamp: Date.now()
            };

        } catch (error) {
            this.error('Error posting comment:', error);
            this.stats.errors++;

            // Log the error if we have post data
            if (typeof commentOrPostData === 'object') {
                await this.logCommentActivity(commentOrPostData, comment || null, 'error', error.message);
            }

            return {
                success: false,
                postId,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Generate comment using Gemini API
     * @param {Object} postData - The post data
     * @return {Promise<string|null>} - Generated comment or null
     */
    async generateCommentWithGemini(postData) {
        try {
            // Get user preferences for comment style
            const settings = await chrome.storage.sync.get([
                'commentStyle',
                'commentTone',
                'commentLength'
            ]);

            const options = {
                style: settings.commentStyle || 'engaging',
                tone: settings.commentTone || 'professional yet friendly',
                length: settings.commentLength || 'concise (1-2 sentences)'
            };

            this.log('Generating comment with Gemini API, options:', options);

            // Generate comment using Gemini API
            const comment = await geminiAPI.generateComment(postData, 'linkedin', options);

            if (!comment || comment.trim().length === 0) {
                console.warn('[LinkedIn Handler] Empty comment generated');
                return null;
            }

            // Additional validation for LinkedIn
            if (comment.length > 1200) { // LinkedIn comment limit
                console.warn('[LinkedIn Handler] Comment too long, truncating');
                return comment.substring(0, 1197) + '...';
            }

            this.log('Generated comment:', comment);
            return comment;

        } catch (error) {
            this.error('Failed to generate comment with Gemini API:', error);

            // Check if it's an API key issue
            if (error.message.includes('API key')) {
                // Notify background script about API key issue
                chrome.runtime.sendMessage({
                    type: 'API_KEY_ERROR',
                    platform: 'linkedin',
                    message: 'Please set your Gemini API key in the extension popup.'
                });
            }

            return null;
        }
    }

    /**
     * Log comment activity for analytics and debugging
     * @param {Object} postData - The post data
     * @param {string} comment - The generated comment
     * @param {string} status - Status: 'success', 'failed', 'error'
     * @param {string} errorMessage - Error message if applicable
     */
    async logCommentActivity(postData, comment, status, errorMessage = null) {
        try {
            const logEntry = {
                timestamp: Date.now(),
                platform: 'linkedin',
                postId: postData.id,
                authorName: postData.author?.name,
                postContent: postData.content?.substring(0, 100) + '...',
                generatedComment: comment,
                status,
                errorMessage,
                relevanceScore: postData.relevanceAnalysis?.score || 0
            };

            // Get existing logs
            const result = await chrome.storage.local.get(['commentLogs']);
            const logs = result.commentLogs || [];

            // Add new log and keep only last 200 entries
            logs.unshift(logEntry);
            const trimmedLogs = logs.slice(0, 200);

            await chrome.storage.local.set({ commentLogs: trimmedLogs });

        } catch (error) {
            this.error('Failed to log comment activity:', error);
        }
    }

    /**
     * Utility methods
     */

    isLinkedInPage() {
        return window.location.hostname === 'www.linkedin.com';
    }

    async waitForPageLoad() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }

    async waitForElement(selector, timeout = 10000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const element = document.querySelector(selector);
            if (element) return element;

            await this.delay(100);
        }

        throw new Error(`Element ${selector} not found within ${timeout}ms`);
    }

    isValidPost(postElement) {
        // Check if element has required attributes
        return postElement &&
            (postElement.hasAttribute('data-urn') || postElement.querySelector('[data-urn]')) &&
            postElement.querySelector(this.selectors.author.name);
    }

    async expandPostContent(postElement) {
        try {
            const showMoreButton = postElement.querySelector(this.selectors.content.showMore);
            if (showMoreButton) {
                showMoreButton.click();
                await this.delay(500);
            }
        } catch (error) {
            // Ignore errors - not critical
        }
    }

    extractHashtags(text) {
        if (!text) return [];
        const matches = text.match(/#[\w\u0590-\u05ff]+/gi);
        return matches ? matches.map(tag => tag.toLowerCase()) : [];
    }

    parseCount(text) {
        if (!text) return 0;
        const cleanText = text.replace(/[^\d.,kKmM]/g, '');

        if (cleanText.includes('K') || cleanText.includes('k')) {
            return Math.floor(parseFloat(cleanText) * 1000);
        }
        if (cleanText.includes('M') || cleanText.includes('m')) {
            return Math.floor(parseFloat(cleanText) * 1000000);
        }

        return parseInt(cleanText) || 0;
    }

    async findPostElementById(postId) {
        const allPosts = document.querySelectorAll(this.selectors.posts);

        for (const post of allPosts) {
            const extractedId = this.extractPostId(post);
            if (extractedId === postId) {
                return post;
            }
        }

        return null;
    }

    async typeWithDelay(element, text, delay = 50) {
        element.focus();
        element.textContent = '';

        for (let i = 0; i < text.length; i++) {
            element.textContent += text[i];

            // Trigger input events
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));

            await this.delay(delay + Math.random() * 30); // Add randomness
        }
    }

    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // New posts might have been loaded
                    setTimeout(() => this.scanForPosts(), 1000);
                }
            });
        });

        const feedElement = document.querySelector(this.selectors.feed);
        if (feedElement) {
            observer.observe(feedElement, {
                childList: true,
                subtree: true
            });
        }
    }

    setupScrollHandler() {
        let scrollTimeout;

        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                // Check if near bottom of page
                const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

                if (scrollTop + clientHeight >= scrollHeight - 1000) {
                    this.log('Near bottom of page, scanning for new posts');
                    setTimeout(() => this.scanForPosts(), this.config.scrollDelay);
                }
            }, 500);
        });
    }

    handleScroll() {
        // Additional scroll handling if needed
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    log(...args) {
        if (this.config.debugMode) {
            console.log('[LinkedIn Handler]', ...args);
        }
    }

    error(...args) {
        console.error('[LinkedIn Handler Error]', ...args);
    }
}

// Initialize LinkedIn handler
const linkedInHandler = new LinkedInHandler();

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        linkedInHandler.initialize();
    });
} else {
    linkedInHandler.initialize();
}

// Handle page navigation (LinkedIn is SPA)
let currentUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        console.log('LinkedIn page navigation detected, reinitializing...');

        // Reinitialize after navigation
        setTimeout(() => {
            linkedInHandler.initialize();
        }, 2000);
    }
});

urlObserver.observe(document, { subtree: true, childList: true });

// Global access for debugging
window.linkedInHandler = linkedInHandler;

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { onLinkedInPageReady };
}