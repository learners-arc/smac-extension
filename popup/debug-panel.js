/**
 * Debug Panel - Advanced debugging and testing interface
 * Provides comprehensive logging, error tracking, and testing capabilities
 * 
 * Features:
 * - Real-time log viewing with filtering
 * - Error statistics and pattern analysis
 * - Test runner interface
 * - Performance monitoring
 * - Debug mode toggle
 * - Log export functionality
 */

class DebugPanel {
    constructor() {
        this.isVisible = false;
        this.logFilters = {
            level: 'all',
            platform: 'all',
            component: 'all',
            search: ''
        };

        this.logUpdateInterval = null;
        this.maxLogDisplay = 100;

        this.initialize();
    }

    /**
     * Initialize debug panel
     */
    initialize() {
        this.createDebugPanel();
        this.setupEventListeners();
        this.loadSettings();
    }

    /**
     * Create debug panel DOM structure
     */
    createDebugPanel() {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.className = 'debug-panel hidden';

        debugPanel.innerHTML = `
            <div class="debug-header">
                <h3>🔧 Debug Panel</h3>
                <div class="debug-controls">
                    <button id="debug-toggle-mode" class="btn-small">
                        <span class="debug-mode-text">Enable Debug</span>
                    </button>
                    <button id="debug-close" class="btn-small">✕</button>
                </div>
            </div>

            <div class="debug-tabs">
                <button class="debug-tab active" data-tab="logs">📋 Logs</button>
                <button class="debug-tab" data-tab="errors">⚠️ Errors</button>
                <button class="debug-tab" data-tab="tests">🧪 Tests</button>
                <button class="debug-tab" data-tab="performance">📊 Performance</button>
            </div>

            <div class="debug-content">
                <!-- Logs Tab -->
                <div id="debug-logs" class="debug-tab-content active">
                    <div class="debug-filters">
                        <select id="log-level-filter">
                            <option value="all">All Levels</option>
                            <option value="ERROR">Error</option>
                            <option value="WARN">Warning</option>
                            <option value="INFO">Info</option>
                            <option value="DEBUG">Debug</option>
                        </select>
                        
                        <select id="log-platform-filter">
                            <option value="all">All Platforms</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="twitter">Twitter</option>
                            <option value="null">Extension Core</option>
                        </select>
                        
                        <input type="text" id="log-search" placeholder="Search logs..." />
                        
                        <button id="log-refresh" class="btn-small">🔄</button>
                        <button id="log-clear" class="btn-small">🗑️</button>
                        <button id="log-export" class="btn-small">💾</button>
                    </div>
                    
                    <div class="debug-log-container">
                        <div id="log-entries" class="log-entries"></div>
                    </div>
                </div>

                <!-- Errors Tab -->
                <div id="debug-errors" class="debug-tab-content">
                    <div class="error-summary">
                        <div class="error-stats">
                            <div class="stat-item">
                                <span class="stat-label">Total Errors:</span>
                                <span class="stat-value" id="total-errors">0</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Recovery Rate:</span>
                                <span class="stat-value" id="recovery-rate">0%</span>
                            </div>
                        </div>
                        <button id="error-refresh" class="btn-small">🔄 Refresh</button>
                        <button id="error-clear" class="btn-small">🗑️ Clear</button>
                    </div>
                    
                    <div class="error-patterns">
                        <h4>Error Patterns</h4>
                        <div id="error-pattern-list" class="pattern-list"></div>
                    </div>
                </div>

                <!-- Tests Tab -->
                <div id="debug-tests" class="debug-tab-content">
                    <div class="test-controls">
                        <select id="test-suite-select">
                            <option value="all">All Tests</option>
                            <option value="unit">Unit Tests</option>
                            <option value="integration">Integration Tests</option>
                            <option value="e2e">End-to-End Tests</option>
                            <option value="performance">Performance Tests</option>
                            <option value="error">Error Tests</option>
                        </select>
                        
                        <button id="run-tests" class="btn-primary">▶️ Run Tests</button>
                    </div>
                    
                    <div class="test-results">
                        <div id="test-progress" class="test-progress hidden">
                            <div class="progress-bar">
                                <div class="progress-fill"></div>
                            </div>
                            <span class="progress-text">Running tests...</span>
                        </div>
                        
                        <div id="test-summary" class="test-summary hidden">
                            <div class="test-stats">
                                <span class="test-stat passed">✅ <span id="tests-passed">0</span></span>
                                <span class="test-stat failed">❌ <span id="tests-failed">0</span></span>
                                <span class="test-stat total">📊 <span id="tests-total">0</span></span>
                            </div>
                        </div>
                        
                        <div id="test-details" class="test-details"></div>
                    </div>
                </div>

                <!-- Performance Tab -->
                <div id="debug-performance" class="debug-tab-content">
                    <div class="performance-overview">
                        <h4>Performance Metrics</h4>
                        <div id="performance-stats" class="performance-stats"></div>
                    </div>
                    
                    <div class="performance-charts">
                        <div class="chart-container">
                            <h5>API Response Times</h5>
                            <div id="api-response-chart" class="chart"></div>
                        </div>
                        
                        <div class="chart-container">
                            <h5>Memory Usage</h5>
                            <div id="memory-usage-chart" class="chart"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(debugPanel);
        this.panel = debugPanel;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.debug-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Close button
        document.getElementById('debug-close').addEventListener('click', () => {
            this.hide();
        });

        // Debug mode toggle
        document.getElementById('debug-toggle-mode').addEventListener('click', () => {
            this.toggleDebugMode();
        });

        // Log controls
        document.getElementById('log-refresh').addEventListener('click', () => {
            this.refreshLogs();
        });

        document.getElementById('log-clear').addEventListener('click', () => {
            this.clearLogs();
        });

        document.getElementById('log-export').addEventListener('click', () => {
            this.exportLogs();
        });

        // Log filters
        document.getElementById('log-level-filter').addEventListener('change', (e) => {
            this.logFilters.level = e.target.value;
            this.refreshLogs();
        });

        document.getElementById('log-platform-filter').addEventListener('change', (e) => {
            this.logFilters.platform = e.target.value;
            this.refreshLogs();
        });

        document.getElementById('log-search').addEventListener('input', (e) => {
            this.logFilters.search = e.target.value;
            this.refreshLogs();
        });

        // Error controls
        document.getElementById('error-refresh').addEventListener('click', () => {
            this.refreshErrorStats();
        });

        document.getElementById('error-clear').addEventListener('click', () => {
            this.clearErrorData();
        });

        // Test controls
        document.getElementById('run-tests').addEventListener('click', () => {
            this.runTests();
        });

        // Auto-refresh logs when visible
        this.setupAutoRefresh();
    }

    /**
     * Load settings
     */
    async loadSettings() {
        try {
            const response = await this.sendMessage({ type: 'GET_EXTENSION_STATUS' });
            if (response.success) {
                const debugMode = response.data.settings?.debugMode || false;
                this.updateDebugModeUI(debugMode);
            }
        } catch (error) {
            console.error('Failed to load debug settings:', error);
        }
    }

    /**
     * Show debug panel
     */
    show() {
        this.isVisible = true;
        this.panel.classList.remove('hidden');
        this.refreshLogs();
        this.refreshErrorStats();
        this.startAutoRefresh();
    }

    /**
     * Hide debug panel
     */
    hide() {
        this.isVisible = false;
        this.panel.classList.add('hidden');
        this.stopAutoRefresh();
    }

    /**
     * Toggle debug panel visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.debug-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.debug-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`debug-${tabName}`).classList.add('active');

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    /**
     * Load data for specific tab
     */
    async loadTabData(tabName) {
        switch (tabName) {
            case 'logs':
                await this.refreshLogs();
                break;
            case 'errors':
                await this.refreshErrorStats();
                break;
            case 'performance':
                await this.refreshPerformanceStats();
                break;
        }
    }

    /**
     * Toggle debug mode
     */
    async toggleDebugMode() {
        try {
            const currentMode = document.querySelector('.debug-mode-text').textContent === 'Disable Debug';
            const newMode = !currentMode;

            const response = await this.sendMessage({
                type: 'SET_DEBUG_MODE',
                enabled: newMode
            });

            if (response.success) {
                this.updateDebugModeUI(newMode);
                this.showToast(`Debug mode ${newMode ? 'enabled' : 'disabled'}`, 'success');
            } else {
                this.showToast('Failed to toggle debug mode', 'error');
            }
        } catch (error) {
            console.error('Failed to toggle debug mode:', error);
            this.showToast('Error toggling debug mode', 'error');
        }
    }

    /**
     * Update debug mode UI
     */
    updateDebugModeUI(debugMode) {
        const toggleButton = document.getElementById('debug-toggle-mode');
        const modeText = toggleButton.querySelector('.debug-mode-text');

        if (debugMode) {
            modeText.textContent = 'Disable Debug';
            toggleButton.classList.add('debug-active');
        } else {
            modeText.textContent = 'Enable Debug';
            toggleButton.classList.remove('debug-active');
        }
    }

    /**
     * Refresh logs
     */
    async refreshLogs() {
        try {
            const response = await this.sendMessage({
                type: 'GET_LOGS',
                data: {
                    limit: this.maxLogDisplay,
                    level: this.logFilters.level !== 'all' ? this.logFilters.level : null,
                    platform: this.logFilters.platform !== 'all' ? this.logFilters.platform : null,
                    search: this.logFilters.search || null
                }
            });

            if (response.success) {
                this.displayLogs(response.data);
            } else {
                this.showToast('Failed to load logs', 'error');
            }
        } catch (error) {
            console.error('Failed to refresh logs:', error);
            this.showToast('Error loading logs', 'error');
        }
    }

    /**
     * Display logs in the UI
     */
    displayLogs(logs) {
        const container = document.getElementById('log-entries');
        container.innerHTML = '';

        if (!logs || logs.length === 0) {
            container.innerHTML = '<div class="log-entry empty">No logs found</div>';
            return;
        }

        logs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry log-${log.level.toLowerCase()}`;

            const timestamp = new Date(log.timestamp).toLocaleTimeString();
            const platform = log.context.platform || 'core';
            const component = log.context.component || 'unknown';

            logEntry.innerHTML = `
                <div class="log-header">
                    <span class="log-time">${timestamp}</span>
                    <span class="log-level log-level-${log.level.toLowerCase()}">${log.level}</span>
                    <span class="log-platform">${platform}</span>
                    <span class="log-component">${component}</span>
                </div>
                <div class="log-message">${log.message}</div>
                ${Object.keys(log.context).length > 3 ? `
                    <div class="log-context">${JSON.stringify(log.context, null, 2)}</div>
                ` : ''}
            `;

            container.appendChild(logEntry);
        });

        // Scroll to bottom for latest logs
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Clear logs
     */
    async clearLogs() {
        try {
            if (!confirm('Are you sure you want to clear all logs?')) {
                return;
            }

            const response = await this.sendMessage({ type: 'CLEAR_DATA' });

            if (response.success) {
                this.refreshLogs();
                this.showToast('Logs cleared successfully', 'success');
            } else {
                this.showToast('Failed to clear logs', 'error');
            }
        } catch (error) {
            console.error('Failed to clear logs:', error);
            this.showToast('Error clearing logs', 'error');
        }
    }

    /**
     * Export logs
     */
    async exportLogs() {
        try {
            const format = 'json'; // Could be made configurable
            const response = await this.sendMessage({
                type: 'EXPORT_LOGS',
                format
            });

            if (response.success) {
                this.downloadFile(response.data, `extension-logs-${Date.now()}.${format}`);
                this.showToast('Logs exported successfully', 'success');
            } else {
                this.showToast('Failed to export logs', 'error');
            }
        } catch (error) {
            console.error('Failed to export logs:', error);
            this.showToast('Error exporting logs', 'error');
        }
    }

    /**
     * Refresh error statistics
     */
    async refreshErrorStats() {
        try {
            const response = await this.sendMessage({ type: 'GET_ERROR_STATISTICS' });

            if (response.success) {
                this.displayErrorStats(response.data);
            } else {
                this.showToast('Failed to load error statistics', 'error');
            }
        } catch (error) {
            console.error('Failed to refresh error stats:', error);
            this.showToast('Error loading error statistics', 'error');
        }
    }

    /**
     * Display error statistics
     */
    displayErrorStats(data) {
        const { statistics, patterns } = data;

        // Update summary stats
        document.getElementById('total-errors').textContent = statistics.total || 0;
        document.getElementById('recovery-rate').textContent = statistics.recoveryRate || '0%';

        // Display error patterns
        const patternList = document.getElementById('error-pattern-list');
        patternList.innerHTML = '';

        if (!patterns || patterns.length === 0) {
            patternList.innerHTML = '<div class="pattern-item empty">No error patterns found</div>';
            return;
        }

        patterns.slice(0, 10).forEach(pattern => {
            const patternItem = document.createElement('div');
            patternItem.className = 'pattern-item';

            patternItem.innerHTML = `
                <div class="pattern-header">
                    <span class="pattern-category">${pattern.category}</span>
                    <span class="pattern-count">${pattern.count}</span>
                </div>
                <div class="pattern-component">${pattern.component}</div>
                <div class="pattern-timing">
                    First: ${new Date(pattern.firstSeen).toLocaleString()}
                    ${pattern.lastSeen ? `| Last: ${new Date(pattern.lastSeen).toLocaleString()}` : ''}
                </div>
            `;

            patternList.appendChild(patternItem);
        });
    }

    /**
     * Clear error data
     */
    async clearErrorData() {
        try {
            if (!confirm('Are you sure you want to clear all error data?')) {
                return;
            }

            const response = await this.sendMessage({ type: 'CLEAR_ERROR_DATA' });

            if (response.success) {
                this.refreshErrorStats();
                this.showToast('Error data cleared successfully', 'success');
            } else {
                this.showToast('Failed to clear error data', 'error');
            }
        } catch (error) {
            console.error('Failed to clear error data:', error);
            this.showToast('Error clearing error data', 'error');
        }
    }

    /**
     * Run tests
     */
    async runTests() {
        try {
            const testSuite = document.getElementById('test-suite-select').value;

            // Show progress
            document.getElementById('test-progress').classList.remove('hidden');
            document.getElementById('test-summary').classList.add('hidden');
            document.getElementById('test-details').innerHTML = '';

            const response = await this.sendMessage({
                type: 'RUN_TESTS',
                testSuite
            });

            // Hide progress
            document.getElementById('test-progress').classList.add('hidden');

            if (response.success) {
                this.displayTestResults(response.data);
                this.showToast('Tests completed successfully', 'success');
            } else {
                this.showToast('Tests failed to run', 'error');
            }
        } catch (error) {
            console.error('Failed to run tests:', error);
            document.getElementById('test-progress').classList.add('hidden');
            this.showToast('Error running tests', 'error');
        }
    }

    /**
     * Display test results
     */
    displayTestResults(results) {
        const summary = results.summary;

        // Update summary
        document.getElementById('tests-passed').textContent = summary.passed;
        document.getElementById('tests-failed').textContent = summary.failed;
        document.getElementById('tests-total').textContent = summary.total;
        document.getElementById('test-summary').classList.remove('hidden');

        // Display detailed results
        const detailsContainer = document.getElementById('test-details');
        detailsContainer.innerHTML = '';

        if (results.results && results.results.length > 0) {
            results.results.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = `test-result test-${result.status}`;

                resultItem.innerHTML = `
                    <div class="test-header">
                        <span class="test-status">${result.status === 'passed' ? '✅' : '❌'}</span>
                        <span class="test-name">${result.name}</span>
                        <span class="test-duration">${result.duration}ms</span>
                    </div>
                    <div class="test-suite">${result.suite}</div>
                    <div class="test-message">${result.message}</div>
                `;

                detailsContainer.appendChild(resultItem);
            });
        }
    }

    /**
     * Refresh performance statistics
     */
    async refreshPerformanceStats() {
        try {
            // Get performance data from logger
            const response = await this.sendMessage({ type: 'GET_STATISTICS' });

            if (response.success) {
                this.displayPerformanceStats(response.data);
            }
        } catch (error) {
            console.error('Failed to refresh performance stats:', error);
        }
    }

    /**
     * Display performance statistics
     */
    displayPerformanceStats(data) {
        const container = document.getElementById('performance-stats');
        container.innerHTML = `
            <div class="perf-stat">
                <span class="perf-label">Session Duration:</span>
                <span class="perf-value">${this.formatDuration(data.sessionDuration || 0)}</span>
            </div>
            <div class="perf-stat">
                <span class="perf-label">Comments Posted:</span>
                <span class="perf-value">${data.commentsPosted || 0}</span>
            </div>
            <div class="perf-stat">
                <span class="perf-label">API Calls:</span>
                <span class="perf-value">${data.apiCalls || 0}</span>
            </div>
            <div class="perf-stat">
                <span class="perf-label">Success Rate:</span>
                <span class="perf-value">${data.successRate || '0%'}</span>
            </div>
        `;
    }

    /**
     * Setup auto-refresh
     */
    setupAutoRefresh() {
        // Auto-refresh logs every 5 seconds when visible
        this.logUpdateInterval = setInterval(() => {
            if (this.isVisible && document.querySelector('[data-tab="logs"]').classList.contains('active')) {
                this.refreshLogs();
            }
        }, 5000);
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        if (!this.logUpdateInterval) {
            this.setupAutoRefresh();
        }
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.logUpdateInterval) {
            clearInterval(this.logUpdateInterval);
            this.logUpdateInterval = null;
        }
    }

    /**
     * Utility: Send message to background script
     */
    async sendMessage(message) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, resolve);
        });
    }

    /**
     * Utility: Show toast notification
     */
    showToast(message, type = 'info') {
        // Assuming toast functionality exists in parent app
        if (window.popupApp && window.popupApp.showToast) {
            window.popupApp.showToast(message, type);
        } else {
            console.log(`[Debug Panel] ${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * Utility: Download file
     */
    downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Utility: Format duration
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
}

// Export for use in popup
export { DebugPanel };