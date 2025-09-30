/**
 * Service Worker for Social Media Auto-Comment Chrome Extension
 * 
 * This is the background script that manages the extension lifecycle,
 * handles messaging between content scripts and popup, and coordinates
 * the automated commenting process with comprehensive core logic.
 * 
 * Chrome Extension Manifest V3 Service Worker
 */

// Import utilities
import { CONFIG } from '../config.js';
import { storageManager } from '../utils/storage.js';
import { commentScheduler } from '../utils/scheduler.js';
import { geminiAPI } from '../services/gemini-api.js';

// Global state management
let extensionState = {
    isInitialized: false,
    currentSession: null,
    activeTabs: new Set(),
    platformStates: {
        LINKEDIN: { isActive: false, tabIds: [] },
        TWITTER: { isActive: false, tabIds: [] }
    }
};

/**
 * Extension installation and startup
 */
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('Social Media Auto-Comment Extension installed/updated:', details.reason);

    try {
        // Initialize storage manager
        await storageManager.initialize();

        // Initialize scheduler
        await commentScheduler.initialize();

        // Set up initial state based on installation reason
        if (details.reason === 'install') {
            console.log('First time installation - setting up defaults');
            await handleFirstInstall();
        } else if (details.reason === 'update') {
            console.log('Extension updated - checking for data migration');
            await handleUpdate(details.previousVersion);
        }

        extensionState.isInitialized = true;
        console.log('Extension initialization completed');

    } catch (error) {
        console.error('Error during extension initialization:', error);
        await storageManager.addLog('ERROR', 'Extension initialization failed', null, { error: error.message });
    }
});

/**
 * Handle first installation
 */
async function handleFirstInstall() {
    try {
        // Log first installation
        await storageManager.addLog('INFO', 'Extension installed for the first time');

        // Could open welcome page in the future
        // chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });

    } catch (error) {
        console.error('Error handling first install:', error);
    }
}

/**
 * Handle extension update
 */
async function handleUpdate(previousVersion) {
    try {
        await storageManager.addLog('INFO', `Extension updated from ${previousVersion} to ${CONFIG.VERSION || '1.0.0'}`);

        // Handle data migrations if needed in the future
        // await migrateData(previousVersion);

    } catch (error) {
        console.error('Error handling update:', error);
    }
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Service Worker received message:', message);

    // Handle async responses
    (async () => {
        try {
            let response;

            switch (message.type) {
                case 'GET_EXTENSION_STATUS':
                    response = await handleGetExtensionStatus();
                    break;

                case 'UPDATE_EXTENSION_STATUS':
                    response = await handleUpdateExtensionStatus(message.data);
                    break;

                case 'START_EXTENSION':
                    response = await handleStartExtension(message.data);
                    break;

                case 'STOP_EXTENSION':
                    response = await handleStopExtension();
                    break;

                case 'POST_DETECTED':
                    response = await handlePostDetected(message.data, sender);
                    break;

                case 'COMMENT_POSTED':
                    response = await handleCommentPosted(message.data, sender);
                    break;

                case 'COMMENT_FAILED':
                    response = await handleCommentFailed(message.data, sender);
                    break;

                case 'GET_SCHEDULER_STATUS':
                    response = await handleGetSchedulerStatus();
                    break;

                case 'GET_STATISTICS':
                    response = await handleGetStatistics();
                    break;

                case 'GET_LOGS':
                    response = await handleGetLogs(message.data);
                    break;

                case 'CLEAR_DATA':
                    response = await handleClearData();
                    break;

                case 'LOG_EVENT':
                    response = await handleLogEvent(message.data);
                    break;

                // Part 7 & 8: Gemini API and Comment Generation handlers
                case 'TEST_GEMINI_API':
                    response = await handleTestGeminiAPI(message.apiKey);
                    break;

                case 'SAVE_GEMINI_API_KEY':
                    response = await handleSaveGeminiAPIKey(message.apiKey);
                    break;

                case 'UPDATE_COMMENT_SETTINGS':
                    response = await handleUpdateCommentSettings(message.settings);
                    break;

                case 'GENERATE_AND_POST_COMMENT':
                    response = await handleGenerateAndPostComment(message.data, sender);
                    break;

                case 'API_KEY_ERROR':
                    response = await handleAPIKeyError(message);
                    break;

                case 'START_AUTOMATED_COMMENTING':
                    response = await handleStartAutomatedCommenting(message.data);
                    break;

                case 'STOP_AUTOMATED_COMMENTING':
                    response = await handleStopAutomatedCommenting();
                    break;

                case 'GET_DUPLICATE_STATISTICS':
                    response = await handleGetDuplicateStatistics();
                    break;

                case 'RESET_DUPLICATE_CHECKER':
                    response = await handleResetDuplicateChecker(message.includeHistory);
                    break;

                default:
                    console.warn('Unknown message type:', message.type);
                    response = { success: false, error: 'Unknown message type' };
            }

            sendResponse(response);

        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    })();

    // Return true to indicate async response
    return true;
});

