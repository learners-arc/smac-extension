/**
 * Twitter/X Selectors Utility for Social Media Auto-Comment Extension
 * 
 * Manages Twitter/X specific selectors that frequently change due to UI updates.
 * Provides fallback selectors and selector validation for robustness.
 */

/**
 * Twitter Selectors Manager Class
 * Handles selector management with fallbacks and validation
 */
class TwitterSelectors {
    constructor() {
        // Primary selectors (most current as of 2024)
        this.primary = {
            // Tweet/Post containers
            posts: [
                'article[data-testid="tweet"]',
                '[data-testid="tweet"]',
                '.css-175oi2r[data-testid="tweet"]',
                'div[data-testid="tweet"]'
            ],

            // Author information
            author: {
                name: [
                    '[data-testid="User-Name"] span',
                    '.css-1jxf684 span',
                    '[data-testid="User-Names"] span:first-child',
                    '.r-18u37iz span'
                ],
                username: [
                    '[data-testid="User-Name"] a[href^="/"]',
                    '.css-1qaijid',
                    '[data-testid="User-Names"] a',
                    '.r-1loqt21 a'
                ],
                avatar: [
                    '[data-testid="Tweet-User-Avatar"] img',
                    '.css-9pa8cd img',
                    '[data-testid="UserAvatar-Container-unknown"] img',
                    '.r-1p0dtai img'
                ],
                verified: [
                    '[data-testid="icon-verified"]',
                    '.r-1cvl2hr[d*="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34"]'
                ]
            },

            // Tweet content
            content: {
                text: [
                    '[data-testid="tweetText"]',
                    '.css-1rynq56',
                    '[data-testid="tweetText"] span',
                    '.r-37j5jr span'
                ],
                media: [
                    '[data-testid="tweetPhoto"] img',
                    '[data-testid="videoComponent"] video',
                    '.css-9pa8cd img',
                    '.r-1p0dtai img'
                ],
                links: [
                    '[data-testid="card.wrapper"]',
                    '.css-4rbku5',
                    '[data-testid="card.layoutLarge.detail"]',
                    '.r-1re7ezh'
                ]
            },

            // Engagement metrics
            engagement: {
                likes: [
                    '[data-testid="like"] span',
                    '[aria-label*="likes"] span',
                    '.css-1rynq56[data-testid="like"] span',
                    '.r-1777fci span'
                ],
                retweets: [
                    '[data-testid="retweet"] span',
                    '[aria-label*="retweets"] span',
                    '.css-1rynq56[data-testid="retweet"] span',
                    '.r-1777fci span'
                ],
                replies: [
                    '[data-testid="reply"] span',
                    '[aria-label*="replies"] span',
                    '.css-1rynq56[data-testid="reply"] span',
                    '.r-1777fci span'
                ]
            },

            // Tweet actions and interaction
            actions: {
                replyButton: [
                    '[data-testid="reply"]',
                    '[aria-label*="Reply"]',
                    '.css-18t94o4[data-testid="reply"]',
                    '.r-1777fci[data-testid="reply"]'
                ],
                likeButton: [
                    '[data-testid="like"]',
                    '[aria-label*="Like"]',
                    '.css-18t94o4[data-testid="like"]',
                    '.r-1777fci[data-testid="like"]'
                ],
                retweetButton: [
                    '[data-testid="retweet"]',
                    '[aria-label*="Retweet"]',
                    '.css-18t94o4[data-testid="retweet"]',
                    '.r-1777fci[data-testid="retweet"]'
                ]
            },

            // Comment/Reply interface
            compose: {
                replyModal: [
                    '[data-testid="tweetTextarea_0"]',
                    '.public-DraftEditorPlaceholder-inner',
                    '.DraftEditor-editorContainer',
                    '[role="textbox"][data-testid="tweetTextarea_0"]'
                ],
                submitButton: [
                    '[data-testid="tweetButtonInline"]',
                    '[data-testid="tweetButton"]',
                    '.css-18t94o4[data-testid="tweetButtonInline"]',
                    '.r-42olwf[data-testid="tweetButton"]'
                ],
                charCount: [
                    '[data-testid="tweetTextarea_0_indicator"]',
                    '.css-1rynq56 circle',
                    '.r-1777fci circle'
                ]
            },

            // Timeline and navigation
            timeline: {
                feed: [
                    '[data-testid="primaryColumn"]',
                    '.css-175oi2r[data-testid="primaryColumn"]',
                    'main[role="main"]',
                    '.r-kemksi'
                ],
                tweetStream: [
                    '[data-testid="primaryColumn"] section',
                    '.css-175oi2r section[role="region"]',
                    'section[aria-labelledby]',
                    '.r-kemksi section'
                ]
            },

            // Metadata
            metadata: {
                timestamp: [
                    'time[datetime]',
                    '[data-testid="Time"] time',
                    '.css-4rbku5 time',
                    '.r-1re7ezh time'
                ],
                tweetId: [
                    'article[data-testid="tweet"]',
                    '[data-testid="tweet"]'
                ],
                promoted: [
                    '[data-testid="promotedIndicator"]',
                    '.css-1rynq56[data-testid="promotedIndicator"]',
                    '.r-37j5jr[data-testid="promotedIndicator"]'
                ]
            }
        };

        // Legacy selectors for older Twitter versions
        this.legacy = {
            posts: [
                '.tweet',
                '.js-stream-item',
                '.stream-item',
                '.tweet-context'
            ],
            content: {
                text: [
                    '.tweet-text',
                    '.js-tweet-text',
                    '.TweetTextSize',
                    '.tweet-text-container'
                ]
            },
            actions: {
                reply: [
                    '.ProfileTweet-action--reply',
                    '.js-actionReply',
                    '.reply-action'
                ]
            }
        };
    }

