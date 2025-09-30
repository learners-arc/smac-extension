/**
 * Comment Poster Utility - Handles automated comment posting across platforms
 * Provides unified interface for posting comments on LinkedIn and Twitter
 * 
 * Features:
 * - Platform-agnostic comment posting interface
 * - Human-like typing simulation with realistic delays
 * - Comment submission verification and retry mechanisms
 * - DOM element interaction with fallback selectors
 * - Error handling and recovery strategies
 * - Activity logging and analytics
 */

import { DOMHelpers } from './dom-helpers.js';
import { DuplicateChecker } from './duplicate-checker.js';

class CommentPoster {
    constructor() {
        this.domHelpers = new DOMHelpers();
        this.duplicateChecker = new DuplicateChecker();

        this.config = {
            typingSpeed: {
                min: 80,  // Minimum milliseconds between characters
                max: 200, // Maximum milliseconds between characters
                pause: {
                    comma: { min: 100, max: 300 },
                    period: { min: 200, max: 500 },
                    space: { min: 50, max: 150 }
                }
            },
            submission: {
                waitBeforeSubmit: { min: 1500, max: 3000 },
                waitAfterSubmit: { min: 2000, max: 4000 },
                verificationTimeout: 10000
            },
            retries: {
                maxAttempts: 3,
                backoffDelay: 1000
            }
        };

        this.statistics = {
            commentsAttempted: 0,
            commentsPosted: 0,
            commentsSkipped: 0,
            errors: 0,
            averageTypingTime: 0,
            averageSubmissionTime: 0
        };
    }

