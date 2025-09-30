/**
 * Twitter/X Content Script for Social Media Auto-Comment Extension
 * 
 * This script runs on Twitter/X pages to detect posts, extract data,
 * filter for CS-relevant content, and coordinate with the background
 * script for automated commenting.
 * 
 * Target selectors:
 * - Posts: article[data-testid="tweet"], .css-175oi2r
 * - Comment box: [data-testid="tweetTextarea_0"], .public-DraftEditorPlaceholder-inner
 * 
 * Part 7: Enhanced with Gemini API integration for intelligent comment generation
 */

// Global references for dynamically imported modules
let twitterSelectors, ContentFilter, DataExtractor, geminiAPI;

/**
 * Initialize modules using dynamic imports
/**
 * Initialize modules using dynamic imports
 */
async function initializeModules() {
    try {
        const twitterSelectorsModule = await import(chrome.runtime.getURL('utils/twitter-selectors.js'));
        const contentFilterModule = await import(chrome.runtime.getURL('utils/content-filter.js'));
        const dataExtractorModule = await import(chrome.runtime.getURL('utils/data-extractor.js'));
        const geminiModule = await import(chrome.runtime.getURL('services/gemini-api.js'));

        twitterSelectors = twitterSelectorsModule.twitterSelectors;
        ContentFilter = contentFilterModule.ContentFilter;
        DataExtractor = dataExtractorModule.DataExtractor;
        geminiAPI = geminiModule.geminiAPI;

        console.log('[Twitter] Modules loaded successfully');
        return true;
    } catch (error) {
        console.error('[Twitter] Failed to load modules:', error);
        return false;
    }
}

/**
 * Initialize Twitter handler when page is ready
 */
async function initializeTwitterHandler() {
    console.log('Twitter page ready, initializing handler...');

    // Initialize modules first
    const modulesLoaded = await initializeModules();
    if (!modulesLoaded) {
        console.error('[Twitter] Failed to load required modules');
        return;
    }

    // Now initialize the handler
    twitterHandler.initialize();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTwitterHandler);
} else {
    initializeTwitterHandler();
}

/**
 * Twitter/X Auto-Comment Handler Class
 * Manages all Twitter/X-specific functionality for the extension
 */
class TwitterHandler {
    constructor() {
        this.isInitialized = false;
        this.isScanning = false;
        this.processedTweets = new Set();
        this.observedElements = new Set();

        // Configuration
        this.config = {
            scanInterval: 5000,           // 5 seconds between scans
            maxTweetsPerScan: 10,        // Limit tweets processed per scan
            scrollDelay: 2000,           // Delay after scrolling
            retryAttempts: 3,            // Retry attempts for failed operations
            debugMode: false,            // Debug logging
            replyDelay: 3000            // Delay before submitting reply
        };

        // Twitter/X selectors (fallback if utility not available)
        this.selectors = {
            timeline: '[data-testid="primaryColumn"]',
            posts: 'article[data-testid="tweet"], [data-testid="tweet"], .css-175oi2r[data-testid="tweet"]',
            author: {
                name: '[data-testid="User-Name"] span, .css-1jxf684 span',
                username: '[data-testid="User-Name"] a[href^="/"], .css-1qaijid',
                avatar: '[data-testid="Tweet-User-Avatar"] img, .css-9pa8cd img'
            },
            content: {
                text: '[data-testid="tweetText"], .css-1rynq56, [data-testid="tweetText"] span',
                media: '[data-testid="tweetPhoto"] img, [data-testid="videoComponent"] video',
                links: '[data-testid="card.wrapper"], .css-4rbku5'
            },
            engagement: {
                likes: '[data-testid="like"] span, [aria-label*="likes"] span',
                retweets: '[data-testid="retweet"] span, [aria-label*="retweets"] span',
                replies: '[data-testid="reply"] span, [aria-label*="replies"] span'
            },
            actions: {
                replyButton: '[data-testid="reply"], [aria-label*="Reply"]',
                likeButton: '[data-testid="like"], [aria-label*="Like"]',
                retweetButton: '[data-testid="retweet"], [aria-label*="Retweet"]'
            },
            compose: {
                textArea: '[data-testid="tweetTextarea_0"], .public-DraftEditorPlaceholder-inner, .DraftEditor-editorContainer',
                submitButton: '[data-testid="tweetButtonInline"], [data-testid="tweetButton"]',
                modal: '[data-testid="tweetTextarea_0"]'
            },
            metadata: {
                timestamp: 'time[datetime], [data-testid="Time"] time',
                promoted: '[data-testid="promotedIndicator"]'
            }
        };

        // Statistics
        this.stats = {
            tweetsScanned: 0,
            tweetsRelevant: 0,
            repliesPosted: 0,
            errors: 0,
            lastScanTime: null
        };

        // Bind methods
        this.handleMessage = this.handleMessage.bind(this);
        this.scanForTweets = this.scanForTweets.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
    }

