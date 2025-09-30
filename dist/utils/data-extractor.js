/**
 * Data Extractor Utility for Social Media Auto-Comment Extension
 * 
 * Extracts and standardizes post data from different social media platforms
 * into a consistent JSON format for processing and analysis.
 */

/**
 * Data Extractor Class
 * Handles extraction and standardization of post data across platforms
 */
class DataExtractor {
    constructor() {
        this.platforms = {
            LINKEDIN: 'linkedin',
            TWITTER: 'twitter'
        };

        // LinkedIn-specific selectors and patterns
        this.linkedinSelectors = {
            post: '.feed-shared-update-v2, .ember-view[data-urn]',
            author: {
                name: '.feed-shared-actor__name, .update-components-actor__name',
                image: '.feed-shared-actor__avatar img, .EntityPhoto-circle-3',
                headline: '.feed-shared-actor__description, .update-components-actor__description',
                profile: '.feed-shared-actor__name a, .update-components-actor__name a'
            },
            content: {
                text: '.feed-shared-text, .update-components-text',
                images: '.feed-shared-image img, .update-components-image img',
                videos: '.feed-shared-video video, .update-components-video video',
                links: '.feed-shared-external-article, .update-components-article'
            },
            engagement: {
                likes: '.social-counts-reactions__count, .reactions-summary__count',
                comments: '.social-counts-comments__count, .comments-summary__count',
                shares: '.social-counts-shares__count, .shares-summary__count'
            },
            metadata: {
                timestamp: '.feed-shared-actor__sub-description time, .update-components-actor__sub-description time',
                postId: '[data-urn]',
                hashtags: '.feed-shared-hashtag, .update-components-hashtag'
            },
            interactions: {
                commentBox: '.comments-comment-box-comment__text-editor',
                likeButton: '.reactions-summary__reaction, .feed-shared-social-action-bar__reaction-button',
                shareButton: '.feed-shared-social-action-bar__share-button'
            }
        };
    }

    /**
     * Extract post data from LinkedIn DOM element
     * @param {Element} postElement - DOM element containing the post
     * @returns {Object} Standardized post data object
     */
    extractLinkedInPost(postElement) {
        try {
            if (!postElement) {
                throw new Error('No post element provided');
            }

            const postData = {
                platform: this.platforms.LINKEDIN,
                id: this.extractPostId(postElement, 'linkedin'),
                author: this.extractLinkedInAuthor(postElement),
                content: this.extractLinkedInContent(postElement),
                engagement: this.extractLinkedInEngagement(postElement),
                metadata: this.extractLinkedInMetadata(postElement),
                extractedAt: new Date().toISOString(),
                url: window.location.href
            };

            // Validate extracted data
            this.validatePostData(postData);

            return postData;

        } catch (error) {
            console.error('Error extracting LinkedIn post data:', error);
            return null;
        }
    }

    /**
     * Extract author information from LinkedIn post
     * @param {Element} postElement - Post DOM element
     * @returns {Object} Author data object
     */
    extractLinkedInAuthor(postElement) {
        const author = {
            name: '',
            headline: '',
            profileImage: '',
            profileUrl: '',
            id: ''
        };

        try {
            // Extract author name
            const nameElement = postElement.querySelector(this.linkedinSelectors.author.name);
            if (nameElement) {
                author.name = nameElement.textContent.trim();
            }

            // Extract author headline/title
            const headlineElement = postElement.querySelector(this.linkedinSelectors.author.headline);
            if (headlineElement) {
                author.headline = headlineElement.textContent.trim();
            }

            // Extract profile image
            const imageElement = postElement.querySelector(this.linkedinSelectors.author.image);
            if (imageElement) {
                author.profileImage = imageElement.src || imageElement.getAttribute('src');
            }

            // Extract profile URL
            const profileElement = postElement.querySelector(this.linkedinSelectors.author.profile);
            if (profileElement) {
                author.profileUrl = profileElement.href;
                // Extract author ID from profile URL if possible
                const profileMatch = author.profileUrl.match(/\/in\/([^\/]+)/);
                if (profileMatch) {
                    author.id = profileMatch[1];
                }
            }

        } catch (error) {
            console.error('Error extracting LinkedIn author data:', error);
        }

        return author;
    }