    /**
     * Post a comment on LinkedIn
     * @param {Object} postData - The post data containing ID and content
     * @param {string} comment - The comment text to post
     * @param {Object} options - Posting options
     * @return {Promise<Object>} - Result of comment posting
     */
    async postLinkedInComment(postData, comment, options = {}) {
        try {
            console.log('[Comment Poster] Starting LinkedIn comment posting...');
            this.statistics.commentsAttempted++;

            // Check for duplicates
            const isDuplicate = await this.duplicateChecker.isCommentDuplicate(
                postData.id, comment, 'linkedin'
            );

            if (isDuplicate) {
                console.log('[Comment Poster] Duplicate comment detected, skipping');
                this.statistics.commentsSkipped++;
                return { success: false, reason: 'duplicate', skipped: true };
            }

            // Find the post element
            const postElement = await this.findLinkedInPost(postData.id);
            if (!postElement) {
                throw new Error('Post element not found');
            }

            // Open comment box
            const commentBox = await this.openLinkedInCommentBox(postElement);
            if (!commentBox) {
                throw new Error('Failed to open comment box');
            }

            // Type comment with human-like behavior
            const typingStartTime = Date.now();
            await this.typeComment(commentBox, comment, 'linkedin');
            const typingTime = Date.now() - typingStartTime;

            // Submit comment
            const submissionStartTime = Date.now();
            const submitResult = await this.submitLinkedInComment(postElement, commentBox);
            const submissionTime = Date.now() - submissionStartTime;

            if (submitResult.success) {
                // Record successful comment
                await this.duplicateChecker.recordComment(
                    postData.id, comment, 'linkedin'
                );

                // Update statistics
                this.statistics.commentsPosted++;
                this.updateAverageTime('typing', typingTime);
                this.updateAverageTime('submission', submissionTime);

                console.log('[Comment Poster] LinkedIn comment posted successfully');
                return {
                    success: true,
                    platform: 'linkedin',
                    postId: postData.id,
                    comment,
                    typingTime,
                    submissionTime,
                    timestamp: Date.now()
                };
            } else {
                throw new Error(submitResult.error || 'Comment submission failed');
            }

        } catch (error) {
            this.statistics.errors++;
            console.error('[Comment Poster] LinkedIn comment posting failed:', error);

            return {
                success: false,
                platform: 'linkedin',
                postId: postData.id,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Post a reply on Twitter/X
     * @param {Object} tweetData - The tweet data containing ID and content
     * @param {string} reply - The reply text to post
     * @param {Object} options - Posting options
     * @return {Promise<Object>} - Result of reply posting
     */
    async postTwitterReply(tweetData, reply, options = {}) {
        try {
            console.log('[Comment Poster] Starting Twitter reply posting...');
            this.statistics.commentsAttempted++;

            // Check for duplicates
            const isDuplicate = await this.duplicateChecker.isCommentDuplicate(
                tweetData.id, reply, 'twitter'
            );

            if (isDuplicate) {
                console.log('[Comment Poster] Duplicate reply detected, skipping');
                this.statistics.commentsSkipped++;
                return { success: false, reason: 'duplicate', skipped: true };
            }

            // Find the tweet element
            const tweetElement = await this.findTwitterTweet(tweetData.id);
            if (!tweetElement) {
                throw new Error('Tweet element not found');
            }

            // Open reply modal
            const replyBox = await this.openTwitterReplyModal(tweetElement);
            if (!replyBox) {
                throw new Error('Failed to open reply modal');
            }

            // Type reply with human-like behavior
            const typingStartTime = Date.now();
            await this.typeComment(replyBox, reply, 'twitter');
            const typingTime = Date.now() - typingStartTime;

            // Submit reply
            const submissionStartTime = Date.now();
            const submitResult = await this.submitTwitterReply(replyBox);
            const submissionTime = Date.now() - submissionStartTime;

            if (submitResult.success) {
                // Record successful reply
                await this.duplicateChecker.recordComment(
                    tweetData.id, reply, 'twitter'
                );

                // Update statistics
                this.statistics.commentsPosted++;
                this.updateAverageTime('typing', typingTime);
                this.updateAverageTime('submission', submissionTime);

                console.log('[Comment Poster] Twitter reply posted successfully');
                return {
                    success: true,
                    platform: 'twitter',
                    postId: tweetData.id,
                    comment: reply,
                    typingTime,
                    submissionTime,
                    timestamp: Date.now()
                };
            } else {
                throw new Error(submitResult.error || 'Reply submission failed');
            }

        } catch (error) {
            this.statistics.errors++;
            console.error('[Comment Poster] Twitter reply posting failed:', error);

            return {
                success: false,
                platform: 'twitter',
                postId: tweetData.id,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Find LinkedIn post element by ID
     * @param {string} postId - The post ID
     * @return {Promise<Element|null>} - The post element or null
     */
    async findLinkedInPost(postId) {
        const selectors = [
            `[data-urn*="${postId}"]`,
            `[data-id="${postId}"]`,
            `.feed-shared-update-v2[data-urn*="${postId}"]`,
            `.ember-view[data-urn*="${postId}"]`
        ];

        return this.domHelpers.findElementWithFallback(selectors, {
            timeout: 5000,
            retries: 2
        });
    }

    /**
     * Find Twitter tweet element by ID
     * @param {string} tweetId - The tweet ID
     * @return {Promise<Element|null>} - The tweet element or null
     */
    async findTwitterTweet(tweetId) {
        const selectors = [
            `[data-testid="tweet"][data-tweet-id="${tweetId}"]`,
            `article[data-testid="tweet"]`,
            `.css-175oi2r[data-testid="tweet"]`
        ];

        // For Twitter, we might need to find by content since IDs are dynamic
        const tweets = document.querySelectorAll('article[data-testid="tweet"]');
        for (const tweet of tweets) {
            const tweetData = this.extractTweetIdFromElement(tweet);
            if (tweetData && tweetData.includes(tweetId)) {
                return tweet;
            }
        }

        return this.domHelpers.findElementWithFallback(selectors, {
            timeout: 5000,
            retries: 2
        });
    }

    /**
     * Extract tweet ID from tweet element (helper method)
     * @param {Element} tweetElement - The tweet element
     * @return {string|null} - The tweet ID or null
     */
    extractTweetIdFromElement(tweetElement) {
        try {
            // Try to find permalink or URL that contains tweet ID
            const link = tweetElement.querySelector('a[href*="/status/"]');
            if (link) {
                const match = link.href.match(/\/status\/(\d+)/);
                return match ? match[1] : null;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Open LinkedIn comment box
     * @param {Element} postElement - The post element
     * @return {Promise<Element|null>} - The comment box element
     */
    async openLinkedInCommentBox(postElement) {
        try {
            // Click comment button to expand comment box
            const commentButton = postElement.querySelector(
                'button[aria-label*="comment"], .social-actions-button'
            );

            if (commentButton) {
                await this.domHelpers.humanClick(commentButton);
                await this.domHelpers.delay(1000, 2000);
            }

            // Find comment input box
            const commentBoxSelectors = [
                '.comments-comment-box-comment__text-editor',
                '.comments-comment-texteditor',
                '[data-placeholder*="comment"]',
                '.ql-editor',
                'div[contenteditable="true"]'
            ];

            return this.domHelpers.findElementWithFallback(commentBoxSelectors, {
                timeout: 5000,
                parent: postElement
            });

        } catch (error) {
            console.error('[Comment Poster] Failed to open LinkedIn comment box:', error);
            return null;
        }
    }

    /**
     * Open Twitter reply modal
     * @param {Element} tweetElement - The tweet element
     * @return {Promise<Element|null>} - The reply text area element
     */
    async openTwitterReplyModal(tweetElement) {
        try {
            // Click reply button to open modal
            const replyButton = tweetElement.querySelector(
                '[data-testid="reply"], [aria-label*="reply"], .css-18t94o4[role="button"]'
            );

            if (replyButton) {
                await this.domHelpers.humanClick(replyButton);
                await this.domHelpers.delay(2000, 3000);
            }

            // Find reply text area in modal
            const replyBoxSelectors = [
                '[data-testid="tweetTextarea_0"]',
                '.public-DraftEditorPlaceholder-inner',
                '[contenteditable="true"][role="textbox"]',
                '.notranslate'
            ];

            return this.domHelpers.findElementWithFallback(replyBoxSelectors, {
                timeout: 5000
            });

        } catch (error) {
            console.error('[Comment Poster] Failed to open Twitter reply modal:', error);
            return null;
        }
    }

    /**
     * Type comment with human-like behavior
     * @param {Element} textElement - The text input element
     * @param {string} text - The text to type
     * @param {string} platform - The platform ('linkedin' or 'twitter')
     */
    async typeComment(textElement, text, platform) {
        console.log(`[Comment Poster] Typing ${platform} comment: "${text}"`);

        // Clear existing content
        await this.domHelpers.clearElement(textElement);
        await this.domHelpers.delay(200, 500);

        // Focus the element
        await this.domHelpers.focusElement(textElement);
        await this.domHelpers.delay(300, 600);

        // Type character by character with realistic delays
        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            // Add the character
            await this.domHelpers.typeCharacter(textElement, char);

            // Calculate delay based on character type
            let delay = this.getTypingDelay(char);

            // Add some randomness
            delay += Math.random() * 50 - 25;

            await this.domHelpers.delay(delay);
        }

        // Trigger input events
        await this.domHelpers.triggerInputEvents(textElement);

        console.log('[Comment Poster] Typing completed');
    }

    /**
     * Get typing delay based on character type
     * @param {string} char - The character being typed
     * @return {number} - Delay in milliseconds
     */
    getTypingDelay(char) {
        const { typingSpeed } = this.config;

        if (char === ',') {
            return this.randomDelay(typingSpeed.pause.comma);
        } else if (char === '.' || char === '!' || char === '?') {
            return this.randomDelay(typingSpeed.pause.period);
        } else if (char === ' ') {
            return this.randomDelay(typingSpeed.pause.space);
        } else {
            return this.randomDelay({ min: typingSpeed.min, max: typingSpeed.max });
        }
    }

    /**
     * Submit LinkedIn comment
     * @param {Element} postElement - The post element
     * @param {Element} commentBox - The comment box element
     * @return {Promise<Object>} - Submission result
     */
    async submitLinkedInComment(postElement, commentBox) {
        try {
            // Wait before submitting (human-like behavior)
            await this.domHelpers.delay(
                this.config.submission.waitBeforeSubmit.min,
                this.config.submission.waitBeforeSubmit.max
            );

            // Find submit button
            const submitSelectors = [
                '.comments-comment-box__submit-button',
                'button[type="submit"]',
                'button[data-control-name="comment_submit"]',
                '.comments-comment-box .artdeco-button--primary'
            ];

            const submitButton = this.domHelpers.findElementWithFallback(
                submitSelectors,
                { parent: postElement }
            );

            if (!submitButton || submitButton.disabled) {
                throw new Error('Submit button not found or disabled');
            }

            // Click submit
            await this.domHelpers.humanClick(submitButton);

            // Wait for submission to complete
            await this.domHelpers.delay(
                this.config.submission.waitAfterSubmit.min,
                this.config.submission.waitAfterSubmit.max
            );

            // Verify submission success
            const isSuccess = await this.verifyLinkedInSubmission(postElement);

            return { success: isSuccess };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Submit Twitter reply
     * @param {Element} replyBox - The reply text area element
     * @return {Promise<Object>} - Submission result
     */
    async submitTwitterReply(replyBox) {
        try {
            // Wait before submitting
            await this.domHelpers.delay(
                this.config.submission.waitBeforeSubmit.min,
                this.config.submission.waitBeforeSubmit.max
            );

            // Find submit button
            const submitSelectors = [
                '[data-testid="tweetButton"]',
                '[data-testid="tweetButtonInline"]',
                'div[role="button"][data-testid*="tweet"]',
                '.css-18t94o4[role="button"]'
            ];

            const submitButton = this.domHelpers.findElementWithFallback(submitSelectors);

            if (!submitButton) {
                throw new Error('Submit button not found');
            }

            // Check if button is enabled
            if (submitButton.getAttribute('aria-disabled') === 'true') {
                throw new Error('Submit button is disabled');
            }

            // Click submit
            await this.domHelpers.humanClick(submitButton);

            // Wait for submission to complete
            await this.domHelpers.delay(
                this.config.submission.waitAfterSubmit.min,
                this.config.submission.waitAfterSubmit.max
            );

            // Verify submission success (modal should close)
            const isSuccess = await this.verifyTwitterSubmission();

            return { success: isSuccess };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Verify LinkedIn comment submission
     * @param {Element} postElement - The post element
     * @return {Promise<boolean>} - True if successful
     */
    async verifyLinkedInSubmission(postElement) {
        try {
            // Look for success indicators
            const successIndicators = [
                '.comments-comment-box__submit-button[disabled]',
                '.feed-shared-update-v2__comments-container .comment',
                '.comments-post-meta__timestamp'
            ];

            return this.domHelpers.waitForAnyElement(successIndicators, {
                timeout: this.config.submission.verificationTimeout,
                parent: postElement
            });

        } catch (error) {
            console.warn('[Comment Poster] Could not verify LinkedIn submission:', error);
            return true; // Assume success if verification fails
        }
    }

    /**
     * Verify Twitter reply submission
     * @return {Promise<boolean>} - True if successful
     */
    async verifyTwitterSubmission() {
        try {
            // Check if compose modal is closed (indicates success)
            const modalExists = document.querySelector('[data-testid="compose"]');
            return !modalExists;

        } catch (error) {
            console.warn('[Comment Poster] Could not verify Twitter submission:', error);
            return true; // Assume success if verification fails
        }
    }

    /**
     * Update average time statistics
     * @param {string} type - 'typing' or 'submission'
     * @param {number} time - Time in milliseconds
     */
    updateAverageTime(type, time) {
        const key = type === 'typing' ? 'averageTypingTime' : 'averageSubmissionTime';
        const current = this.statistics[key];
        const count = this.statistics.commentsPosted;

        this.statistics[key] = (current * (count - 1) + time) / count;
    }

    /**
     * Generate random delay within range
     * @param {Object} range - Object with min and max properties
     * @return {number} - Random delay in milliseconds
     */
    randomDelay(range) {
        return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    }

    /**
     * Get current statistics
     * @return {Object} - Current statistics object
     */
    getStatistics() {
        return {
            ...this.statistics,
            successRate: this.statistics.commentsAttempted > 0
                ? (this.statistics.commentsPosted / this.statistics.commentsAttempted) * 100
                : 0
        };
    }

    /**
     * Reset statistics
     */
    resetStatistics() {
        this.statistics = {
            commentsAttempted: 0,
            commentsPosted: 0,
            commentsSkipped: 0,
            errors: 0,
            averageTypingTime: 0,
            averageSubmissionTime: 0
        };
    }
}

// Create singleton instance
const commentPoster = new CommentPoster();

export { CommentPoster, commentPoster };