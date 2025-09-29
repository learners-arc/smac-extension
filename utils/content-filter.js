/**
 * Content Filter Utility for Social Media Auto-Comment Extension
 * 
 * Filters posts for Computer Science student-relevant content using
 * keyword matching, context analysis, and relevance scoring.
 */

/**
 * Content Filter Class
 * Analyzes post content to determine relevance for CS students
 */
class ContentFilter {
    constructor() {
        // CS-related keywords with different weight categories
        this.keywordCategories = {
            // High relevance - core CS topics (weight: 3)
            highRelevance: [
                'programming', 'coding', 'software', 'development', 'developer',
                'javascript', 'python', 'java', 'react', 'nodejs', 'typescript',
                'algorithm', 'data structure', 'backend', 'frontend', 'fullstack',
                'api', 'database', 'sql', 'mongodb', 'postgresql', 'mysql',
                'git', 'github', 'version control', 'devops', 'deployment',
                'machine learning', 'ai', 'artificial intelligence', 'ml',
                'web development', 'mobile app', 'android', 'ios', 'flutter',
                'computer science', 'cs', 'software engineering', 'swe',
                'internship', 'junior developer', 'entry level', 'bootcamp',
                'leetcode', 'hackerrank', 'coding interview', 'technical interview'
            ],

            // Medium relevance - related tech topics (weight: 2)
            mediumRelevance: [
                'tech', 'technology', 'startup', 'innovation', 'digital',
                'cloud', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
                'agile', 'scrum', 'project management', 'team lead',
                'open source', 'framework', 'library', 'toolkit',
                'debugging', 'testing', 'qa', 'quality assurance',
                'ui', 'ux', 'design', 'user experience', 'user interface',
                'career', 'job search', 'hiring', 'recruitment', 'resume',
                'portfolio', 'side project', 'hackathon', 'coding challenge',
                'freelance', 'remote work', 'work from home'
            ],

            // Low relevance - loosely related terms (weight: 1)
            lowRelevance: [
                'innovation', 'digital transformation', 'automation',
                'productivity', 'efficiency', 'problem solving',
                'learning', 'education', 'tutorial', 'course',
                'certification', 'skill', 'growth', 'improvement',
                'networking', 'professional', 'industry', 'business',
                'collaboration', 'teamwork', 'leadership', 'management'
            ]
        };

        // Negative keywords that reduce relevance
        this.negativeKeywords = [
            'politics', 'political', 'election', 'vote', 'government',
            'religion', 'religious', 'sports', 'entertainment', 'celebrity',
            'fashion', 'food', 'travel', 'personal', 'family', 'relationship',
            'health', 'medical', 'finance', 'investment', 'crypto', 'bitcoin',
            'real estate', 'sales', 'marketing', 'advertisement'
        ];

        // Company patterns that indicate tech relevance
        this.techCompanyPatterns = [
            /google|microsoft|amazon|apple|facebook|meta|netflix|tesla/i,
            /startup|tech company|software company|saas/i,
            /unicorn|ipo|funding|venture capital|vc/i
        ];

        // Educational institution patterns
        this.educationPatterns = [
            /university|college|school|academy|institute/i,
            /student|graduate|undergraduate|phd|masters|bachelor/i,
            /coursera|udemy|edx|khan academy|codecademy/i
        ];

        // Minimum relevance score threshold
        this.relevanceThreshold = 3;
        this.maxRelevanceScore = 20;
    }

    /**
     * Analyze post content for CS relevance
     * @param {Object} postData - Post data object
     * @returns {Object} Analysis result with score and reasoning
     */
    analyzeContent(postData) {
        try {
            const analysis = {
                isRelevant: false,
                relevanceScore: 0,
                reasoning: [],
                confidence: 0,
                categories: {
                    technical: false,
                    educational: false,
                    career: false,
                    company: false
                }
            };

            // Combine all text content for analysis
            const fullText = this.extractTextContent(postData);

            if (!fullText || fullText.length < 10) {
                analysis.reasoning.push('Content too short or empty');
                return analysis;
            }

            // Calculate relevance score
            analysis.relevanceScore = this.calculateRelevanceScore(fullText, analysis);

            // Determine if content is relevant
            analysis.isRelevant = analysis.relevanceScore >= this.relevanceThreshold;

            // Calculate confidence based on score and content length
            analysis.confidence = this.calculateConfidence(analysis.relevanceScore, fullText.length);

            // Add final reasoning
            if (analysis.isRelevant) {
                analysis.reasoning.push(`Relevant content detected (score: ${analysis.relevanceScore}/${this.maxRelevanceScore})`);
            } else {
                analysis.reasoning.push(`Content not relevant (score: ${analysis.relevanceScore}/${this.maxRelevanceScore}, threshold: ${this.relevanceThreshold})`);
            }

            return analysis;

        } catch (error) {
            console.error('Error analyzing content:', error);
            return {
                isRelevant: false,
                relevanceScore: 0,
                reasoning: ['Error during content analysis'],
                confidence: 0,
                categories: {}
            };
        }
    }