    /**
     * Get the best available selector from a selector array
     * @param {Array} selectorArray - Array of selectors to try
     * @param {Element} context - Context element to search within (default: document)
     * @returns {Object} Result object with selector and elements found
     */
    getBestSelector(selectorArray, context = document) {
        const result = {
            selector: null,
            elements: null,
            count: 0
        };

        for (const selector of selectorArray) {
            try {
                const elements = context.querySelectorAll(selector);
                if (elements.length > 0) {
                    result.selector = selector;
                    result.elements = elements;
                    result.count = elements.length;
                    break;
                }
            } catch (error) {
                console.warn(`Invalid selector: ${selector}`, error);
                continue;
            }
        }

        return result;
    }

    /**
     * Get posts using the best available selector
     * @param {Element} context - Context element (default: document)
     * @returns {Object} Result with posts and selector used
     */
    getPosts(context = document) {
        return this.getBestSelector(this.primary.posts, context);
    }

    /**
     * Get author name element for a post
     * @param {Element} postElement - Post element
     * @returns {Element|null} Author name element
     */
    getAuthorName(postElement) {
        const result = this.getBestSelector(this.primary.author.name, postElement);
        return result.elements ? result.elements[0] : null;
    }

    /**
     * Get username element for a post
     * @param {Element} postElement - Post element
     * @returns {Element|null} Username element
     */
    getUsername(postElement) {
        const result = this.getBestSelector(this.primary.author.username, postElement);
        return result.elements ? result.elements[0] : null;
    }

    /**
     * Get tweet text element
     * @param {Element} postElement - Post element
     * @returns {Element|null} Tweet text element
     */
    getTweetText(postElement) {
        const result = this.getBestSelector(this.primary.content.text, postElement);
        return result.elements ? result.elements[0] : null;
    }

    /**
     * Get engagement elements (likes, retweets, replies)
     * @param {Element} postElement - Post element
     * @returns {Object} Engagement elements
     */
    getEngagementElements(postElement) {
        return {
            likes: this.getBestSelector(this.primary.engagement.likes, postElement).elements?.[0],
            retweets: this.getBestSelector(this.primary.engagement.retweets, postElement).elements?.[0],
            replies: this.getBestSelector(this.primary.engagement.replies, postElement).elements?.[0]
        };
    }

    /**
     * Get reply button for a post
     * @param {Element} postElement - Post element
     * @returns {Element|null} Reply button element
     */
    getReplyButton(postElement) {
        const result = this.getBestSelector(this.primary.actions.replyButton, postElement);
        return result.elements ? result.elements[0] : null;
    }

    /**
     * Get compose/reply text area
     * @param {Element} context - Context element (default: document)
     * @returns {Element|null} Text area element
     */
    getComposeTextArea(context = document) {
        const result = this.getBestSelector(this.primary.compose.replyModal, context);
        return result.elements ? result.elements[0] : null;
    }

