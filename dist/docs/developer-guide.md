# Social Media Auto-Comment Chrome Extension - Developer Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Development Environment](#development-environment)
3. [Code Structure](#code-structure)
4. [API Reference](#api-reference)
5. [Extension Components](#extension-components)
6. [Development Workflow](#development-workflow)
7. [Testing Framework](#testing-framework)
8. [Performance Optimization](#performance-optimization)
9. [Debugging Guide](#debugging-guide)
10. [Deployment](#deployment)
11. [Contributing](#contributing)

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension                         │
├─────────────────────────────────────────────────────────────┤
│  Popup UI              │  Service Worker                    │
│  ├─ Main Interface     │  ├─ Extension Lifecycle           │
│  ├─ Settings Panel     │  ├─ Message Routing               │
│  ├─ Debug Panel        │  ├─ Storage Management            │
│  └─ Statistics View    │  └─ Scheduling System             │
├─────────────────────────────────────────────────────────────┤
│  Content Scripts                                            │
│  ├─ LinkedIn Handler   │  ├─ Data Extraction               │
│  ├─ Twitter Handler    │  ├─ Comment Posting               │
│  └─ Platform Detection │  └─ Event Monitoring              │
├─────────────────────────────────────────────────────────────┤
│  Utilities & Services                                       │
│  ├─ Logger System      │  ├─ Error Handler                 │
│  ├─ API Handler        │  ├─ Performance Optimizer         │
│  ├─ Storage Manager    │  └─ Duplicate Checker             │
├─────────────────────────────────────────────────────────────┤
│  External Services                                          │
│  ├─ Google Gemini API  │  ├─ Chrome Storage API            │
│  └─ Platform APIs      │  └─ Chrome Extension APIs         │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

**1. Modular Architecture**
- Separation of concerns
- Component isolation
- Reusable utilities
- Clean interfaces

**2. Chrome Extension Best Practices**
- Manifest V3 compliance
- Service Worker lifecycle management
- Secure content script injection
- Proper permission scoping

**3. Performance Optimization**
- Memory leak prevention
- Efficient DOM operations
- Intelligent caching
- Resource cleanup

**4. Error Resilience**
- Comprehensive error handling
- Automatic recovery mechanisms
- Graceful degradation
- User feedback systems

---

## Development Environment

### Prerequisites

**Required Software:**
```bash
# Node.js (for package management and tooling)
Node.js >= 16.0.0

# Chrome Browser (for testing)
Google Chrome >= 88

# Git (for version control)
Git >= 2.30

# Code Editor (recommended)
Visual Studio Code with extensions:
- Chrome Extension Developer Tools
- JavaScript (ES6) code snippets
- ESLint
- Prettier
```

**API Requirements:**
```bash
# Google Gemini API
- Google Cloud account
- Gemini API key
- API quota configuration
```

### Project Setup

**1. Clone Repository:**
```bash
git clone <repository-url>
cd social-media-auto-comment
```

**2. Install Dependencies:**
```bash
# Install development dependencies
npm install

# Install Chrome extension tools
npm install -g web-ext
```

**3. Environment Configuration:**
```bash
# Create environment file
cp .env.example .env

# Add your API keys
GEMINI_API_KEY=your_api_key_here
DEVELOPMENT_MODE=true
```

**4. Load Extension in Chrome:**
```bash
# Open Chrome
chrome://extensions/

# Enable Developer Mode
# Click "Load unpacked"
# Select project directory
```

### Development Tools

**Chrome DevTools Integration:**
```javascript
// Enable debug mode
chrome.storage.local.set({ debugMode: true });

// Access service worker console
chrome://extensions/ → Service Worker → "Inspect"

// Content script debugging
F12 → Sources → Content Scripts
```

**Extension Debugging:**
```javascript
// Background script debugging
chrome://extensions/ → Background Page → "Inspect"

// Popup debugging
Right-click extension icon → "Inspect popup"

// Content script debugging
F12 on target page → Console
```

---

## Code Structure

### Directory Organization

```
social_media/
├── manifest.json              # Extension manifest
├── config.js                  # Global configuration
├── package.json               # NPM configuration
├── README.md                  # Project documentation
├── CHANGELOG.md               # Version history
├── LICENSE                    # License information
├── todo.md                    # Development roadmap
│
├── popup/                     # Extension popup
│   ├── popup.html             # Popup interface
│   ├── popup.css              # Popup styling
│   ├── popup.js               # Popup functionality
│   └── debug-panel.js         # Debug interface
│
├── background/                # Service worker
│   └── service-worker.js      # Background processes
│
├── content-scripts/           # Content scripts
│   ├── linkedin.js            # LinkedIn integration
│   ├── twitter.js             # Twitter integration
│   └── common.js              # Shared functionality
│
├── utils/                     # Utility modules
│   ├── logger.js              # Logging system
│   ├── error-handler.js       # Error handling
│   ├── storage.js             # Storage management
│   ├── scheduler.js           # Task scheduling
│   ├── api-handler.js         # API utilities
│   ├── dom-helpers.js         # DOM manipulation
│   ├── duplicate-checker.js   # Duplicate prevention
│   ├── content-filter.js      # Content filtering
│   ├── data-extractor.js      # Data extraction
│   ├── comment-poster.js      # Comment posting
│   ├── twitter-selectors.js   # Twitter selectors
│   └── performance-optimizer.js # Performance tools
│
├── services/                  # External services
│   └── gemini-api.js          # Gemini API integration
│
├── prompts/                   # AI prompts
│   └── comment-templates.js   # Comment templates
│
├── test/                      # Testing framework
│   └── test-scenarios.js      # Test suites
│
├── docs/                      # Documentation
│   ├── user-guide.md          # User documentation
│   ├── developer-guide.md     # Developer documentation
│   └── api-reference.md       # API documentation
│
└── assets/                    # Static assets
    └── icons/                 # Extension icons
        ├── icon-16.png
        ├── icon-32.png
        ├── icon-48.png
        ├── icon-128.png
        └── icon-generator.js
```

### Module System

**ES6 Module Structure:**
```javascript
// Export pattern
export class UtilityClass {
    // Class implementation
}

export const utilityFunction = () => {
    // Function implementation
};

export default UtilityClass;

// Import pattern
import { UtilityClass, utilityFunction } from './utils/utility.js';
import DefaultClass from './utils/default-export.js';
```

**Chrome Extension Module Loading:**
```javascript
// manifest.json
{
  "content_scripts": [{
    "matches": ["https://linkedin.com/*"],
    "js": ["content-scripts/linkedin.js"],
    "type": "module"
  }]
}

// Dynamic imports in content scripts
const { logger } = await import(chrome.runtime.getURL('utils/logger.js'));
```

### Configuration Management

**Global Configuration (`config.js`):**
```javascript
export const CONFIG = {
    // API Configuration
    API: {
        GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com',
        GEMINI_MODEL: 'gemini-1.5-flash',
        DEFAULT_TEMPERATURE: 0.7,
        MAX_TOKENS: 150,
        RATE_LIMIT: {
            REQUESTS_PER_MINUTE: 60,
            REQUESTS_PER_DAY: 1500
        }
    },
    
    // Platform Configuration
    PLATFORMS: {
        LINKEDIN: {
            ENABLED: true,
            SELECTORS: {
                POST: '.feed-shared-update-v2',
                COMMENT_BOX: '.comments-comment-box-comment__text-editor'
            }
        },
        TWITTER: {
            ENABLED: true,
            SELECTORS: {
                POST: '[data-testid="tweet"]',
                REPLY_BOX: '[data-testid="tweetTextarea_0"]'
            }
        }
    },
    
    // Extension Configuration
    EXTENSION: {
        NAME: 'Social Media Auto-Comment',
        VERSION: '1.0.0',
        DEBUG_MODE: false,
        LOG_LEVEL: 'INFO'
    }
};
```

---

## API Reference

### Logger API

**Basic Logging:**
```javascript
import { logger } from './utils/logger.js';

// Log levels
logger.debug('Debug message', { context: 'data' });
logger.info('Information message', { userId: 123 });
logger.warn('Warning message', { issue: 'performance' });
logger.error('Error message', { error: errorObject });
```

**Performance Tracking:**
```javascript
// Create timer
const timer = logger.createTimer('operation_name');

// Perform operation
await performOperation();

// End timer and log duration
const duration = timer.end();

// Track specific metrics
logger.trackApiCall('gemini_generate', duration, true, { 
    tokens: 150, 
    model: 'gemini-1.5-flash' 
});

logger.trackDomOperation('element_search', duration, 5, {
    selector: '.post-element',
    found: true
});
```

**Log Retrieval:**
```javascript
// Get recent logs
const logs = await logger.getLogs({
    level: 'ERROR',
    limit: 50,
    since: Date.now() - 3600000 // Last hour
});

// Get performance analytics
const analytics = logger.getPerformanceAnalytics();
console.log(analytics.apiCalls);
console.log(analytics.domOperations);
```

### Error Handler API

**Error Handling:**
```javascript
import { errorHandler } from './utils/error-handler.js';

// Handle errors with automatic classification
try {
    await riskyOperation();
} catch (error) {
    const result = await errorHandler.handleError(error, {
        component: 'ContentScript',
        operation: 'postComment',
        platform: 'linkedin'
    });
    
    if (result.recovered) {
        console.log('Operation recovered successfully');
    } else {
        console.log('Recovery failed:', result.error);
    }
}

// Manual error classification
const enhancedError = errorHandler.classifyError(error, context);
console.log(enhancedError.category); // API_ERROR, DOM_ERROR, etc.
console.log(enhancedError.severity); // low, medium, high, critical
```

**Recovery Strategies:**
```javascript
// Custom recovery strategy
errorHandler.addRecoveryStrategy('CUSTOM_ERROR', {
    name: 'customRecovery',
    maxAttempts: 3,
    delayStrategy: 'exponential',
    action: async (error, context) => {
        // Custom recovery logic
        return { success: true, recovered: true };
    }
});
```

### Storage API

**Data Storage:**
```javascript
import { storageManager } from './utils/storage.js';

// Store data
await storageManager.setData('key', { data: 'value' });

// Retrieve data
const data = await storageManager.getData('key');

// Store with expiration
await storageManager.setDataWithExpiry('temp_key', data, 3600000); // 1 hour

// Bulk operations
await storageManager.setBulkData({
    'key1': 'value1',
    'key2': 'value2'
});
```

**Settings Management:**
```javascript
// Update settings
await storageManager.updateSettings({
    commentInterval: 75,
    csFilterEnabled: true,
    smartTyping: true
});

// Get current settings
const settings = await storageManager.getSettings();
```

### API Handler

**Request Management:**
```javascript
import { apiHandler } from './utils/api-handler.js';

// Make API request with retries
const result = await apiHandler.makeRequest(
    () => fetch('/api/endpoint'),
    { param: 'value' },
    { 
        maxRetries: 3,
        retryDelay: 1000,
        useCache: true,
        cacheExpiry: 300000 // 5 minutes
    }
);

// Batch requests
const requests = [
    { apiCall: () => fetch('/api/1'), params: {} },
    { apiCall: () => fetch('/api/2'), params: {} }
];

const results = await apiHandler.handleBatchRequests(requests, {
    batchSize: 2,
    delayBetweenBatches: 1000
});
```

### Content Filter API

**Content Analysis:**
```javascript
import { contentFilter } from './utils/content-filter.js';

// Analyze post relevance
const analysis = await contentFilter.analyzePost({
    content: "Post content here",
    author: "Author Name",
    hashtags: ["#programming", "#javascript"],
    platform: "linkedin"
});

console.log(analysis.isRelevant); // boolean
console.log(analysis.relevanceScore); // 0-100
console.log(analysis.confidence); // 0-1
console.log(analysis.reasons); // Array of match reasons
```

**Custom Filters:**
```javascript
// Add custom keyword category
contentFilter.addKeywordCategory('machine_learning', {
    keywords: ['ml', 'machine learning', 'neural network'],
    weight: 1.2,
    description: 'Machine Learning topics'
});

// Update relevance thresholds
contentFilter.updateConfig({
    minimumRelevanceScore: 60,
    minimumConfidence: 0.7
});
```

---

## Extension Components

### Service Worker (`background/service-worker.js`)

**Core Responsibilities:**
- Extension lifecycle management
- Message routing between components
- Storage and state management
- Scheduled task execution
- Tab and window monitoring

**Key Functions:**
```javascript
// Extension lifecycle
chrome.runtime.onInstalled.addListener(handleInstallation);
chrome.runtime.onStartup.addListener(handleStartup);

// Message handling
chrome.runtime.onMessage.addListener(handleMessage);

// Tab management
chrome.tabs.onUpdated.addListener(handleTabUpdate);
chrome.tabs.onActivated.addListener(handleTabActivation);

// Scheduled tasks
chrome.alarms.onAlarm.addListener(handleScheduledTask);
```

**Message Router:**
```javascript
async function handleMessage(message, sender, sendResponse) {
    const { type, data } = message;
    
    switch (type) {
        case 'START_COMMENTING':
            return await startCommentingSession(data);
        case 'STOP_COMMENTING':
            return await stopCommentingSession();
        case 'GET_STATISTICS':
            return await getStatistics();
        case 'UPDATE_SETTINGS':
            return await updateSettings(data);
        default:
            return { error: 'Unknown message type' };
    }
}
```

### Content Scripts

#### LinkedIn Handler (`content-scripts/linkedin.js`)

**Main Functions:**
```javascript
class LinkedInHandler {
    constructor() {
        this.isActive = false;
        this.observer = null;
        this.processedPosts = new Set();
    }

    // Initialize LinkedIn monitoring
    async initialize() {
        await this.setupObserver();
        await this.scanExistingPosts();
        this.startPeriodicScanning();
    }

    // Scan for new posts
    async scanForPosts() {
        const posts = document.querySelectorAll(CONFIG.PLATFORMS.LINKEDIN.SELECTORS.POST);
        const newPosts = Array.from(posts).filter(post => 
            !this.processedPosts.has(this.getPostId(post))
        );
        
        for (const post of newPosts) {
            await this.processPost(post);
        }
    }

    // Process individual post
    async processPost(postElement) {
        const postData = await this.extractPostData(postElement);
        const analysis = await this.analyzeRelevance(postData);
        
        if (analysis.isRelevant) {
            await this.generateAndPostComment(postElement, postData);
        }
    }
}
```

#### Twitter Handler (`content-scripts/twitter.js`)

**Main Functions:**
```javascript
class TwitterHandler {
    constructor() {
        this.isActive = false;
        this.tweetCache = new Map();
        this.retryQueue = [];
    }

    // Handle Twitter's dynamic content
    async handleDynamicContent() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length > 0) {
                    this.scanForNewTweets(mutation.addedNodes);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Extract tweet data
    extractTweetData(tweetElement) {
        return {
            id: this.getTweetId(tweetElement),
            author: this.getAuthorInfo(tweetElement),
            content: this.getTweetText(tweetElement),
            timestamp: this.getTweetTimestamp(tweetElement),
            engagement: this.getEngagementMetrics(tweetElement),
            hashtags: this.extractHashtags(tweetElement),
            mentions: this.extractMentions(tweetElement)
        };
    }
}
```

### Popup Interface (`popup/popup.js`)

**Main Components:**
```javascript
class PopupApp {
    constructor() {
        this.elements = {};
        this.state = {
            isActive: false,
            settings: {},
            statistics: {}
        };
    }

    // Initialize popup
    async initialize() {
        this.cacheElements();
        this.bindEvents();
        await this.loadState();
        this.updateUI();
    }

    // Handle user interactions
    bindEvents() {
        this.elements.startBtn.addEventListener('click', () => this.startCommenting());
        this.elements.stopBtn.addEventListener('click', () => this.stopCommenting());
        this.elements.settingsForm.addEventListener('change', () => this.saveSettings());
    }

    // Communication with background script
    async sendMessage(message) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, resolve);
        });
    }
}
```

---

## Development Workflow

### Git Workflow

**Branch Strategy:**
```bash
# Feature development
git checkout -b feature/new-feature
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Bug fixes
git checkout -b bugfix/fix-issue
git commit -m "fix: resolve issue with component"
git push origin bugfix/fix-issue

# Hotfixes
git checkout -b hotfix/critical-fix
git commit -m "hotfix: critical security fix"
git push origin hotfix/critical-fix
```

**Commit Message Convention:**
```
<type>(<scope>): <description>

[optional body]

[optional footer]

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Code style changes
- refactor: Code refactoring
- test: Tests
- chore: Maintenance

Examples:
feat(popup): add debug panel toggle
fix(linkedin): resolve comment posting issue
docs(api): update API documentation
test(content): add Twitter handler tests
```

### Code Quality

**ESLint Configuration (`.eslintrc.js`):**
```javascript
module.exports = {
    env: {
        browser: true,
        es2021: true,
        webextensions: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module'
    },
    rules: {
        'no-unused-vars': 'error',
        'no-console': 'warn',
        'prefer-const': 'error',
        'no-var': 'error'
    },
    globals: {
        chrome: 'readonly'
    }
};
```

**Prettier Configuration (`.prettierrc`):**
```json
{
    "semi": true,
    "trailingComma": "es5",
    "singleQuote": true,
    "printWidth": 100,
    "tabWidth": 4,
    "useTabs": false
}
```

### Testing Workflow

**Test Execution:**
```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --suite=unit

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

**Manual Testing Checklist:**
```markdown
- [ ] Extension loads without errors
- [ ] Popup UI displays correctly
- [ ] API key validation works
- [ ] Platform detection functions
- [ ] Content filtering operates
- [ ] Comment generation works
- [ ] Comment posting succeeds
- [ ] Error handling activates
- [ ] Debug panel functions
- [ ] Settings persist correctly
```

---

## Testing Framework

### Test Structure

**Test Runner (`test/test-scenarios.js`):**
```javascript
class TestRunner {
    constructor() {
        this.testSuites = {
            unit: [],
            integration: [],
            e2e: [],
            performance: [],
            error: []
        };
        this.testResults = [];
    }

    // Register test suites
    registerTestSuites() {
        // Unit tests
        this.testSuites.unit = [
            this.testLoggerFunctionality,
            this.testStorageOperations,
            this.testContentFiltering
        ];

        // Integration tests
        this.testSuites.integration = [
            this.testLinkedInIntegration,
            this.testTwitterIntegration,
            this.testAPIConnectivity
        ];
    }

    // Run test suite
    async runTestSuite(suiteName) {
        const suite = this.testSuites[suiteName];
        if (!suite) throw new Error(`Unknown test suite: ${suiteName}`);

        for (const test of suite) {
            await this.runSingleTest(test, suiteName);
        }
    }
}
```

### Unit Tests

**Logger Tests:**
```javascript
async testLoggerFunctionality() {
    const testLogger = logger;

    // Test log levels
    testLogger.debug('Debug message', { test: true });
    testLogger.info('Info message', { test: true });
    testLogger.warn('Warning message', { test: true });
    testLogger.error('Error message', { test: true });

    // Test performance tracking
    const timer = testLogger.createTimer('test_operation');
    await this.delay(100);
    const duration = timer.end();

    if (duration < 90 || duration > 150) {
        throw new Error(`Timer inaccuracy: expected ~100ms, got ${duration}ms`);
    }

    return { status: 'passed', message: 'Logger functionality verified' };
}
```

**Storage Tests:**
```javascript
async testStorageOperations() {
    // Test data storage
    const testData = { test: 'value', timestamp: Date.now() };
    await storageManager.setData('test_key', testData);
    
    const retrieved = await storageManager.getData('test_key');
    if (JSON.stringify(retrieved) !== JSON.stringify(testData)) {
        throw new Error('Storage data mismatch');
    }

    // Test expiry
    await storageManager.setDataWithExpiry('temp_key', 'temp_value', 100);
    await this.delay(150);
    const expired = await storageManager.getData('temp_key');
    if (expired !== null) {
        throw new Error('Expired data not cleared');
    }

    return { status: 'passed', message: 'Storage operations verified' };
}
```

### Integration Tests

**Platform Integration:**
```javascript
async testLinkedInIntegration() {
    // Test LinkedIn post detection
    const mockPost = this.createMockLinkedInPost();
    document.body.appendChild(mockPost);

    const linkedInHandler = new LinkedInHandler();
    await linkedInHandler.initialize();

    const posts = await linkedInHandler.scanForPosts();
    if (posts.length === 0) {
        throw new Error('LinkedIn post detection failed');
    }

    // Test data extraction
    const postData = await linkedInHandler.extractPostData(mockPost);
    if (!postData.content || !postData.author) {
        throw new Error('LinkedIn data extraction failed');
    }

    // Cleanup
    document.body.removeChild(mockPost);

    return { status: 'passed', message: 'LinkedIn integration verified' };
}
```

### Performance Tests

**Response Time Testing:**
```javascript
async testAPIResponseTime() {
    const iterations = 5;
    const responseTimes = [];

    for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        // Simulate API call
        await this.delay(100 + Math.random() * 200);
        
        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);

    if (avgResponseTime > 500) {
        throw new Error(`Average response time too high: ${avgResponseTime}ms`);
    }

    if (maxResponseTime > 1000) {
        throw new Error(`Maximum response time too high: ${maxResponseTime}ms`);
    }

    return {
        status: 'passed',
        message: 'API response times within acceptable range',
        details: { avgResponseTime, maxResponseTime, iterations }
    };
}
```

---

## Performance Optimization

### Memory Management

**Performance Optimizer Integration:**
```javascript
import { performanceOptimizer } from './utils/performance-optimizer.js';

// Register observers for cleanup
const observer = new MutationObserver(callback);
performanceOptimizer.registerObserver(observer, 'content-scanner');

// Register event listeners
performanceOptimizer.registerEventListener(
    element, 
    'click', 
    handleClick, 
    { passive: true }
);

// Register timers
const timerId = setTimeout(callback, 5000);
performanceOptimizer.registerTimer(timerId, 5000, 'delayed-action');
```

**Memory Monitoring:**
```javascript
// Check memory usage
const stats = performanceOptimizer.getPerformanceStats();
console.log('Memory usage:', stats.memory);
console.log('Active observers:', stats.observers);
console.log('Event listeners:', stats.eventListeners);

// Force cleanup if needed
if (stats.memory.used > threshold) {
    await performanceOptimizer.forceCleanup();
}
```

### DOM Optimization

**Efficient Element Finding:**
```javascript
// Cache selectors
const SELECTORS = {
    LINKEDIN_POST: '.feed-shared-update-v2',
    TWITTER_TWEET: '[data-testid="tweet"]',
    COMMENT_BOX: '.comments-comment-box'
};

// Use document fragments for multiple DOM operations
const fragment = document.createDocumentFragment();
elements.forEach(element => fragment.appendChild(element));
container.appendChild(fragment);

// Debounce scroll and resize events
const debouncedHandler = debounce(handleScroll, 250);
window.addEventListener('scroll', debouncedHandler, { passive: true });
```

**Lazy Loading:**
```javascript
// Intersection Observer for lazy processing
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            processElement(entry.target);
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

// Observe elements
posts.forEach(post => observer.observe(post));
```

### API Optimization

**Request Caching:**
```javascript
// Cache API responses
const cache = new Map();

async function getCachedResponse(key, apiCall, cacheTime = 300000) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
        return cached.data;
    }

    const data = await apiCall();
    cache.set(key, { data, timestamp: Date.now() });
    return data;
}
```

**Request Batching:**
```javascript
// Batch multiple requests
class RequestBatcher {
    constructor(batchSize = 5, delay = 1000) {
        this.queue = [];
        this.batchSize = batchSize;
        this.delay = delay;
        this.processing = false;
    }

    async add(request) {
        return new Promise((resolve, reject) => {
            this.queue.push({ request, resolve, reject });
            this.processBatch();
        });
    }

    async processBatch() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        const batch = this.queue.splice(0, this.batchSize);

        try {
            const results = await Promise.all(
                batch.map(item => item.request())
            );
            
            batch.forEach((item, index) => {
                item.resolve(results[index]);
            });
        } catch (error) {
            batch.forEach(item => item.reject(error));
        }

        this.processing = false;
        
        if (this.queue.length > 0) {
            setTimeout(() => this.processBatch(), this.delay);
        }
    }
}
```

---

## Debugging Guide

### Debug Panel Usage

**Accessing Debug Information:**
```javascript
// Open debug panel
chrome.runtime.sendMessage({ type: 'OPEN_DEBUG_PANEL' });

// Get real-time logs
chrome.runtime.sendMessage({ 
    type: 'GET_LOGS',
    data: { level: 'ERROR', limit: 100 }
});

// Get performance metrics
chrome.runtime.sendMessage({ type: 'GET_PERFORMANCE_STATS' });
```

**Debug Panel Features:**
- Real-time log streaming
- Performance monitoring
- Error pattern analysis
- Test runner interface
- Export functionality

### Common Debug Scenarios

**API Issues:**
```javascript
// Debug API connectivity
async function debugAPI() {
    try {
        const result = await geminiAPI.testConnection();
        console.log('API Status:', result);
    } catch (error) {
        console.error('API Error:', error);
        
        // Check error type
        if (error.message.includes('quota')) {
            console.log('Quota exceeded - check API usage');
        } else if (error.message.includes('key')) {
            console.log('Invalid API key - check configuration');
        }
    }
}
```

**Platform Detection:**
```javascript
// Debug platform detection
function debugPlatform() {
    const url = window.location.href;
    const platform = url.includes('linkedin.com') ? 'linkedin' : 
                    url.includes('twitter.com') || url.includes('x.com') ? 'twitter' : 
                    'unknown';
    
    console.log('Platform detected:', platform);
    console.log('URL:', url);
    console.log('Available selectors:', CONFIG.PLATFORMS[platform.toUpperCase()]);
}
```

**Content Script Communication:**
```javascript
// Test message passing
async function testMessaging() {
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'TEST_MESSAGE',
            data: { test: true }
        });
        console.log('Message response:', response);
    } catch (error) {
        console.error('Messaging error:', error);
    }
}
```

### Error Tracking

**Error Pattern Detection:**
```javascript
// Track error patterns
function trackErrorPattern(error, context) {
    const pattern = {
        message: error.message,
        stack: error.stack,
        context: context,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
    };
    
    logger.error('Error pattern detected', pattern);
    
    // Send to analytics if configured
    if (CONFIG.ANALYTICS_ENABLED) {
        sendErrorAnalytics(pattern);
    }
}
```

---

## Deployment

### Build Process

**Production Build:**
```bash
# Clean previous build
rm -rf dist/

# Create production build
npm run build

# Validate extension
web-ext lint --source-dir=dist/

# Package extension
web-ext build --source-dir=dist/
```

**Build Configuration:**
```json
{
  "scripts": {
    "build": "node scripts/build.js",
    "test": "node scripts/test.js",
    "lint": "eslint . --ext .js",
    "package": "web-ext build --source-dir=dist/"
  }
}
```

### Chrome Web Store Deployment

**Store Listing Requirements:**
- Extension manifest and files
- Store listing information
- Screenshots and promotional images
- Privacy policy and terms of service
- Developer account verification

**Submission Process:**
1. Create developer account
2. Upload extension package
3. Fill out store listing
4. Submit for review
5. Monitor review status
6. Address any feedback
7. Publish approved extension

### Version Management

**Version Numbering:**
```
MAJOR.MINOR.PATCH

Examples:
1.0.0 - Initial release
1.0.1 - Bug fix
1.1.0 - New features
2.0.0 - Breaking changes
```

**Release Process:**
```bash
# Update version
npm version patch  # or minor/major

# Tag release
git tag -a v1.0.1 -m "Version 1.0.1"

# Push changes
git push origin main --tags

# Build and package
npm run build
npm run package
```

---

## Contributing

### Development Guidelines

**Code Standards:**
- Follow existing code style
- Write comprehensive tests
- Document new features
- Update relevant documentation
- Follow git commit conventions

**Pull Request Process:**
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Update documentation
5. Submit pull request
6. Address review feedback
7. Merge when approved

**Testing Requirements:**
- Unit tests for new functions
- Integration tests for components
- End-to-end tests for workflows
- Performance tests for optimizations

### Issue Reporting

**Bug Report Template:**
```markdown
## Bug Description
Brief description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Extension version: 
- Chrome version: 
- Operating system: 
- Platform (LinkedIn/Twitter): 

## Additional Context
Any other relevant information
```

**Feature Request Template:**
```markdown
## Feature Description
Clear description of the requested feature

## Use Case
Why this feature would be useful

## Proposed Implementation
Suggestions for how it could be implemented

## Alternatives Considered
Other approaches that were considered
```

---

*This developer guide is continuously updated with new features and improvements.*