    /**
     * Extract content from LinkedIn post
     * @param {Element} postElement - Post DOM element
     * @returns {Object} Content data object
     */
    extractLinkedInContent(postElement) {
        const content = {
            text: '',
            images: [],
            videos: [],
            links: [],
            hashtags: [],
            mentions: []
        };

        try {
            // Extract text content
            const textElement = postElement.querySelector(this.linkedinSelectors.content.text);
            if (textElement) {
                content.text = this.cleanTextContent(textElement.textContent);

                // Extract hashtags from text
                content.hashtags = this.extractHashtags(content.text);

                // Extract mentions from text
                content.mentions = this.extractMentions(content.text);
            }

            // Extract images
            const imageElements = postElement.querySelectorAll(this.linkedinSelectors.content.images);
            imageElements.forEach(img => {
                if (img.src) {
                    content.images.push({
                        url: img.src,
                        alt: img.alt || '',
                        width: img.naturalWidth || 0,
                        height: img.naturalHeight || 0
                    });
                }
            });

            // Extract videos
            const videoElements = postElement.querySelectorAll(this.linkedinSelectors.content.videos);
            videoElements.forEach(video => {
                content.videos.push({
                    url: video.src || video.currentSrc,
                    poster: video.poster || '',
                    duration: video.duration || 0
                });
            });

            // Extract shared links/articles
            const linkElements = postElement.querySelectorAll(this.linkedinSelectors.content.links);
            linkElements.forEach(link => {
                const linkData = this.extractSharedLink(link);
                if (linkData) {
                    content.links.push(linkData);
                }
            });

        } catch (error) {
            console.error('Error extracting LinkedIn content:', error);
        }

        return content;
    }

    /**
     * Extract engagement metrics from LinkedIn post
     * @param {Element} postElement - Post DOM element
     * @returns {Object} Engagement data object
     */
    extractLinkedInEngagement(postElement) {
        const engagement = {
            likes: 0,
            comments: 0,
            shares: 0,
            reactions: {
                total: 0,
                breakdown: {}
            }
        };

        try {
            // Extract likes/reactions count
            const likesElement = postElement.querySelector(this.linkedinSelectors.engagement.likes);
            if (likesElement) {
                engagement.likes = this.parseEngagementCount(likesElement.textContent);
                engagement.reactions.total = engagement.likes;
            }

            // Extract comments count
            const commentsElement = postElement.querySelector(this.linkedinSelectors.engagement.comments);
            if (commentsElement) {
                engagement.comments = this.parseEngagementCount(commentsElement.textContent);
            }

            // Extract shares count
            const sharesElement = postElement.querySelector(this.linkedinSelectors.engagement.shares);
            if (sharesElement) {
                engagement.shares = this.parseEngagementCount(sharesElement.textContent);
            }

        } catch (error) {
            console.error('Error extracting LinkedIn engagement data:', error);
        }

        return engagement;
    }

    /**
     * Extract metadata from LinkedIn post
     * @param {Element} postElement - Post DOM element
     * @returns {Object} Metadata object
     */
    extractLinkedInMetadata(postElement) {
        const metadata = {
            timestamp: null,
            relativeTime: '',
            postType: 'text',
            isSponsored: false,
            language: 'en'
        };

        try {
            // Extract timestamp
            const timeElement = postElement.querySelector(this.linkedinSelectors.metadata.timestamp);
            if (timeElement) {
                const datetime = timeElement.getAttribute('datetime');
                if (datetime) {
                    metadata.timestamp = new Date(datetime).toISOString();
                }
                metadata.relativeTime = timeElement.textContent.trim();
            }

            // Determine post type based on content
            if (postElement.querySelector(this.linkedinSelectors.content.images)) {
                metadata.postType = 'image';
            } else if (postElement.querySelector(this.linkedinSelectors.content.videos)) {
                metadata.postType = 'video';
            } else if (postElement.querySelector(this.linkedinSelectors.content.links)) {
                metadata.postType = 'link';
            }

            // Check if post is sponsored/promoted
            metadata.isSponsored = !!postElement.querySelector('.feed-shared-actor__sponsored-text');

            // Try to detect language (basic detection)
            const textContent = postElement.querySelector(this.linkedinSelectors.content.text);
            if (textContent) {
                metadata.language = this.detectLanguage(textContent.textContent);
            }

        } catch (error) {
            console.error('Error extracting LinkedIn metadata:', error);
        }

        return metadata;
    }