    /**
     * Initialize the Twitter handler
     */
    async initialize() {
        if (this.isInitialized) {
            this.log('Twitter handler already initialized');
            return;
        }

        try {
            this.log('Initializing Twitter/X content script...');

            // Check if we're on Twitter/X
            if (!this.isTwitterPage()) {
                this.log('Not on Twitter/X page, skipping initialization');
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

            // Initial scan for tweets
            setTimeout(() => this.scanForTweets(), 3000);

            this.isInitialized = true;
            this.log('Twitter handler initialized successfully');

            // Notify background script
            chrome.runtime.sendMessage({
                type: 'CONTENT_SCRIPT_READY',
                platform: 'TWITTER',
                url: window.location.href,
                timestamp: Date.now()
            });

        } catch (error) {
            this.error('Error initializing Twitter handler:', error);
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
                    this.scanForTweets().then(tweets => {
                        sendResponse({ success: true, posts: tweets });
                    }).catch(error => {
                        this.error('Error scanning tweets:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                    return true; // Keep message channel open for async response

                case 'POST_COMMENT':
                    this.postReply(message.postId, message.comment).then(result => {
                        sendResponse(result);
                    }).catch(error => {
                        this.error('Error posting reply:', error);
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
     * Scan the page for tweets and extract data
     * @returns {Promise<Array>} Array of extracted tweet data
     */
    async scanForTweets() {
        if (this.isScanning) {
            this.log('Scan already in progress, skipping');
            return [];
        }

        this.isScanning = true;
        const extractedTweets = [];

        try {
            this.log('Starting tweet scan...');
            this.stats.lastScanTime = Date.now();

            // Wait for timeline to load
            await this.waitForElement(this.selectors.timeline);

            // Get all tweet elements
            const tweetElements = document.querySelectorAll(this.selectors.posts);
            this.log(`Found ${tweetElements.length} potential tweets`);

            let processed = 0;
            for (const tweetElement of tweetElements) {
                if (processed >= this.config.maxTweetsPerScan) {
                    this.log(`Reached max tweets per scan (${this.config.maxTweetsPerScan})`);
                    break;
                }

                try {
                    const tweetData = await this.extractTweetData(tweetElement);
                    if (tweetData && !this.processedTweets.has(tweetData.id)) {

                        // Analyze content for relevance
                        const analysis = this.analyzeContentRelevance(tweetData);
                        tweetData.analysis = analysis;

                        if (analysis.isRelevant) {
                            extractedTweets.push(tweetData);
                            this.stats.tweetsRelevant++;
                            this.log(`Relevant tweet found: ${tweetData.id}`);
                        }

                        this.processedTweets.add(tweetData.id);
                        this.stats.tweetsScanned++;
                        processed++;
                    }
                } catch (error) {
                    this.error('Error processing tweet:', error);
                    this.stats.errors++;
                }
            }

            this.log(`Scan completed: ${processed} tweets processed, ${extractedTweets.length} relevant`);

            // Send results to background script if any relevant tweets found
            if (extractedTweets.length > 0) {
                chrome.runtime.sendMessage({
                    type: 'POSTS_EXTRACTED',
                    platform: 'TWITTER',
                    posts: extractedTweets,
                    stats: this.stats,
                    timestamp: Date.now()
                });
            }

            return extractedTweets;

        } catch (error) {
            this.error('Error during tweet scan:', error);
            this.stats.errors++;
            return [];
        } finally {
            this.isScanning = false;
        }
    }

    /**
     * Extract data from a single tweet element
     * @param {Element} tweetElement - DOM element containing the tweet
     * @returns {Promise<Object|null>} Extracted tweet data or null if failed
     */
    async extractTweetData(tweetElement) {
        try {
            if (!tweetElement || !this.isValidTweet(tweetElement)) {
                return null;
            }

            const tweetData = {
                platform: 'TWITTER',
                id: this.extractTweetId(tweetElement),
                author: this.extractAuthorData(tweetElement),
                content: this.extractContentData(tweetElement),
                engagement: this.extractEngagementData(tweetElement),
                metadata: {
                    extractedAt: new Date().toISOString(),
                    url: window.location.href,
                    isXInterface: this.isXInterface(),
                    tweetElement: tweetElement.outerHTML.substring(0, 500) + '...' // First 500 chars for debugging
                }
            };

            // Validate extracted data
            if (!tweetData.id || !tweetData.author.username) {
                this.log('Invalid tweet data, skipping');
                return null;
            }

            return tweetData;

        } catch (error) {
            this.error('Error extracting tweet data:', error);
            return null;
        }
    }

    /**
     * Extract tweet ID from element
     * @param {Element} tweetElement - Tweet DOM element
     * @returns {string} Tweet ID
     */
    extractTweetId(tweetElement) {
        // Try to extract from various sources
        if (tweetElement.hasAttribute('data-tweet-id')) {
            return tweetElement.getAttribute('data-tweet-id');
        }

        // Look for status links
        const statusLinks = tweetElement.querySelectorAll('a[href*="/status/"]');
        for (const link of statusLinks) {
            const match = link.href.match(/\/status\/(\d+)/);
            if (match) return match[1];
        }

        // Look for timestamp link
        const timeElement = tweetElement.querySelector(this.selectors.metadata.timestamp);
        if (timeElement && timeElement.closest('a')) {
            const match = timeElement.closest('a').href.match(/\/status\/(\d+)/);
            if (match) return match[1];
        }

        // Fallback: generate ID from element
        const elementId = tweetElement.id || tweetElement.className;
        return `twitter_${Date.now()}_${this.simpleHash(elementId)}`;
    }

    /**
     * Extract author data from tweet element
     * @param {Element} tweetElement - Tweet DOM element
     * @returns {Object} Author data
     */
    extractAuthorData(tweetElement) {
        const author = { name: '', username: '', profileUrl: '', avatar: '' };

        try {
            // Extract display name
            const nameElement = tweetElement.querySelector(this.selectors.author.name);
            if (nameElement) {
                author.name = nameElement.textContent.trim();
            }

            // Extract username and profile URL
            const usernameElement = tweetElement.querySelector(this.selectors.author.username);
            if (usernameElement) {
                const username = usernameElement.textContent.trim();
                author.username = username.startsWith('@') ? username.substring(1) : username;
                author.profileUrl = usernameElement.href;
            }

            // Extract avatar
            const avatarElement = tweetElement.querySelector(this.selectors.author.avatar);
            if (avatarElement) {
                author.avatar = avatarElement.src;
            }

        } catch (error) {
            this.error('Error extracting author data:', error);
        }

        return author;
    }

    /**
     * Extract content data from tweet element
     * @param {Element} tweetElement - Tweet DOM element
     * @returns {Object} Content data
     */
    extractContentData(tweetElement) {
        const content = { text: '', hashtags: [], mentions: [], media: [] };

        try {
            // Extract tweet text
            const textElement = tweetElement.querySelector(this.selectors.content.text);
            if (textElement) {
                content.text = textElement.textContent.trim();
                content.hashtags = this.extractHashtags(content.text);
                content.mentions = this.extractMentions(content.text);
            }

            // Extract media
            const mediaElements = tweetElement.querySelectorAll(this.selectors.content.media);
            mediaElements.forEach(media => {
                if (media.tagName.toLowerCase() === 'img') {
                    content.media.push({
                        type: 'image',
                        url: media.src,
                        alt: media.alt || ''
                    });
                } else if (media.tagName.toLowerCase() === 'video') {
                    content.media.push({
                        type: 'video',
                        url: media.src || media.currentSrc,
                        poster: media.poster || ''
                    });
                }
            });

        } catch (error) {
            this.error('Error extracting content data:', error);
        }

        return content;
    }

    /**
     * Extract engagement data from tweet element
     * @param {Element} tweetElement - Tweet DOM element
     * @returns {Object} Engagement data
     */
    extractEngagementData(tweetElement) {
        const engagement = { likes: 0, retweets: 0, replies: 0 };

        try {
            // Extract likes
            const likesElement = tweetElement.querySelector(this.selectors.engagement.likes);
            if (likesElement) {
                engagement.likes = this.parseCount(likesElement.textContent);
            }

            // Extract retweets
            const retweetsElement = tweetElement.querySelector(this.selectors.engagement.retweets);
            if (retweetsElement) {
                engagement.retweets = this.parseCount(retweetsElement.textContent);
            }

            // Extract replies
            const repliesElement = tweetElement.querySelector(this.selectors.engagement.replies);
            if (repliesElement) {
                engagement.replies = this.parseCount(repliesElement.textContent);
            }

        } catch (error) {
            this.error('Error extracting engagement data:', error);
        }

        return engagement;
    }

    /**
     * Analyze content for CS relevance using simplified filtering
     * @param {Object} tweetData - Tweet data to analyze
     * @returns {Object} Analysis result
     */
    analyzeContentRelevance(tweetData) {
        try {
            // Simplified content analysis (full contentFilter integration would be better)
            const text = (tweetData.content.text + ' ' + tweetData.author.name).toLowerCase();

            // CS-relevant keywords
            const csKeywords = [
                'programming', 'coding', 'software', 'development', 'developer',
                'javascript', 'python', 'java', 'react', 'nodejs', 'api',
                'algorithm', 'data structure', 'frontend', 'backend',
                'computer science', 'cs', 'internship', 'tech', 'startup',
                'webdev', 'fullstack', 'devops', 'machinelearning', 'ai'
            ];

            let score = 0;
            const foundKeywords = [];

            csKeywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    score += 1;
                    foundKeywords.push(keyword);
                }
            });

            // Bonus for tech hashtags
            const techHashtags = ['#programming', '#coding', '#javascript', '#python', '#react', '#webdev', '#tech', '#startup'];
            techHashtags.forEach(hashtag => {
                if (tweetData.content.hashtags.includes(hashtag.toLowerCase())) {
                    score += 2; // Higher weight for hashtags
                    foundKeywords.push(hashtag);
                }
            });

            return {
                isRelevant: score >= 2, // Require at least 2 CS keywords/hashtags
                relevanceScore: score,
                foundKeywords,
                reasoning: [`Found ${foundKeywords.length} CS-related terms: ${foundKeywords.join(', ')}`],
                confidence: Math.min(score * 20, 100) // 0-100% confidence
            };

        } catch (error) {
            this.error('Error analyzing content relevance:', error);
            return { isRelevant: false, relevanceScore: 0, reasoning: ['Analysis failed'] };
        }
    }

    /**
     * Post a reply to a Twitter post
     * @param {string} tweetId - Tweet ID to reply to
     * @param {string} reply - Reply text
     * @returns {Promise<Object>} Result object
     */
    /**
     * Post a reply to a Twitter/X tweet with Gemini API integration
     * @param {string} tweetId - Tweet ID to reply to
     * @param {string|Object} replyOrTweetData - Reply text or tweet data object
     * @returns {Promise<Object>} Result object
     */
    async postReply(tweetId, replyOrTweetData) {
        try {
            this.log(`Attempting to post reply on tweet ${tweetId}`);

            let reply;
            let tweetData;

            // Handle both old API (reply string) and new API (tweet data object)
            if (typeof replyOrTweetData === 'string') {
                // Legacy usage - direct reply string
                reply = replyOrTweetData;
            } else {
                // New usage - tweet data object, generate reply with Gemini API
                tweetData = replyOrTweetData;
                reply = await this.generateReplyWithGemini(tweetData);

                if (!reply) {
                    throw new Error('Failed to generate reply');
                }
            }

            // Find the tweet element by ID
            const tweetElement = await this.findTweetElementById(tweetId);
            if (!tweetElement) {
                throw new Error(`Tweet element not found for ID: ${tweetId}`);
            }

            // Click reply button to open compose modal
            const replyButton = tweetElement.querySelector(this.selectors.actions.replyButton);
            if (!replyButton) {
                throw new Error('Reply button not found');
            }

            replyButton.click();
            await this.delay(2000); // Wait for modal to open

            // Find text area in the compose modal
            const textArea = await this.waitForElement(this.selectors.compose.textArea, 5000);
            if (!textArea) {
                throw new Error('Reply text area not found');
            }

            // Type reply with human-like behavior
            await this.typeWithDelay(textArea, reply);

            // Wait before submitting
            await this.delay(this.config.replyDelay);

            // Find and click submit button
            const submitButton = document.querySelector(this.selectors.compose.submitButton);
            if (!submitButton || submitButton.disabled) {
                throw new Error('Submit button not found or disabled');
            }

            submitButton.click();

            // Wait for submission to complete
            await this.delay(3000);

            this.stats.repliesPosted++;
            this.log(`Reply posted successfully on tweet ${tweetId}`);

            // Log the activity if we have tweet data
            if (tweetData) {
                await this.logReplyActivity(tweetData, reply, 'success');
            }

            return {
                success: true,
                postId: tweetId,
                comment: reply,
                generatedReply: tweetData ? true : false,
                timestamp: Date.now()
            };

        } catch (error) {
            this.error('Error posting reply:', error);
            this.stats.errors++;

            // Log the error if we have tweet data
            if (typeof replyOrTweetData === 'object') {
                await this.logReplyActivity(replyOrTweetData, reply || null, 'error', error.message);
            }

            return {
                success: false,
                postId: tweetId,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Generate reply using Gemini API
     * @param {Object} tweetData - The tweet data
     * @return {Promise<string|null>} - Generated reply or null
     */
    async generateReplyWithGemini(tweetData) {
        try {
            // Get user preferences for reply style
            const settings = await chrome.storage.sync.get([
                'commentStyle',
                'commentTone',
                'commentLength'
            ]);

            const options = {
                style: settings.commentStyle || 'casual', // Twitter defaults to casual
                tone: settings.commentTone || 'friendly',
                length: settings.commentLength || 'concise (1 sentence)'
            };

            this.log('Generating reply with Gemini API, options:', options);

            // Generate reply using Gemini API
            const reply = await geminiAPI.generateComment(tweetData, 'twitter', options);

            if (!reply || reply.trim().length === 0) {
                console.warn('[Twitter Handler] Empty reply generated');
                return null;
            }

            // Additional validation for Twitter
            if (reply.length > 280) { // Twitter character limit
                console.warn('[Twitter Handler] Reply too long, truncating');
                return reply.substring(0, 277) + '...';
            }

            this.log('Generated reply:', reply);
            return reply;

        } catch (error) {
            this.error('Failed to generate reply with Gemini API:', error);

            // Check if it's an API key issue
            if (error.message.includes('API key')) {
                // Notify background script about API key issue
                chrome.runtime.sendMessage({
                    type: 'API_KEY_ERROR',
                    platform: 'twitter',
                    message: 'Please set your Gemini API key in the extension popup.'
                });
            }

            return null;
        }
    }

    /**
     * Log reply activity for analytics and debugging
     * @param {Object} tweetData - The tweet data
     * @param {string} reply - The generated reply
     * @param {string} status - Status: 'success', 'failed', 'error'
     * @param {string} errorMessage - Error message if applicable
     */
    async logReplyActivity(tweetData, reply, status, errorMessage = null) {
        try {
            const logEntry = {
                timestamp: Date.now(),
                platform: 'twitter',
                postId: tweetData.id,
                authorName: tweetData.author?.name,
                postContent: tweetData.content?.substring(0, 100) + '...',
                generatedReply: reply,
                status,
                errorMessage,
                relevanceScore: tweetData.relevanceAnalysis?.score || 0
            };

            // Get existing logs
            const result = await chrome.storage.local.get(['commentLogs']);
            const logs = result.commentLogs || [];

            // Add new log and keep only last 200 entries
            logs.unshift(logEntry);
            const trimmedLogs = logs.slice(0, 200);

            await chrome.storage.local.set({ commentLogs: trimmedLogs });

        } catch (error) {
            this.error('Failed to log reply activity:', error);
        }
    }

    /**
     * Utility methods
     */

    isTwitterPage() {
        return ['twitter.com', 'x.com', 'www.twitter.com', 'www.x.com'].includes(window.location.hostname);
    }

    isXInterface() {
        return window.location.hostname.includes('x.com') ||
            document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]') !== null;
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

    isValidTweet(tweetElement) {
        // Check if element is a valid tweet
        if (!tweetElement) return false;

        // Must have tweet text or media
        const hasText = tweetElement.querySelector(this.selectors.content.text) !== null;
        const hasMedia = tweetElement.querySelector(this.selectors.content.media) !== null;

        if (!hasText && !hasMedia) return false;

        // Must have author information
        const hasAuthor = tweetElement.querySelector(this.selectors.author.username) !== null;
        if (!hasAuthor) return false;

        // Should not be promoted (optional filter)
        const isPromoted = tweetElement.querySelector(this.selectors.metadata.promoted) !== null;

        return !isPromoted;
    }

    extractHashtags(text) {
        if (!text) return [];
        const matches = text.match(/#[\w\u0590-\u05ff]+/gi);
        return matches ? matches.map(tag => tag.toLowerCase()) : [];
    }

    extractMentions(text) {
        if (!text) return [];
        const matches = text.match(/@[\w\u0590-\u05ff]+/gi);
        return matches ? matches.map(mention => mention.toLowerCase()) : [];
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

    async findTweetElementById(tweetId) {
        const allTweets = document.querySelectorAll(this.selectors.posts);

        for (const tweet of allTweets) {
            const extractedId = this.extractTweetId(tweet);
            if (extractedId === tweetId) {
                return tweet;
            }
        }

        return null;
    }

    async typeWithDelay(element, text, delay = 50) {
        // Twitter uses a more complex editor, so we need to handle it carefully
        element.focus();

        // Clear existing content
        element.textContent = '';

        // For Twitter's compose text area, we need to trigger the right events
        for (let i = 0; i < text.length; i++) {
            element.textContent += text[i];

            // Trigger events that Twitter expects
            const inputEvent = new Event('input', { bubbles: true });
            const changeEvent = new Event('change', { bubbles: true });

            element.dispatchEvent(inputEvent);
            element.dispatchEvent(changeEvent);

            await this.delay(delay + Math.random() * 30); // Add randomness
        }

        // Final input event to ensure Twitter registers the full text
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if new tweets were added
                    const addedTweets = Array.from(mutation.addedNodes)
                        .filter(node => node.nodeType === Node.ELEMENT_NODE)
                        .some(node => node.matches && node.matches(this.selectors.posts));

                    if (addedTweets) {
                        setTimeout(() => this.scanForTweets(), 1000);
                    }
                }
            });
        });

        // Observe the timeline for new tweets
        const timelineElement = document.querySelector(this.selectors.timeline);
        if (timelineElement) {
            observer.observe(timelineElement, {
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
                    this.log('Near bottom of page, scanning for new tweets');
                    setTimeout(() => this.scanForTweets(), this.config.scrollDelay);
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
            console.log('[Twitter Handler]', ...args);
        }
    }

    error(...args) {
        console.error('[Twitter Handler Error]', ...args);
    }
}

// Initialize Twitter handler
const twitterHandler = new TwitterHandler();

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        twitterHandler.initialize();
    });
} else {
    twitterHandler.initialize();
}

// Handle page navigation (Twitter/X is SPA)
let currentUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        console.log('Twitter/X page navigation detected, reinitializing...');

        // Reinitialize after navigation
        setTimeout(async () => {
            await initializeTwitterHandler();
        }, 2000);
    }
});

urlObserver.observe(document, { subtree: true, childList: true });

// Global access for debugging
window.twitterHandler = twitterHandler;