    /**
     * Get tweet submit button
     * @param {Element} context - Context element (default: document)
     * @returns {Element|null} Submit button element
     */
    getSubmitButton(context = document) {
        const result = this.getBestSelector(this.primary.compose.submitButton, context);
        return result.elements ? result.elements[0] : null;
    }

    /**
     * Get timestamp element
     * @param {Element} postElement - Post element
     * @returns {Element|null} Timestamp element
     */
    getTimestamp(postElement) {
        const result = this.getBestSelector(this.primary.metadata.timestamp, postElement);
        return result.elements ? result.elements[0] : null;
    }

    /**
     * Check if current page is Twitter/X
     * @returns {boolean} True if on Twitter/X
     */
    isTwitterPage() {
        return window.location.hostname === 'twitter.com' ||
            window.location.hostname === 'x.com' ||
            window.location.hostname === 'www.twitter.com' ||
            window.location.hostname === 'www.x.com';
    }

    /**
     * Detect if this is the new X.com interface
     * @returns {boolean} True if X.com interface detected
     */
    isXInterface() {
        return window.location.hostname.includes('x.com') ||
            document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]') !== null;
    }

    /**
     * Extract tweet ID from various sources
     * @param {Element} postElement - Post element
     * @returns {string|null} Tweet ID
     */
    extractTweetId(postElement) {
        // Try data attributes first
        if (postElement.hasAttribute('data-tweet-id')) {
            return postElement.getAttribute('data-tweet-id');
        }

        // Try to extract from URL in links
        const links = postElement.querySelectorAll('a[href*="/status/"]');
        for (const link of links) {
            const match = link.href.match(/\/status\/(\d+)/);
            if (match) {
                return match[1];
            }
        }

        // Try to extract from time element
        const timeElement = this.getTimestamp(postElement);
        if (timeElement && timeElement.closest('a')) {
            const match = timeElement.closest('a').href.match(/\/status\/(\d+)/);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * Validate if an element is a valid tweet post
     * @param {Element} element - Element to validate
     * @returns {boolean} True if valid tweet
     */
    isValidTweet(element) {
        if (!element) return false;

        // Must have tweet text or media
        const hasText = this.getTweetText(element) !== null;
        const hasMedia = element.querySelector(this.primary.content.media.join(', ')) !== null;

        if (!hasText && !hasMedia) return false;

        // Must have author information
        const hasAuthor = this.getAuthorName(element) !== null || this.getUsername(element) !== null;
        if (!hasAuthor) return false;

        // Should not be a promoted tweet (optional filter)
        const isPromoted = this.getBestSelector(this.primary.metadata.promoted, element).count > 0;

        return !isPromoted; // Return false if promoted, true otherwise
    }

    /**
     * Get all selector variants for debugging
     * @returns {Object} All selectors organized by category
     */
    getAllSelectors() {
        return {
            primary: this.primary,
            legacy: this.legacy
        };
    }

    /**
     * Test selectors and return diagnostic information
     * @returns {Object} Diagnostic information about selector performance
     */
    runDiagnostics() {
        const diagnostics = {
            platform: this.isXInterface() ? 'X.com' : 'Twitter.com',
            timestamp: new Date().toISOString(),
            results: {}
        };

        // Test post detection
        const postResult = this.getPosts();
        diagnostics.results.posts = {
            selector: postResult.selector,
            count: postResult.count,
            success: postResult.count > 0
        };

        // Test various selectors if posts found
        if (postResult.count > 0) {
            const firstPost = postResult.elements[0];

            diagnostics.results.author = {
                name: this.getAuthorName(firstPost) !== null,
                username: this.getUsername(firstPost) !== null
            };

            diagnostics.results.content = {
                text: this.getTweetText(firstPost) !== null,
                timestamp: this.getTimestamp(firstPost) !== null
            };

            diagnostics.results.engagement = {
                likes: this.getEngagementElements(firstPost).likes !== null,
                retweets: this.getEngagementElements(firstPost).retweets !== null,
                replies: this.getEngagementElements(firstPost).replies !== null
            };

            diagnostics.results.actions = {
                replyButton: this.getReplyButton(firstPost) !== null
            };
        }

        return diagnostics;
    }
}

// Export as singleton
const twitterSelectors = new TwitterSelectors();
export { twitterSelectors };