    /**
     * Extract post ID from DOM element
     * @param {Element} postElement - Post DOM element
     * @param {string} platform - Platform name
     * @returns {string} Post ID
     */
    extractPostId(postElement, platform) {
        try {
            if (platform === 'linkedin') {
                // Try to extract from data-urn attribute
                const urn = postElement.getAttribute('data-urn') ||
                    postElement.querySelector('[data-urn]')?.getAttribute('data-urn');

                if (urn) {
                    // Extract ID from URN format
                    const urnMatch = urn.match(/activity:(\d+)/);
                    if (urnMatch) {
                        return urnMatch[1];
                    }
                }

                // Fallback: generate ID from element attributes
                const elementId = postElement.id || postElement.className;
                return this.generateFallbackId(elementId, platform);
            }

        } catch (error) {
            console.error('Error extracting post ID:', error);
        }

        // Generate random ID as last resort
        return `${platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Extract shared link information
     * @param {Element} linkElement - Link DOM element
     * @returns {Object} Link data object
     */
    extractSharedLink(linkElement) {
        try {
            const link = {
                url: '',
                title: '',
                description: '',
                image: '',
                domain: ''
            };

            // Extract link URL
            const urlElement = linkElement.querySelector('a[href]');
            if (urlElement) {
                link.url = urlElement.href;
                link.domain = new URL(link.url).hostname;
            }

            // Extract title
            const titleElement = linkElement.querySelector('.update-components-article__title, .feed-shared-article__title');
            if (titleElement) {
                link.title = titleElement.textContent.trim();
            }

            // Extract description
            const descElement = linkElement.querySelector('.update-components-article__description, .feed-shared-article__description');
            if (descElement) {
                link.description = descElement.textContent.trim();
            }

            // Extract image
            const imageElement = linkElement.querySelector('img');
            if (imageElement) {
                link.image = imageElement.src;
            }

            return link;

        } catch (error) {
            console.error('Error extracting shared link:', error);
            return null;
        }
    }

    /**
     * Clean and normalize text content
     * @param {string} text - Raw text content
     * @returns {string} Cleaned text
     */
    cleanTextContent(text) {
        if (!text) return '';

        return text
            .replace(/\s+/g, ' ')  // Normalize whitespace
            .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
            .trim();
    }

    /**
     * Extract hashtags from text content
     * @param {string} text - Text content
     * @returns {Array} Array of hashtags
     */
    extractHashtags(text) {
        if (!text) return [];

        const hashtagRegex = /#[\w\u0590-\u05ff]+/gi;
        const matches = text.match(hashtagRegex);
        return matches ? matches.map(tag => tag.toLowerCase()) : [];
    }

    /**
     * Extract mentions from text content
     * @param {string} text - Text content
     * @returns {Array} Array of mentions
     */
    extractMentions(text) {
        if (!text) return [];

        const mentionRegex = /@[\w\u0590-\u05ff]+/gi;
        const matches = text.match(mentionRegex);
        return matches ? matches.map(mention => mention.toLowerCase()) : [];
    }

    /**
     * Parse engagement count from text
     * @param {string} countText - Text containing count
     * @returns {number} Parsed count number
     */
    parseEngagementCount(countText) {
        if (!countText) return 0;

        const cleanText = countText.replace(/[^\d.,kKmM]/g, '');

        // Handle abbreviations (1K, 1.2M, etc.)
        if (cleanText.includes('K') || cleanText.includes('k')) {
            return Math.floor(parseFloat(cleanText) * 1000);
        }
        if (cleanText.includes('M') || cleanText.includes('m')) {
            return Math.floor(parseFloat(cleanText) * 1000000);
        }

        return parseInt(cleanText) || 0;
    }

    /**
     * Basic language detection
     * @param {string} text - Text to analyze
     * @returns {string} Language code
     */
    detectLanguage(text) {
        if (!text) return 'en';

        // Very basic detection - could be enhanced with a proper library
        const englishWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get'];
        const words = text.toLowerCase().split(/\s+/).slice(0, 50); // Check first 50 words

        const englishWordCount = words.filter(word => englishWords.includes(word)).length;
        const englishRatio = englishWordCount / Math.min(words.length, 50);

        return englishRatio > 0.1 ? 'en' : 'unknown';
    }

    /**
     * Generate fallback ID when standard extraction fails
     * @param {string} elementData - Element identifier data
     * @param {string} platform - Platform name
     * @returns {string} Generated ID
     */
    generateFallbackId(elementData, platform) {
        const hash = this.simpleHash(elementData + Date.now().toString());
        return `${platform}_fallback_${hash}`;
    }

    /**
     * Simple hash function for ID generation
     * @param {string} str - String to hash
     * @returns {string} Hash string
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Validate extracted post data
     * @param {Object} postData - Post data to validate
     * @throws {Error} If validation fails
     */
    validatePostData(postData) {
        if (!postData) {
            throw new Error('Post data is null or undefined');
        }

        if (!postData.platform) {
            throw new Error('Platform is required');
        }

        if (!postData.id) {
            throw new Error('Post ID is required');
        }

        if (!postData.author || !postData.author.name) {
            throw new Error('Author name is required');
        }

        if (!postData.content) {
            throw new Error('Content object is required');
        }

        // Log validation success
        console.log(`Post data validated successfully: ${postData.platform}:${postData.id}`);
    }

    /**
     * Create a summary of extracted post data
     * @param {Object} postData - Post data object
     * @returns {string} Human-readable summary
     */
    createPostSummary(postData) {
        if (!postData) return 'No post data available';

        const { author, content, engagement } = postData;

        let summary = `${postData.platform.toUpperCase()} Post by ${author.name}`;

        if (author.headline) {
            summary += ` (${author.headline})`;
        }

        summary += `\nContent: ${content.text ? content.text.substring(0, 100) + '...' : 'No text content'}`;

        if (content.images.length > 0) {
            summary += `\nImages: ${content.images.length}`;
        }

        if (content.videos.length > 0) {
            summary += `\nVideos: ${content.videos.length}`;
        }

        summary += `\nEngagement: ${engagement.likes} likes, ${engagement.comments} comments, ${engagement.shares} shares`;

        return summary;
    }
}

// Export as singleton
const dataExtractor = new DataExtractor();
export { dataExtractor };