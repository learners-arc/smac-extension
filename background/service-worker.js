/**
 * Service Worker for Social Media Auto-Comment Chrome Extension
 * 
 * This is the background script that manages the extension lifecycle,
 * handles messaging between content scripts and popup, and coordinates
 * the automated commenting process.
 * 
 * Chrome Extension Manifest V3 Service Worker
 */

// Import configuration
import { CONFIG } from '../config.js';

/**
 * Extension installation and startup
 */
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('Social Media Auto-Comment Extension installed/updated:', details.reason);

    // Initialize default settings
    await initializeDefaultSettings();

    // Set up initial state
    if (details.reason === 'install') {
        console.log('First time installation - setting up defaults');

        // Open welcome/setup page (will be implemented in Part 3)
        // chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
    }
});

/**
 * Initialize default extension settings
 */
async function initializeDefaultSettings() {
    try {
        const defaultSettings = {
            isEnabled: false,
            selectedPlatforms: [],
            apiKey: '',
            commentInterval: {
                min: CONFIG.COMMENT_INTERVAL.MIN,
                max: CONFIG.COMMENT_INTERVAL.MAX
            },
            lastProcessedPosts: {},
            totalCommentsMade: 0,
            extensionLogs: []
        };

        // Check if settings already exist
        const existingSettings = await chrome.storage.local.get([CONFIG.STORAGE_KEYS.SETTINGS]);

        if (!existingSettings[CONFIG.STORAGE_KEYS.SETTINGS]) {
            // Store default settings
            await chrome.storage.local.set({
                [CONFIG.STORAGE_KEYS.SETTINGS]: defaultSettings
            });

            console.log('Default settings initialized');
        }

    } catch (error) {
        console.error('Error initializing default settings:', error);
    }
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Service Worker received message:', message);

    switch (message.type) {
        case 'GET_EXTENSION_STATUS':
            handleGetExtensionStatus(sendResponse);
            break;

        case 'UPDATE_EXTENSION_STATUS':
            handleUpdateExtensionStatus(message.data, sendResponse);
            break;

        case 'POST_DETECTED':
            handlePostDetected(message.data, sender, sendResponse);
            break;

        case 'COMMENT_POSTED':
            handleCommentPosted(message.data, sender, sendResponse);
            break;

        case 'LOG_EVENT':
            handleLogEvent(message.data, sendResponse);
            break;

        default:
            console.warn('Unknown message type:', message.type);
            sendResponse({ success: false, error: 'Unknown message type' });
    }

    // Return true to indicate we'll respond asynchronously
    return true;
});

/**
 * Get current extension status
 */
async function handleGetExtensionStatus(sendResponse) {
    try {
        const settings = await chrome.storage.local.get([CONFIG.STORAGE_KEYS.SETTINGS]);
        sendResponse({
            success: true,
            data: settings[CONFIG.STORAGE_KEYS.SETTINGS] || {}
        });
    } catch (error) {
        console.error('Error getting extension status:', error);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Update extension status
 */
async function handleUpdateExtensionStatus(data, sendResponse) {
    try {
        const settings = await chrome.storage.local.get([CONFIG.STORAGE_KEYS.SETTINGS]);
        const currentSettings = settings[CONFIG.STORAGE_KEYS.SETTINGS] || {};

        // Merge with new data
        const updatedSettings = { ...currentSettings, ...data };

        await chrome.storage.local.set({
            [CONFIG.STORAGE_KEYS.SETTINGS]: updatedSettings
        });

        console.log('Extension settings updated:', updatedSettings);
        sendResponse({ success: true, data: updatedSettings });

    } catch (error) {
        console.error('Error updating extension status:', error);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Handle post detection from content scripts
 */
async function handlePostDetected(data, sender, sendResponse) {
    try {
        console.log('Post detected:', data);

        // This will be implemented in later parts
        // For now, just acknowledge receipt
        sendResponse({ success: true, message: 'Post detection acknowledged' });

    } catch (error) {
        console.error('Error handling post detection:', error);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Handle comment posting confirmation
 */
async function handleCommentPosted(data, sender, sendResponse) {
    try {
        console.log('Comment posted:', data);

        // Update statistics
        const settings = await chrome.storage.local.get([CONFIG.STORAGE_KEYS.SETTINGS]);
        const currentSettings = settings[CONFIG.STORAGE_KEYS.SETTINGS] || {};

        currentSettings.totalCommentsMade = (currentSettings.totalCommentsMade || 0) + 1;

        await chrome.storage.local.set({
            [CONFIG.STORAGE_KEYS.SETTINGS]: currentSettings
        });

        sendResponse({ success: true, message: 'Comment logged successfully' });

    } catch (error) {
        console.error('Error handling comment posted:', error);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Handle logging events
 */
async function handleLogEvent(data, sendResponse) {
    try {
        const logEntry = {
            timestamp: Date.now(),
            level: data.level || 'INFO',
            message: data.message,
            platform: data.platform,
            details: data.details || {}
        };

        // Store log entry (implement proper log management in Part 9)
        console.log('Log entry:', logEntry);

        sendResponse({ success: true, message: 'Log entry recorded' });

    } catch (error) {
        console.error('Error handling log event:', error);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Handle tab updates to detect platform navigation
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only process when the tab is completely loaded
    if (changeInfo.status !== 'complete' || !tab.url) return;

    try {
        const settings = await chrome.storage.local.get([CONFIG.STORAGE_KEYS.SETTINGS]);
        const currentSettings = settings[CONFIG.STORAGE_KEYS.SETTINGS] || {};

        // Check if extension is enabled
        if (!currentSettings.isEnabled) return;

        // Detect platform based on URL
        let platform = null;
        if (tab.url.includes('linkedin.com')) {
            platform = 'LINKEDIN';
        } else if (tab.url.includes('x.com') || tab.url.includes('twitter.com')) {
            platform = 'TWITTER';
        }

        if (platform && currentSettings.selectedPlatforms.includes(platform)) {
            console.log(`User navigated to ${platform} - extension is active`);

            // Send message to content script (will be implemented in Parts 5 & 6)
            // chrome.tabs.sendMessage(tabId, { 
            //     type: 'EXTENSION_ACTIVE', 
            //     platform: platform 
            // });
        }

    } catch (error) {
        console.error('Error handling tab update:', error);
    }
});

/**
 * Handle extension action (popup) clicks
 */
chrome.action.onClicked.addListener(async (tab) => {
    console.log('Extension icon clicked');
    // Popup will handle this in Part 3
});

/**
 * Handle keyboard shortcuts
 */
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-extension') {
        console.log('Toggle extension shortcut pressed');

        try {
            const settings = await chrome.storage.local.get([CONFIG.STORAGE_KEYS.SETTINGS]);
            const currentSettings = settings[CONFIG.STORAGE_KEYS.SETTINGS] || {};

            // Toggle extension state
            currentSettings.isEnabled = !currentSettings.isEnabled;

            await chrome.storage.local.set({
                [CONFIG.STORAGE_KEYS.SETTINGS]: currentSettings
            });

            console.log(`Extension ${currentSettings.isEnabled ? 'enabled' : 'disabled'} via shortcut`);

        } catch (error) {
            console.error('Error toggling extension:', error);
        }
    }
});

/**
 * Service Worker keep-alive mechanism
 */
const KEEP_ALIVE_INTERVAL = 30000; // 30 seconds

setInterval(() => {
    console.log('Service Worker keep-alive ping');
}, KEEP_ALIVE_INTERVAL);

console.log('Social Media Auto-Comment Service Worker initialized');