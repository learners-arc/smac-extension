/**
 * Social Media Auto-Comment Chrome Extension - Popup JavaScript
 * 
 * Handles all popup UI interactions, settings management, and communication
 * with the service worker. Provides a professional user experience with
 * real-time updates and comprehensive error handling.
 */

// Import configuration (will be available as global from manifest)
// const { CONFIG } = await import('../config.js');

// Import debug panel
import { DebugPanel } from './debug-panel.js';

/**
 * Popup Application Class
 * Manages all popup functionality and state
 */
class PopupApp {
    constructor() {
        this.isInitialized = false;
        this.currentSettings = {};
        this.statistics = {};
        this.isExtensionActive = false;

        // DOM element references
        this.elements = {};

        // Debug panel instance
        this.debugPanel = null;

        // Bind methods
        this.handleStartClick = this.handleStartClick.bind(this);
        this.handleStopClick = this.handleStopClick.bind(this);
        this.handlePlatformChange = this.handlePlatformChange.bind(this);
        this.handleApiKeyChange = this.handleApiKeyChange.bind(this);
        this.handleSettingsChange = this.handleSettingsChange.bind(this);
    }

    /**
     * Initialize the popup application
     */
    async init() {
        try {
            console.log('Initializing popup application...');
            this.showLoading('Loading extension data...');

            // Cache DOM elements
            this.cacheElements();

            // Set up event listeners
            this.setupEventListeners();

            // Load current settings and statistics
            await this.loadExtensionData();

            // Load API configuration
            await this.loadApiConfiguration();

            // Update UI with loaded data
            this.updateUI();

            // Initialize debug panel
            this.debugPanel = new DebugPanel();

            this.isInitialized = true;
            console.log('Popup application initialized successfully');

        } catch (error) {
            console.error('Error initializing popup:', error);
            this.showToast('Failed to initialize extension', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Cache DOM element references
     */
    cacheElements() {
        try {
            // Status elements
            this.elements.statusDot = document.getElementById('statusDot');
            this.elements.statusText = document.getElementById('statusText');

            // Platform elements
            this.elements.linkedinToggle = document.getElementById('linkedinToggle');
            this.elements.twitterToggle = document.getElementById('twitterToggle');

            // API configuration elements
            this.elements.apiKeyInput = document.getElementById('apiKeyInput');
            this.elements.showApiKeyToggle = document.getElementById('showApiKeyToggle');
            this.elements.testApiKey = document.getElementById('testApiKey');
            this.elements.saveApiKey = document.getElementById('saveApiKey');
            this.elements.apiKeyStatus = document.getElementById('apiKeyStatus');
            this.elements.commentStyleSelect = document.getElementById('commentStyleSelect');
            this.elements.commentLengthSelect = document.getElementById('commentLengthSelect');

            // Legacy API elements (if they exist)
            this.elements.apiKey = document.getElementById('apiKey');
            this.elements.toggleApiKey = document.getElementById('toggleApiKey');

            // Settings elements
            this.elements.intervalSlider = document.getElementById('intervalSlider');
            this.elements.intervalValue = document.getElementById('intervalValue');
            this.elements.csFilterToggle = document.getElementById('csFilterToggle');
            this.elements.smartTypingToggle = document.getElementById('smartTypingToggle');

            // Statistics elements
            this.elements.totalComments = document.getElementById('totalComments');
            this.elements.sessionsToday = document.getElementById('sessionsToday');
            this.elements.postsProcessed = document.getElementById('postsProcessed');
            this.elements.successRate = document.getElementById('successRate');

            // Control buttons
            this.elements.startBtn = document.getElementById('startBtn');
            this.elements.stopBtn = document.getElementById('stopBtn');
            this.elements.viewLogsBtn = document.getElementById('viewLogsBtn');
            this.elements.clearDataBtn = document.getElementById('clearDataBtn');

            // Footer links
            this.elements.helpLink = document.getElementById('helpLink');
            this.elements.settingsLink = document.getElementById('settingsLink');

            // Overlay and toast
            this.elements.loadingOverlay = document.getElementById('loadingOverlay');
            this.elements.toastContainer = document.getElementById('toastContainer');

            // Validate critical elements
            const criticalElements = [
                'statusDot', 'startBtn', 'stopBtn', 'loadingOverlay', 'toastContainer'
            ];

            for (const elementName of criticalElements) {
                if (!this.elements[elementName]) {
                    throw new Error(`Critical element missing: ${elementName}`);
                }
            }

            console.log('All DOM elements cached successfully');

        } catch (error) {
            console.error('Error caching DOM elements:', error);
            throw error; // Re-throw to be handled by caller
        }
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Platform selection
        this.elements.linkedinToggle.addEventListener('change', this.handlePlatformChange);
        this.elements.twitterToggle.addEventListener('change', this.handlePlatformChange);

        // New API configuration handlers
        if (this.elements.apiKeyInput) {
            this.elements.apiKeyInput.addEventListener('input', this.handleApiKeyInput.bind(this));
            this.elements.apiKeyInput.addEventListener('paste', this.handleApiKeyInput.bind(this));
        }

        if (this.elements.showApiKeyToggle) {
            this.elements.showApiKeyToggle.addEventListener('click', this.toggleApiKeyVisibility.bind(this));
        }

        if (this.elements.testApiKey) {
            this.elements.testApiKey.addEventListener('click', this.handleTestApiKey.bind(this));
        }

        if (this.elements.saveApiKey) {
            this.elements.saveApiKey.addEventListener('click', this.handleSaveApiKey.bind(this));
        }

        if (this.elements.commentStyleSelect) {
            this.elements.commentStyleSelect.addEventListener('change', this.handleCommentSettingsChange.bind(this));
        }

        if (this.elements.commentLengthSelect) {
            this.elements.commentLengthSelect.addEventListener('change', this.handleCommentSettingsChange.bind(this));
        }

        // Legacy API key management (if elements exist)
        if (this.elements.apiKey) {
            this.elements.apiKey.addEventListener('input', this.handleApiKeyChange);
        }
        if (this.elements.toggleApiKey) {
            this.elements.toggleApiKey.addEventListener('click', this.toggleApiKeyVisibility.bind(this));
        }

        // Settings
        this.elements.intervalSlider.addEventListener('input', this.handleIntervalChange.bind(this));
        this.elements.csFilterToggle.addEventListener('change', this.handleSettingsChange);
        this.elements.smartTypingToggle.addEventListener('change', this.handleSettingsChange);

        // Control buttons
        this.elements.startBtn.addEventListener('click', this.handleStartClick);
        this.elements.stopBtn.addEventListener('click', this.handleStopClick);
        this.elements.viewLogsBtn.addEventListener('click', this.handleViewLogs.bind(this));
        this.elements.clearDataBtn.addEventListener('click', this.handleClearData.bind(this));

        // Debug panel toggle
        const debugButton = document.getElementById('debugPanelToggle');
        if (debugButton) {
            debugButton.addEventListener('click', () => {
                this.debugPanel.toggle();
            });
        }

        // Footer links
        this.elements.helpLink.addEventListener('click', this.handleHelpClick.bind(this));
        this.elements.settingsLink.addEventListener('click', this.handleSettingsClick.bind(this));

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
    }

    /**
     * Load extension data from storage
     */
    async loadExtensionData() {
        try {
            // Get settings from service worker
            const response = await this.sendMessage({ type: 'GET_EXTENSION_STATUS' });

            if (response.success) {
                this.currentSettings = response.data;
                console.log('Loaded settings:', this.currentSettings);
            } else {
                throw new Error(response.error || 'Failed to load settings');
            }

            // Load statistics (mock data for now, will be implemented in later parts)
            this.statistics = {
                totalComments: this.currentSettings.totalCommentsMade || 0,
                sessionsToday: 0,
                postsProcessed: 0,
                successRate: this.calculateSuccessRate()
            };

        } catch (error) {
            console.error('Error loading extension data:', error);
            // Set default values if loading fails
            this.currentSettings = {
                isEnabled: false,
                selectedPlatforms: [],
                apiKey: '',
                commentInterval: { min: 70, max: 90 },
                csFilterEnabled: true,
                smartTypingEnabled: true
            };
            throw error;
        }
    }

    /**
     * Update UI elements with current data
     */
    updateUI() {
        // Update status indicator
        this.updateStatusIndicator();

        // Update platform selections
        this.elements.linkedinToggle.checked = this.currentSettings.selectedPlatforms?.includes('LINKEDIN') || false;
        this.elements.twitterToggle.checked = this.currentSettings.selectedPlatforms?.includes('TWITTER') || false;

        // Update API key (masked)
        if (this.currentSettings.apiKey) {
            this.elements.apiKey.value = '•'.repeat(20);
            this.elements.apiKey.dataset.hasKey = 'true';
        }

        // Update settings
        const interval = Math.round((this.currentSettings.commentInterval?.min + this.currentSettings.commentInterval?.max) / 2) || 80;
        this.elements.intervalSlider.value = interval;
        this.elements.intervalValue.textContent = `${interval}s`;

        this.elements.csFilterToggle.checked = this.currentSettings.csFilterEnabled !== false;
        this.elements.smartTypingToggle.checked = this.currentSettings.smartTypingEnabled !== false;

        // Update statistics
        this.updateStatistics();

        // Update button states
        this.updateButtonStates();
    }

    /**
     * Update status indicator
     */
    updateStatusIndicator() {
        try {
            const isActive = this.currentSettings.isEnabled;

            if (this.elements.statusDot && this.elements.statusDot.classList) {
                this.elements.statusDot.classList.toggle('active', isActive);
            }

            if (this.elements.statusText) {
                this.elements.statusText.textContent = isActive ? 'Active' : 'Inactive';
            }

            this.isExtensionActive = isActive;
        } catch (error) {
            console.error('Error updating status indicator:', error);
        }
    }

    /**
     * Update statistics display
     */
    updateStatistics() {
        this.elements.totalComments.textContent = this.statistics.totalComments || 0;
        this.elements.sessionsToday.textContent = this.statistics.sessionsToday || 0;
        this.elements.postsProcessed.textContent = this.statistics.postsProcessed || 0;
        this.elements.successRate.textContent = `${this.statistics.successRate || 0}%`;
    }

    /**
     * Update button states based on current status
     */
    updateButtonStates() {
        const canStart = this.canStartExtension();

        this.elements.startBtn.disabled = this.isExtensionActive || !canStart;
        this.elements.stopBtn.disabled = !this.isExtensionActive;

        // Update button text based on validation
        if (!canStart && !this.isExtensionActive) {
            const missing = this.getMissingRequirements();
            this.elements.startBtn.textContent = `Missing: ${missing.join(', ')}`;
        } else {
            this.elements.startBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="btn-icon">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                ${this.isExtensionActive ? 'Running...' : 'Start Auto-Comment'}
            `;
        }
    }

    /**
     * Check if extension can be started
     */
    canStartExtension() {
        return this.currentSettings.apiKey &&
            this.currentSettings.selectedPlatforms?.length > 0;
    }

    /**
     * Get list of missing requirements
     */
    getMissingRequirements() {
        const missing = [];

        if (!this.currentSettings.apiKey) {
            missing.push('API Key');
        }

        if (!this.currentSettings.selectedPlatforms?.length) {
            missing.push('Platform');
        }

        return missing;
    }

    /**
     * Handle platform selection changes
     */
    async handlePlatformChange(event) {
        try {
            const platform = event.target.value;
            const isChecked = event.target.checked;

            let selectedPlatforms = [...(this.currentSettings.selectedPlatforms || [])];

            if (isChecked && !selectedPlatforms.includes(platform)) {
                selectedPlatforms.push(platform);
            } else if (!isChecked) {
                selectedPlatforms = selectedPlatforms.filter(p => p !== platform);
            }

            await this.updateSetting('selectedPlatforms', selectedPlatforms);
            this.updateButtonStates();

            console.log('Platform selection updated:', selectedPlatforms);

        } catch (error) {
            console.error('Error handling platform change:', error);
            this.showToast('Failed to update platform selection', 'error');
        }
    }

    /**
     * Handle API key input changes
     */
    async handleApiKeyChange(event) {
        try {
            const value = event.target.value;

            // Don't update if it's the masked display
            if (event.target.dataset.hasKey === 'true' && value === '•'.repeat(20)) {
                return;
            }

            // Clear the masked state when user starts typing
            if (event.target.dataset.hasKey === 'true') {
                event.target.value = '';
                event.target.dataset.hasKey = 'false';
            }

            await this.updateSetting('apiKey', value);
            this.updateButtonStates();

        } catch (error) {
            console.error('Error handling API key change:', error);
            this.showToast('Failed to update API key', 'error');
        }
    }

    /**
     * Toggle API key visibility
     */
    toggleApiKeyVisibility() {
        const input = this.elements.apiKey;
        const button = this.elements.toggleApiKey;

        if (input.type === 'password') {
            input.type = 'text';
            button.title = 'Hide API Key';
        } else {
            input.type = 'password';
            button.title = 'Show API Key';
        }
    }

    /**
     * Handle interval slider changes
     */
    async handleIntervalChange(event) {
        try {
            const value = parseInt(event.target.value);
            this.elements.intervalValue.textContent = `${value}s`;

            // Update the comment interval with some randomization
            const interval = {
                min: Math.max(30, value - 5),
                max: Math.min(90, value + 5)
            };

            await this.updateSetting('commentInterval', interval);

        } catch (error) {
            console.error('Error handling interval change:', error);
            this.showToast('Failed to update interval', 'error');
        }
    }

    /**
     * Handle other settings changes
     */
    async handleSettingsChange(event) {
        try {
            const settingName = event.target.id.replace('Toggle', 'Enabled');
            const value = event.target.checked;

            await this.updateSetting(settingName, value);

        } catch (error) {
            console.error('Error handling settings change:', error);
            this.showToast('Failed to update setting', 'error');
        }
    }

    /**
     * Handle start button click
     */
    async handleStartClick() {
        try {
            if (!this.canStartExtension()) {
                const missing = this.getMissingRequirements();
                this.showToast(`Please configure: ${missing.join(', ')}`, 'warning');
                return;
            }

            this.showLoading('Starting auto-comment...');

            const response = await this.sendMessage({
                type: 'UPDATE_EXTENSION_STATUS',
                data: { isEnabled: true }
            });

            if (response.success) {
                this.currentSettings.isEnabled = true;
                this.updateStatusIndicator();
                this.updateButtonStates();
                this.showToast('Auto-comment started successfully!', 'success');

                // Open appropriate platform tabs
                await this.openPlatformTabs();

            } else {
                throw new Error(response.error || 'Failed to start extension');
            }

        } catch (error) {
            console.error('Error starting extension:', error);
            this.showToast('Failed to start auto-comment', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Handle stop button click
     */
    async handleStopClick() {
        try {
            this.showLoading('Stopping auto-comment...');

            const response = await this.sendMessage({
                type: 'UPDATE_EXTENSION_STATUS',
                data: { isEnabled: false }
            });

            if (response.success) {
                this.currentSettings.isEnabled = false;
                this.updateStatusIndicator();
                this.updateButtonStates();
                this.showToast('Auto-comment stopped', 'success');

            } else {
                throw new Error(response.error || 'Failed to stop extension');
            }

        } catch (error) {
            console.error('Error stopping extension:', error);
            this.showToast('Failed to stop auto-comment', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Open platform tabs when starting
     */
    async openPlatformTabs() {
        try {
            const platforms = this.currentSettings.selectedPlatforms || [];

            for (const platform of platforms) {
                let url = '';
                if (platform === 'LINKEDIN') {
                    url = 'https://www.linkedin.com/feed/';
                } else if (platform === 'TWITTER') {
                    url = 'https://x.com/home';
                }

                if (url) {
                    await chrome.tabs.create({ url });
                }
            }

        } catch (error) {
            console.error('Error opening platform tabs:', error);
            // Don't show error toast as this is not critical
        }
    }

    /**
     * Handle view logs button click
     */
    async handleViewLogs() {
        try {
            // Show debug panel with logs tab
            if (this.debugPanel) {
                this.debugPanel.showLogs();
                this.showToast('Logs panel opened', 'success');
            } else {
                console.error('Debug panel not initialized');
                this.showToast('Debug panel not available', 'error');
            }

        } catch (error) {
            console.error('Error viewing logs:', error);
            this.showToast('Failed to open logs', 'error');
        }
    }

    /**
     * Handle clear data button click
     */
    async handleClearData() {
        try {
            if (!confirm('Are you sure you want to clear all extension data? This cannot be undone.')) {
                return;
            }

            this.showLoading('Clearing data...');

            // Clear storage (implementation will be completed in Part 4)
            await chrome.storage.local.clear();

            // Reset current state
            this.currentSettings = {
                isEnabled: false,
                selectedPlatforms: [],
                apiKey: '',
                commentInterval: { min: 70, max: 90 }
            };

            this.statistics = {
                totalComments: 0,
                sessionsToday: 0,
                postsProcessed: 0,
                successRate: 0
            };

            // Update UI
            this.updateUI();

            this.showToast('All data cleared successfully', 'success');

        } catch (error) {
            console.error('Error clearing data:', error);
            this.showToast('Failed to clear data', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Handle help link click
     */
    handleHelpClick(event) {
        event.preventDefault();
        chrome.tabs.create({
            url: 'https://github.com/your-repo/social-media-auto-comment/wiki'
        });
    }

    /**
     * Handle settings link click
     */
    handleSettingsClick(event) {
        event.preventDefault();
        // Advanced settings page will be implemented later
        this.showToast('Advanced settings coming soon!', 'info');
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(event) {
        // Escape key to close any modals or reset focus
        if (event.key === 'Escape') {
            document.activeElement.blur();
        }

        // Enter key on API key field
        if (event.key === 'Enter' && event.target === this.elements.apiKey) {
            event.target.blur();
        }
    }

    /**
     * Update a specific setting
     */
    async updateSetting(key, value) {
        try {
            this.currentSettings[key] = value;

            const response = await this.sendMessage({
                type: 'UPDATE_EXTENSION_STATUS',
                data: { [key]: value }
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to update setting');
            }

        } catch (error) {
            console.error(`Error updating setting ${key}:`, error);
            throw error;
        }
    }

    /**
     * Calculate success rate
     */
    calculateSuccessRate() {
        // Mock calculation for now
        const total = this.statistics?.postsProcessed || 0;
        const successful = this.statistics?.totalComments || 0;

        return total > 0 ? Math.round((successful / total) * 100) : 0;
    }

    /**
     * Send message to service worker
     */
    async sendMessage(message) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Message sending error:', chrome.runtime.lastError);
                    resolve({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    resolve(response || { success: false, error: 'No response received' });
                }
            });
        });
    }

    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        try {
            if (this.elements.loadingOverlay && this.elements.loadingOverlay.classList) {
                this.elements.loadingOverlay.classList.remove('hidden');
                const loadingText = this.elements.loadingOverlay.querySelector('.loading-text');
                if (loadingText) {
                    loadingText.textContent = message;
                }
            }
        } catch (error) {
            console.error('Error showing loading overlay:', error);
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        try {
            if (this.elements.loadingOverlay && this.elements.loadingOverlay.classList) {
                this.elements.loadingOverlay.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error hiding loading overlay:', error);
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const messageElement = document.createElement('div');
        messageElement.className = 'toast-message';
        messageElement.textContent = message;

        toast.appendChild(messageElement);
        this.elements.toastContainer.appendChild(toast);

        // Auto remove after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 4000);
    }

    /**
     * API Configuration Handlers
     */

    /**
     * Handle API key input changes
     */
    handleApiKeyInput() {
        const apiKey = this.elements.apiKeyInput.value.trim();
        const isValid = this.isValidApiKey(apiKey);

        // Enable/disable buttons based on API key validity
        this.elements.testApiKey.disabled = !isValid;
        this.elements.saveApiKey.disabled = !isValid;

        // Clear previous status
        this.hideApiKeyStatus();
    }

    /**
     * Handle API key testing
     */
    async handleTestApiKey() {
        const apiKey = this.elements.apiKeyInput.value.trim();

        if (!this.isValidApiKey(apiKey)) {
            this.showToast('Invalid API key format', 'error');
            return;
        }

        this.showApiKeyStatus('testing', 'Testing API connection...');
        this.elements.testApiKey.disabled = true;

        // Show spinner
        const btnText = this.elements.testApiKey.querySelector('.btn-text');
        const spinner = this.elements.testApiKey.querySelector('.btn-spinner');
        btnText.style.display = 'none';
        spinner.style.display = 'block';

        try {
            // Send test request to background script
            const response = await this.sendMessage({
                type: 'TEST_GEMINI_API',
                apiKey: apiKey
            });

            if (response.success) {
                this.showApiKeyStatus('success', 'API connection successful!');
                this.showToast('API key is valid and working', 'success');
            } else {
                this.showApiKeyStatus('error', response.error || 'API test failed');
                this.showToast('API test failed: ' + (response.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('API test error:', error);
            this.showApiKeyStatus('error', 'Connection failed');
            this.showToast('Failed to test API key', 'error');
        } finally {
            // Hide spinner and restore button
            btnText.style.display = 'block';
            spinner.style.display = 'none';
            this.elements.testApiKey.disabled = false;
        }
    }

    /**
     * Handle API key saving
     */
    async handleSaveApiKey() {
        const apiKey = this.elements.apiKeyInput.value.trim();

        if (!this.isValidApiKey(apiKey)) {
            this.showToast('Invalid API key format', 'error');
            return;
        }

        try {
            const response = await this.sendMessage({
                type: 'SAVE_GEMINI_API_KEY',
                apiKey: apiKey
            });

            if (response.success) {
                this.showToast('API key saved successfully', 'success');
                this.showApiKeyStatus('success', 'API key saved and ready');
            } else {
                this.showToast('Failed to save API key: ' + (response.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Save API key error:', error);
            this.showToast('Failed to save API key', 'error');
        }
    }

    /**
     * Handle comment style and length settings changes
     */
    async handleCommentSettingsChange() {
        const style = this.elements.commentStyleSelect.value;
        const length = this.elements.commentLengthSelect.value;

        try {
            const response = await this.sendMessage({
                type: 'UPDATE_COMMENT_SETTINGS',
                settings: {
                    commentStyle: style,
                    commentLength: length
                }
            });

            if (response.success) {
                console.log('Comment settings updated successfully');
            } else {
                this.showToast('Failed to save comment settings', 'error');
            }
        } catch (error) {
            console.error('Save comment settings error:', error);
            this.showToast('Failed to save comment settings', 'error');
        }
    }

    /**
     * Toggle API key visibility
     */
    toggleApiKeyVisibility() {
        const input = this.elements.apiKeyInput;
        if (input.type === 'password') {
            input.type = 'text';
        } else {
            input.type = 'password';
        }
    }

    /**
     * Validate API key format
     */
    isValidApiKey(apiKey) {
        return apiKey &&
            typeof apiKey === 'string' &&
            apiKey.length > 20 &&
            apiKey.startsWith('AIza');
    }

    /**
     * Show API key status
     */
    showApiKeyStatus(type, message) {
        this.elements.apiKeyStatus.style.display = 'flex';
        this.elements.apiKeyStatus.className = `api-status ${type}`;
        this.elements.apiKeyStatus.querySelector('.status-text').textContent = message;
    }

    /**
     * Hide API key status
     */
    hideApiKeyStatus() {
        this.elements.apiKeyStatus.style.display = 'none';
    }

    /**
     * Load API configuration from storage
     */
    async loadApiConfiguration() {
        try {
            const result = await chrome.storage.sync.get([
                'geminiApiKey',
                'commentStyle',
                'commentLength'
            ]);

            if (result.geminiApiKey) {
                // Show masked API key
                this.elements.apiKeyInput.value = '•'.repeat(20) + result.geminiApiKey.slice(-8);
                this.showApiKeyStatus('success', 'API key configured');
                this.elements.testApiKey.disabled = false;
                this.elements.saveApiKey.disabled = true; // Don't enable save for existing key display
            }

            if (result.commentStyle) {
                this.elements.commentStyleSelect.value = result.commentStyle;
            }

            if (result.commentLength) {
                this.elements.commentLengthSelect.value = result.commentLength;
            }

        } catch (error) {
            console.error('Failed to load API configuration:', error);
        }
    }
}

/**
 * Initialize popup when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait a bit for DOM to be fully ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify DOM is ready
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    window.addEventListener('load', resolve);
                }
            });
        }

        console.log('DOM ready, initializing popup application...');

        const app = new PopupApp();
        await app.init();

        // Make app globally available for debugging
        window.popupApp = app;

        console.log('Popup application initialized successfully');

    } catch (error) {
        console.error('Failed to initialize popup application:', error);

        // Show error to user if possible
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position: fixed; top: 10px; left: 10px; background: #ff4444; color: white; padding: 10px; border-radius: 4px; z-index: 9999;';
        errorDiv.textContent = 'Extension failed to initialize. Please refresh.';
        document.body.appendChild(errorDiv);

        // Auto-remove error after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 10000);
    }
});

/**
 * Handle popup window unload
 */
window.addEventListener('beforeunload', () => {
    console.log('Popup closing...');
});

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PopupApp };
}