    /**
     * Extract and combine all text content from post data
     * @param {Object} postData - Post data object
     * @returns {string} Combined text content
     */
    extractTextContent(postData) {
        const textParts = [];

        // Add post content
        if (postData.content) {
            textParts.push(postData.content);
        }

        // Add author information
        if (postData.author && postData.author.name) {
            textParts.push(postData.author.name);
        }

        if (postData.author && postData.author.headline) {
            textParts.push(postData.author.headline);
        }

        // Add hashtags
        if (postData.hashtags && postData.hashtags.length > 0) {
            textParts.push(postData.hashtags.join(' '));
        }

        // Combine and clean text
        return textParts.join(' ').toLowerCase().trim();
    }

    /**
     * Calculate relevance score based on keyword matching and patterns
     * @param {string} text - Text to analyze
     * @param {Object} analysis - Analysis object to update
     * @returns {number} Relevance score
     */
    calculateRelevanceScore(text, analysis) {
        let score = 0;
        const words = text.split(/\s+/);

        // Check high relevance keywords
        this.keywordCategories.highRelevance.forEach(keyword => {
            if (text.includes(keyword)) {
                score += 3;
                analysis.reasoning.push(`High relevance keyword: "${keyword}"`);
                analysis.categories.technical = true;
            }
        });

        // Check medium relevance keywords
        this.keywordCategories.mediumRelevance.forEach(keyword => {
            if (text.includes(keyword)) {
                score += 2;
                analysis.reasoning.push(`Medium relevance keyword: "${keyword}"`);

                // Categorize keywords
                if (['career', 'job', 'hiring', 'internship', 'resume', 'portfolio'].some(k => keyword.includes(k))) {
                    analysis.categories.career = true;
                }
            }
        });

        // Check low relevance keywords
        this.keywordCategories.lowRelevance.forEach(keyword => {
            if (text.includes(keyword)) {
                score += 1;
                if (['learning', 'education', 'course', 'tutorial'].some(k => keyword.includes(k))) {
                    analysis.categories.educational = true;
                }
            }
        });

        // Check tech company patterns
        this.techCompanyPatterns.forEach(pattern => {
            if (pattern.test(text)) {
                score += 2;
                analysis.reasoning.push('Tech company mentioned');
                analysis.categories.company = true;
            }
        });

        // Check educational patterns
        this.educationPatterns.forEach(pattern => {
            if (pattern.test(text)) {
                score += 1;
                analysis.categories.educational = true;
            }
        });

        // Subtract points for negative keywords
        this.negativeKeywords.forEach(keyword => {
            if (text.includes(keyword)) {
                score -= 2;
                analysis.reasoning.push(`Negative keyword penalty: "${keyword}"`);
            }
        });

        // Bonus for programming language mentions
        const programmingLanguages = ['javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift'];
        programmingLanguages.forEach(lang => {
            if (text.includes(lang)) {
                score += 1;
                analysis.categories.technical = true;
            }
        });

        // Cap the maximum score
        return Math.min(Math.max(score, 0), this.maxRelevanceScore);
    }

    /**
     * Calculate confidence level based on score and content length
     * @param {number} score - Relevance score
     * @param {number} contentLength - Length of content
     * @returns {number} Confidence percentage (0-100)
     */
    calculateConfidence(score, contentLength) {
        // Base confidence from score
        let confidence = (score / this.maxRelevanceScore) * 100;

        // Adjust based on content length (more content = higher confidence)
        if (contentLength < 50) {
            confidence *= 0.7; // Lower confidence for short content
        } else if (contentLength > 200) {
            confidence *= 1.2; // Higher confidence for longer content
        }

        // Cap confidence at 100%
        return Math.min(confidence, 100);
    }

    /**
     * Check if post author appears to be in tech/CS field
     * @param {Object} authorData - Author information
     * @returns {boolean} Whether author appears to be tech-related
     */
    isAuthorTechRelevant(authorData) {
        if (!authorData || !authorData.headline) {
            return false;
        }

        const headline = authorData.headline.toLowerCase();

        const techTitles = [
            'developer', 'engineer', 'programmer', 'architect', 'tech lead',
            'software', 'frontend', 'backend', 'fullstack', 'devops',
            'data scientist', 'machine learning', 'ai', 'product manager',
            'cto', 'ceo', 'founder', 'startup', 'tech recruiter'
        ];

        return techTitles.some(title => headline.includes(title));
    }

    /**
     * Generate a summary of why content was or wasn't selected
     * @param {Object} analysis - Content analysis result
     * @returns {string} Human-readable summary
     */
    generateAnalysisSummary(analysis) {
        const { isRelevant, relevanceScore, reasoning, confidence, categories } = analysis;

        let summary = `Content ${isRelevant ? 'selected' : 'rejected'} (Score: ${relevanceScore}, Confidence: ${confidence.toFixed(1)}%)\n`;

        if (Object.values(categories).some(Boolean)) {
            const activeCategories = Object.entries(categories)
                .filter(([key, value]) => value)
                .map(([key]) => key);
            summary += `Categories: ${activeCategories.join(', ')}\n`;
        }

        if (reasoning.length > 0) {
            summary += `Reasons: ${reasoning.slice(0, 3).join(', ')}`;
            if (reasoning.length > 3) {
                summary += ` (and ${reasoning.length - 3} more)`;
            }
        }

        return summary;
    }
}

// Export as singleton
const contentFilter = new ContentFilter();
export { contentFilter };