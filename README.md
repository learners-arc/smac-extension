# Social Media Auto-Comment Chrome Extension

A Chrome Extension that automatically comments on LinkedIn and Twitter posts using Gemini AI, targeting content relevant to Computer Science students.

## 🚀 Features

- **Smart Platform Detection**: Automatically detects LinkedIn and Twitter posts
- **AI-Powered Comments**: Uses Gemini API to generate contextually relevant comments
- **CS Student Focus**: Filters content relevant to Computer Science students (coding, tech, hackathons, learning)
- **Intelligent Scheduling**: Comments at human-like intervals (70-90 seconds)
- **Duplicate Prevention**: Maintains logs to avoid commenting on the same post twice
- **Fallback Selectors**: Robust DOM targeting with fallback options for UI changes

## 📁 Project Structure

```
social_media/
├── manifest.json              # Chrome extension configuration
├── popup/                     # Extension popup UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content-scripts/           # Scripts injected into web pages
│   ├── linkedin.js
│   └── twitter.js
├── background/                # Service worker and background tasks
│   └── service-worker.js
├── utils/                     # Utility modules
│   ├── storage.js
│   ├── scheduler.js
│   ├── content-filter.js
│   ├── data-extractor.js
│   ├── comment-poster.js
│   ├── dom-helpers.js
│   ├── duplicate-checker.js
│   ├── logger.js
│   └── error-handler.js
├── services/                  # External API integrations
│   ├── gemini-api.js
│   └── api-handler.js
├── prompts/                   # AI prompt templates
│   └── comment-templates.js
├── assets/                    # Static assets
│   └── icons/
└── docs/                      # Documentation
```

## 🛠️ Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project directory
5. Configure your Gemini API key in the extension popup

## ⚙️ Configuration

- **Gemini API Key**: Required for comment generation
- **Commenting Interval**: 70-90 seconds (randomized)
- **Platform Selection**: Choose between LinkedIn, Twitter, or both
- **Content Filtering**: Automatically targets CS-relevant content

## 🎯 Target Selectors

### LinkedIn
- **Posts**: `.ember-view`
- **Comment Box**: `.comments-comment-box-comment__text-editor`

### Twitter/X
- **Posts**: `.css-175oi2r`
- **Comment Box**: `.public-DraftEditorPlaceholder-inner`

## 📊 Development Status

This project is developed in phases:
1. ✅ Project Setup & Structure
2. ⏳ Chrome Extension Manifest & Configuration
3. ⏳ Popup UI & User Interface
4. ⏳ Background Service Worker & Core Logic
5. ⏳ LinkedIn Content Scraping & Data Extraction
6. ⏳ Twitter/X Content Scraping & Data Extraction
7. ⏳ Gemini API Integration & Comment Generation
8. ⏳ Automated Commenting & Post Submission
9. ⏳ Logging, Error Handling & Testing
10. ⏳ Final Polish, Optimization & Documentation

## 🔧 Technologies Used

- **JavaScript ES6+**: Modern JavaScript with async/await
- **Chrome Extension Manifest V3**: Latest extension platform
- **Gemini AI API**: Google's AI for natural comment generation
- **Web APIs**: Chrome Storage, Scripting, and Tabs APIs

## 🤝 Contributing

This is a development project following a structured 10-part development cycle. Each part is completed and confirmed before moving to the next.

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

This extension is for educational purposes. Please use responsibly and in accordance with LinkedIn and Twitter's terms of service. Ensure you have proper permissions for automated interactions on these platforms.