/**
 * Get current extension status
 */
async function handleGetExtensionStatus() {
    try {
        const settings = await storageManager.getSettings();
        const schedulerStatus = commentScheduler.getStatus();
        const statistics = await storageManager.getStatistics();

        return {
            success: true,
            data: {
                ...settings,
                schedulerStatus,
                statistics,
                extensionState: {
                    isInitialized: extensionState.isInitialized,
                    currentSession: extensionState.currentSession,
                    activeTabs: Array.from(extensionState.activeTabs),
                    platformStates: extensionState.platformStates
                }
            }
        };
    } catch (error) {
        console.error('Error getting extension status:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update extension status/settings
 */
async function handleUpdateExtensionStatus(data) {
    try {
        const updatedSettings = await storageManager.updateSettings(data);

        // If interval was updated, update scheduler
        if (data.commentInterval) {
            commentScheduler.updateInterval(data.commentInterval);
        }

        await storageManager.addLog('INFO', 'Extension settings updated', null, { updates: data });

        return { success: true, data: updatedSettings };

    } catch (error) {
        console.error('Error updating extension status:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Start the extension
 */
async function handleStartExtension(data = {}) {
    try {
        const settings = await storageManager.getSettings();

        // Validation
        if (!settings.apiKey) {
            throw new Error('API key is required');
        }

        if (!settings.selectedPlatforms || settings.selectedPlatforms.length === 0) {
            throw new Error('At least one platform must be selected');
        }

        // Start session
        extensionState.currentSession = await storageManager.startSession();

        // Update settings to enabled
        await storageManager.updateSettings({ isEnabled: true });

        // Start scheduler with current settings
        await commentScheduler.start({
            commentInterval: settings.commentInterval || { min: 70000, max: 90000 }
        });

        // Activate monitoring on selected platforms
        await activatePlatformMonitoring(settings.selectedPlatforms);

        await storageManager.addLog('INFO', 'Extension started successfully', null, {
            sessionId: extensionState.currentSession,
            platforms: settings.selectedPlatforms
        });

        return {
            success: true,
            data: {
                sessionId: extensionState.currentSession,
                message: 'Extension started successfully'
            }
        };

    } catch (error) {
        console.error('Error starting extension:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Stop the extension
 */
async function handleStopExtension() {
    try {
        // Stop scheduler
        await commentScheduler.stop();

        // End current session
        if (extensionState.currentSession) {
            await storageManager.endSession();
        }

        // Update settings to disabled
        await storageManager.updateSettings({ isEnabled: false });

        // Deactivate platform monitoring
        await deactivatePlatformMonitoring();

        // Reset state
        extensionState.currentSession = null;
        extensionState.activeTabs.clear();
        extensionState.platformStates = {
            LINKEDIN: { isActive: false, tabIds: [] },
            TWITTER: { isActive: false, tabIds: [] }
        };

        await storageManager.addLog('INFO', 'Extension stopped successfully');

        return {
            success: true,
            data: { message: 'Extension stopped successfully' }
        };

    } catch (error) {
        console.error('Error stopping extension:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Activate platform monitoring
 */
async function activatePlatformMonitoring(platforms) {
    try {
        for (const platform of platforms) {
            extensionState.platformStates[platform].isActive = true;

            // Find existing tabs for this platform
            const tabs = await chrome.tabs.query({});
            for (const tab of tabs) {
                if (await isPlatformTab(tab.url, platform)) {
                    extensionState.platformStates[platform].tabIds.push(tab.id);
                    extensionState.activeTabs.add(tab.id);

                    // Send activation message to content script
                    try {
                        await chrome.tabs.sendMessage(tab.id, {
                            type: 'EXTENSION_ACTIVE',
                            platform: platform,
                            sessionId: extensionState.currentSession
                        });
                    } catch (error) {
                        // Content script might not be loaded yet
                        console.log(`Could not send activation message to tab ${tab.id}`);
                    }
                }
            }
        }

        console.log('Platform monitoring activated for:', platforms);

    } catch (error) {
        console.error('Error activating platform monitoring:', error);
    }
}

/**
 * Deactivate platform monitoring
 */
async function deactivatePlatformMonitoring() {
    try {
        // Send deactivation messages
        for (const tabId of extensionState.activeTabs) {
            try {
                await chrome.tabs.sendMessage(tabId, {
                    type: 'EXTENSION_INACTIVE'
                });
            } catch (error) {
                // Tab might be closed or content script unloaded
            }
        }

        // Reset platform states
        for (const platform in extensionState.platformStates) {
            extensionState.platformStates[platform] = { isActive: false, tabIds: [] };
        }

        extensionState.activeTabs.clear();

        console.log('Platform monitoring deactivated');

    } catch (error) {
        console.error('Error deactivating platform monitoring:', error);
    }
}

/**
 * Handle post detection from content scripts
 */
async function handlePostDetected(data, sender) {
    try {
        const { platform, posts } = data;
        const tabId = sender.tab?.id;

        console.log(`Post detected on ${platform}:`, posts?.length || 0, 'posts');

        // Log post detection
        await storageManager.addLog('INFO', `Posts detected on ${platform}`, platform, {
            tabId,
            postCount: posts?.length || 0,
            url: sender.tab?.url
        });

        // This will trigger the commenting process in future parts
        // For now, just acknowledge
        return {
            success: true,
            message: 'Post detection acknowledged',
            shouldProcess: extensionState.currentSession !== null
        };

    } catch (error) {
        console.error('Error handling post detection:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Handle comment posting confirmation
 */
async function handleCommentPosted(data, sender) {
    try {
        const { platform, postData, comment } = data;

        // Record the comment in storage
        await storageManager.recordComment(platform, postData);

        // Mark post as processed
        if (postData.id) {
            await storageManager.addProcessedPost(platform, postData.id, {
                commentPosted: true,
                comment: comment,
                timestamp: Date.now()
            });
        }

        console.log(`Comment posted successfully on ${platform}`);

        return {
            success: true,
            message: 'Comment logged successfully'
        };

    } catch (error) {
        console.error('Error handling comment posted:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Handle comment posting failure
 */
async function handleCommentFailed(data, sender) {
    try {
        const { platform, postData, error, reason } = data;

        await storageManager.addLog('ERROR', `Comment failed on ${platform}`, platform, {
            postData,
            error,
            reason,
            url: sender.tab?.url
        });

        console.log(`Comment failed on ${platform}:`, reason);

        return {
            success: true,
            message: 'Comment failure logged'
        };

    } catch (error) {
        console.error('Error handling comment failure:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get scheduler status
 */
async function handleGetSchedulerStatus() {
    try {
        const status = commentScheduler.getStatus();
        const statistics = commentScheduler.getStatistics();

        return {
            success: true,
            data: {
                ...status,
                statistics
            }
        };
    } catch (error) {
        console.error('Error getting scheduler status:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get extension statistics
 */
async function handleGetStatistics() {
    try {
        const statistics = await storageManager.getStatistics();
        const schedulerStats = commentScheduler.getStatistics();

        return {
            success: true,
            data: {
                ...statistics,
                scheduler: schedulerStats,
                session: extensionState.currentSession ? {
                    id: extensionState.currentSession,
                    activeTabs: Array.from(extensionState.activeTabs).length
                } : null
            }
        };
    } catch (error) {
        console.error('Error getting statistics:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get logs
 */
async function handleGetLogs(data = {}) {
    try {
        const limit = data.limit || 100;
        const logs = await storageManager.getLogs(limit);

        return {
            success: true,
            data: logs
        };
    } catch (error) {
        console.error('Error getting logs:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Clear all data
 */
async function handleClearData() {
    try {
        // Stop extension if running
        if (extensionState.currentSession) {
            await handleStopExtension();
        }

        // Clear all stored data
        await storageManager.clearAll();

        // Reset scheduler statistics
        commentScheduler.resetStatistics();

        return {
            success: true,
            data: { message: 'All data cleared successfully' }
        };
    } catch (error) {
        console.error('Error clearing data:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Handle logging events
 */
async function handleLogEvent(data) {
    try {
        const { level, message, platform, details } = data;

        await storageManager.addLog(level || 'INFO', message, platform, details || {});

        return { success: true, message: 'Log entry recorded' };

    } catch (error) {
        console.error('Error handling log event:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Part 7 & 8: Gemini API and Automated Commenting Handlers
 */

/**
 * Test Gemini API connection
 */
async function handleTestGeminiAPI(apiKey) {
    try {
        console.log('[Service Worker] Testing Gemini API connection');

        // Temporarily set API key for testing
        await geminiAPI.setApiKey(apiKey);

        // Perform connection test
        const testResult = await geminiAPI.testConnection();

        if (testResult.success) {
            return { success: true, message: 'API connection successful' };
        } else {
            return { success: false, error: testResult.message };
        }

    } catch (error) {
        console.error('[Service Worker] Gemini API test failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Save Gemini API key
 */
async function handleSaveGeminiAPIKey(apiKey) {
    try {
        console.log('[Service Worker] Saving Gemini API key');

        await geminiAPI.setApiKey(apiKey);

        // Update extension settings
        const currentSettings = await storageManager.getSettings();
        currentSettings.hasApiKey = true;
        await storageManager.updateSettings(currentSettings);

        return { success: true, message: 'API key saved successfully' };

    } catch (error) {
        console.error('[Service Worker] Failed to save API key:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update comment generation settings
 */
async function handleUpdateCommentSettings(settings) {
    try {
        console.log('[Service Worker] Updating comment settings:', settings);

        // Save to Chrome storage
        await chrome.storage.sync.set({
            commentStyle: settings.commentStyle,
            commentLength: settings.commentLength,
            commentTone: settings.commentTone || 'professional yet friendly'
        });

        return { success: true, message: 'Comment settings updated' };

    } catch (error) {
        console.error('[Service Worker] Failed to update comment settings:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Generate and post comment using AI
 */
async function handleGenerateAndPostComment(data, sender) {
    try {
        console.log('[Service Worker] Generating and posting AI comment');

        const { postData, platform } = data;

        // Check if extension is active
        if (!extensionState.currentSession) {
            return { success: false, error: 'Extension is not active' };
        }

        // Forward to content script for processing
        const response = await chrome.tabs.sendMessage(sender.tab.id, {
            type: 'GENERATE_AND_POST_COMMENT',
            postData,
            platform
        });

        // Update statistics
        if (response.success) {
            await updateSessionStatistics('commentGenerated', platform);
        }

        return response;

    } catch (error) {
        console.error('[Service Worker] Failed to generate and post comment:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Handle API key errors from content scripts
 */
async function handleAPIKeyError(message) {
    try {
        console.log('[Service Worker] API key error reported:', message);

        // Log the error
        await storageManager.addLog('ERROR', 'API Key Error', message.platform, {
            message: message.message,
            timestamp: Date.now()
        });

        // Update extension status to indicate API key issue
        const currentSettings = await storageManager.getSettings();
        currentSettings.hasApiKeyError = true;
        await storageManager.updateSettings(currentSettings);

        // Notify popup if open
        try {
            chrome.runtime.sendMessage({
                type: 'API_KEY_ERROR_NOTIFICATION',
                platform: message.platform,
                message: message.message
            });
        } catch (popupError) {
            // Popup not open, ignore
        }

        return { success: true, message: 'API key error handled' };

    } catch (error) {
        console.error('[Service Worker] Failed to handle API key error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Start automated commenting workflow
 */
async function handleStartAutomatedCommenting(data) {
    try {
        console.log('[Service Worker] Starting automated commenting workflow');

        const { platforms = [], intervals = {} } = data;

        // Validate that we have an API key
        const hasApiKey = await geminiAPI.isApiKeyValid();
        if (!hasApiKey) {
            return { success: false, error: 'Valid Gemini API key required' };
        }

        // Update platform states
        platforms.forEach(platform => {
            extensionState.platformStates[platform.toUpperCase()].isActive = true;
        });

        // Configure scheduler for automated commenting
        await commentScheduler.configure({
            isEnabled: true,
            intervals: intervals,
            platforms: platforms,
            mode: 'automated' // New mode for Part 8
        });

        // Start the automated workflow
        await commentScheduler.start();

        return { success: true, message: 'Automated commenting started' };

    } catch (error) {
        console.error('[Service Worker] Failed to start automated commenting:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Stop automated commenting workflow
 */
async function handleStopAutomatedCommenting() {
    try {
        console.log('[Service Worker] Stopping automated commenting workflow');

        // Stop scheduler
        await commentScheduler.stop();

        // Deactivate platform states
        Object.keys(extensionState.platformStates).forEach(platform => {
            extensionState.platformStates[platform].isActive = false;
        });

        return { success: true, message: 'Automated commenting stopped' };

    } catch (error) {
        console.error('[Service Worker] Failed to stop automated commenting:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get duplicate checker statistics
 */
async function handleGetDuplicateStatistics() {
    try {
        console.log('[Service Worker] Getting duplicate checker statistics');

        // Import duplicate checker
        const { duplicateChecker } = await import('../utils/duplicate-checker.js');

        const stats = await duplicateChecker.getStatistics();
        const patterns = await duplicateChecker.getRecentPatterns(7);

        return {
            success: true,
            data: {
                statistics: stats,
                recentPatterns: patterns
            }
        };

    } catch (error) {
        console.error('[Service Worker] Failed to get duplicate statistics:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Reset duplicate checker data
 */
async function handleResetDuplicateChecker(includeHistory = false) {
    try {
        console.log('[Service Worker] Resetting duplicate checker');

        // Import duplicate checker
        const { duplicateChecker } = await import('../utils/duplicate-checker.js');

        await duplicateChecker.reset(includeHistory);

        return { success: true, message: 'Duplicate checker reset successfully' };

    } catch (error) {
        console.error('[Service Worker] Failed to reset duplicate checker:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update session statistics helper
 */
async function updateSessionStatistics(type, platform) {
    try {
        if (!extensionState.currentSession) return;

        const sessionData = await storageManager.getSessionData(extensionState.currentSession.id);

        if (!sessionData.statistics) {
            sessionData.statistics = {};
        }

        if (!sessionData.statistics[platform]) {
            sessionData.statistics[platform] = {};
        }

        sessionData.statistics[platform][type] = (sessionData.statistics[platform][type] || 0) + 1;
        sessionData.lastActivity = Date.now();

        await storageManager.updateSessionData(extensionState.currentSession.id, sessionData);

    } catch (error) {
        console.error('[Service Worker] Failed to update session statistics:', error);
    }
}

/**
 * Handle tab updates to detect platform navigation and manage active tabs
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only process when the tab is completely loaded
    if (changeInfo.status !== 'complete' || !tab.url) return;

    try {
        const settings = await storageManager.getSettings();

        // Check if extension is enabled
        if (!settings.isEnabled || !extensionState.currentSession) return;

        // Detect platform based on URL
        let platform = null;
        if (await isPlatformTab(tab.url, 'LINKEDIN')) {
            platform = 'LINKEDIN';
        } else if (await isPlatformTab(tab.url, 'TWITTER')) {
            platform = 'TWITTER';
        }

        if (platform && settings.selectedPlatforms?.includes(platform)) {
            console.log(`User navigated to ${platform} - extension is active`);

            // Add to active tabs
            extensionState.activeTabs.add(tabId);
            if (!extensionState.platformStates[platform].tabIds.includes(tabId)) {
                extensionState.platformStates[platform].tabIds.push(tabId);
            }

            // Send activation message to content script
            try {
                await chrome.tabs.sendMessage(tabId, {
                    type: 'EXTENSION_ACTIVE',
                    platform: platform,
                    sessionId: extensionState.currentSession,
                    settings: {
                        csFilterEnabled: settings.csFilterEnabled,
                        smartTypingEnabled: settings.smartTypingEnabled
                    }
                });

                await storageManager.addLog('INFO', `Platform activated: ${platform}`, platform, {
                    tabId,
                    url: tab.url
                });

            } catch (error) {
                console.log(`Content script not ready on tab ${tabId}:`, error.message);
            }
        }

    } catch (error) {
        console.error('Error handling tab update:', error);
    }
});

/**
 * Handle tab removal to clean up active tabs
 */
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    try {
        // Remove from active tabs
        extensionState.activeTabs.delete(tabId);

        // Remove from platform states
        for (const platform in extensionState.platformStates) {
            const index = extensionState.platformStates[platform].tabIds.indexOf(tabId);
            if (index > -1) {
                extensionState.platformStates[platform].tabIds.splice(index, 1);
                console.log(`Tab ${tabId} removed from ${platform} monitoring`);
            }
        }

    } catch (error) {
        console.error('Error handling tab removal:', error);
    }
});

/**
 * Handle window focus changes to manage extension activity
 */
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    try {
        if (!extensionState.currentSession) return;

        if (windowId === chrome.windows.WINDOW_ID_NONE) {
            // Browser lost focus - pause scheduler temporarily
            console.log('Browser lost focus - pausing activity');
        } else {
            // Browser gained focus - resume normal activity
            console.log('Browser gained focus - resuming activity');
        }

    } catch (error) {
        console.error('Error handling window focus change:', error);
    }
});

/**
 * Handle extension action (popup) clicks
 */
chrome.action.onClicked.addListener(async (tab) => {
    console.log('Extension icon clicked');
    // Popup will handle this automatically
});

/**
 * Handle keyboard shortcuts
 */
chrome.commands.onCommand.addListener(async (command) => {
    try {
        if (command === 'toggle-extension') {
            console.log('Toggle extension shortcut pressed');

            const settings = await storageManager.getSettings();

            if (settings.isEnabled) {
                await handleStopExtension();
                console.log('Extension disabled via shortcut');
            } else {
                // Check if can be started
                if (settings.apiKey && settings.selectedPlatforms?.length > 0) {
                    await handleStartExtension();
                    console.log('Extension enabled via shortcut');
                } else {
                    console.log('Cannot start extension - missing configuration');
                    await storageManager.addLog('WARN', 'Shortcut toggle failed - missing configuration');
                }
            }
        }
    } catch (error) {
        console.error('Error handling keyboard command:', error);
    }
});

/**
 * Handle scheduled comment execution messages from scheduler
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXECUTE_SCHEDULED_COMMENT') {
        // This is handled by the main message listener above
        // But we can add specific logic here if needed
        console.log('Scheduled comment execution triggered');
    }
});

/**
 * Handle system idle state changes
 */
chrome.idle.onStateChanged.addListener(async (newState) => {
    try {
        console.log('System idle state changed to:', newState);

        if (!extensionState.currentSession) return;

        if (newState === 'idle' || newState === 'locked') {
            // System is idle - reduce activity
            await storageManager.addLog('INFO', `System state: ${newState} - reducing activity`);
        } else if (newState === 'active') {
            // System is active - resume normal activity
            await storageManager.addLog('INFO', 'System active - resuming normal activity');

            // Check if scheduler needs to be restarted
            if (!commentScheduler.getStatus().isRunning) {
                const settings = await storageManager.getSettings();
                if (settings.isEnabled) {
                    await commentScheduler.start({ commentInterval: settings.commentInterval });
                }
            }
        }

    } catch (error) {
        console.error('Error handling idle state change:', error);
    }
});

/**
 * Handle alarm events (for backup scheduling)
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
    try {
        console.log('Alarm triggered:', alarm.name);

        switch (alarm.name) {
            case 'cleanup':
                await performPeriodicCleanup();
                break;
            case 'backup':
                await performPeriodicBackup();
                break;
            case 'health-check':
                await performHealthCheck();
                break;
        }

    } catch (error) {
        console.error('Error handling alarm:', error);
    }
});

/**
 * Set up periodic maintenance alarms
 */
async function setupPeriodicAlarms() {
    try {
        // Daily cleanup alarm
        chrome.alarms.create('cleanup', {
            delayInMinutes: 60, // First run in 1 hour
            periodInMinutes: 24 * 60 // Then every 24 hours
        });

        // Weekly backup alarm
        chrome.alarms.create('backup', {
            delayInMinutes: 24 * 60, // First run in 24 hours
            periodInMinutes: 7 * 24 * 60 // Then every 7 days
        });

        // Health check every 30 minutes
        chrome.alarms.create('health-check', {
            delayInMinutes: 30,
            periodInMinutes: 30
        });

        console.log('Periodic alarms set up successfully');

    } catch (error) {
        console.error('Error setting up periodic alarms:', error);
    }
}

/**
 * Perform periodic cleanup
 */
async function performPeriodicCleanup() {
    try {
        console.log('Performing periodic cleanup...');

        await storageManager.cleanupOldData();

        // Check storage usage
        const usage = await storageManager.getStorageUsage();
        if (usage && usage.percentage > 80) {
            await storageManager.addLog('WARN', `Storage usage high: ${usage.percentage}%`, null, usage);
        }

        await storageManager.addLog('INFO', 'Periodic cleanup completed');

    } catch (error) {
        console.error('Error during periodic cleanup:', error);
    }
}

/**
 * Perform periodic backup (optional feature)
 */
async function performPeriodicBackup() {
    try {
        console.log('Performing periodic backup check...');

        // This could implement data export functionality
        await storageManager.addLog('INFO', 'Periodic backup check completed');

    } catch (error) {
        console.error('Error during periodic backup:', error);
    }
}

/**
 * Perform health check
 */
async function performHealthCheck() {
    try {
        // Check if extension is in a healthy state
        const settings = await storageManager.getSettings();
        const schedulerStatus = commentScheduler.getStatus();

        // Check for inconsistencies
        const issues = [];

        if (settings.isEnabled && !schedulerStatus.isRunning) {
            issues.push('Extension enabled but scheduler not running');
        }

        if (extensionState.currentSession && !settings.isEnabled) {
            issues.push('Active session but extension disabled');
        }

        if (issues.length > 0) {
            await storageManager.addLog('WARN', 'Health check issues detected', null, { issues });

            // Attempt to fix issues
            if (settings.isEnabled && !schedulerStatus.isRunning) {
                try {
                    await commentScheduler.start({ commentInterval: settings.commentInterval });
                    await storageManager.addLog('INFO', 'Scheduler restarted during health check');
                } catch (error) {
                    await storageManager.addLog('ERROR', 'Failed to restart scheduler', null, { error: error.message });
                }
            }
        }

    } catch (error) {
        console.error('Error during health check:', error);
    }
}

/**
 * Check if a URL belongs to a specific platform
 */
async function isPlatformTab(url, platform) {
    if (!url) return false;

    switch (platform) {
        case 'LINKEDIN':
            return url.includes('linkedin.com');
        case 'TWITTER':
            return url.includes('x.com') || url.includes('twitter.com');
        default:
            return false;
    }
}

/**
 * Service Worker startup initialization
 */
async function initializeServiceWorker() {
    try {
        console.log('Service Worker starting up...');

        // Set up periodic alarms
        await setupPeriodicAlarms();

        // Check if extension was previously running and restore state
        const settings = await storageManager.getSettings();
        if (settings.isEnabled) {
            // Extension was enabled - check if we should restart it
            await storageManager.addLog('INFO', 'Extension was previously enabled - checking restart conditions');

            // Don't auto-restart for now, let user manually start
            await storageManager.updateSettings({ isEnabled: false });
        }

        extensionState.isInitialized = true;
        console.log('Service Worker initialization completed');

    } catch (error) {
        console.error('Error during Service Worker initialization:', error);
    }
}

/**
 * Service Worker keep-alive mechanism
 */
const KEEP_ALIVE_INTERVAL = 30000; // 30 seconds

setInterval(async () => {
    try {
        // Perform lightweight operations to keep service worker alive
        const timestamp = Date.now();

        // Check scheduler health
        if (extensionState.currentSession && !commentScheduler.getStatus().isRunning) {
            console.warn('Scheduler not running during active session - investigating');
            await performHealthCheck();
        }

        // Log keep-alive periodically (every 5 minutes)
        if (timestamp % 300000 < 30000) { // 5 minutes = 300000ms
            console.log('Service Worker keep-alive ping');
        }

    } catch (error) {
        console.error('Error in keep-alive mechanism:', error);
    }
}, KEEP_ALIVE_INTERVAL);

// Initialize service worker
initializeServiceWorker();

console.log('Social Media Auto-Comment Service Worker initialized');