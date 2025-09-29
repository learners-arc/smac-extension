/**
 * Project Configuration for Social Media Auto-Comment Chrome Extension
 * 
 * This file contains global configuration constants used throughout the extension.
 * Modify these values to customize the extension behavior.
 */

export const CONFIG = {
    // Extension metadata
    EXTENSION_NAME: 'Social Media Auto-Comment',
    VERSION: '1.0.0',

    // Timing configurations
    COMMENT_INTERVAL: {
        MIN: 70000, // 70 seconds (minimum interval)
        MAX: 90000  // 90 seconds (maximum interval)
    },

    // Platform configurations
    PLATFORMS: {
        LINKEDIN: {
            name: 'LinkedIn',
            url: 'https://www.linkedin.com/feed/',
            selectors: {
                posts: '.ember-view',
                commentBox: '.comments-comment-box-comment__text-editor',
                submitButton: '[data-control-name="comments.submit"]',
                fallbackCommentBox: '.ql-editor'
            }
        },
        TWITTER: {
            name: 'Twitter/X',
            url: 'https://x.com/home',
            selectors: {
                posts: '.css-175oi2r',
                commentBox: '.public-DraftEditorPlaceholder-inner',
                submitButton: '[data-testid="tweetButton"]',
                fallbackCommentBox: '[contenteditable="true"]'
            }
        }
    },

    // Content filtering keywords for CS students
    CS_KEYWORDS: [
        'programming', 'coding', 'software', 'developer', 'hackathon',
        'algorithm', 'data structures', 'machine learning', 'AI',
        'computer science', 'web development', 'mobile development',
        'javascript', 'python', 'java', 'react', 'node.js',
        'internship', 'tech job', 'startup', 'open source',
        'github', 'project', 'tutorial', 'learning', 'bootcamp'
    ],

    // Storage keys
    STORAGE_KEYS: {
        API_KEY: 'gemini_api_key',
        PROCESSED_POSTS: 'processed_posts',
        SETTINGS: 'extension_settings',
        LOGS: 'extension_logs'
    },

    // API configurations
    GEMINI_API: {
        BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
        MODEL: 'gemini-pro',
        MAX_TOKENS: 150,
        TEMPERATURE: 0.7
    },

    // Logging levels
    LOG_LEVELS: {
        ERROR: 'ERROR',
        WARN: 'WARN',
        INFO: 'INFO',
        DEBUG: 'DEBUG'
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG };
}