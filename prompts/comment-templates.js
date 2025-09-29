/**
 * Comment Templates - Structured prompts for generating contextual comments
 * Provides various templates for different platforms, styles, and contexts
 * 
 * Features:
 * - Platform-specific templates (LinkedIn, Twitter)
 * - Multiple comment styles (professional, casual, engaging, technical)
 * - Context-aware prompting
 * - CS student perspective integration
 * - Dynamic template selection
 */

class CommentTemplates {
    constructor() {
        this.baseContext = {
            perspective: "You are a Computer Science student who actively engages with tech content on social media.",
            personality: "You are enthusiastic about technology, eager to learn, and professional in your interactions.",
            guidelines: [
                "Keep responses authentic and conversational",
                "Show genuine interest in the topic",
                "Add value with insights or questions",
                "Maintain professional tone appropriate for the platform",
                "Keep within character limits",
                "Avoid generic responses"
            ]
        };

        this.templates = {
            linkedin: {
                professional: {
                    template: this.buildLinkedInProfessionalTemplate(),
                    description: "Professional, thoughtful responses suitable for LinkedIn's business environment"
                },
                engaging: {
                    template: this.buildLinkedInEngagingTemplate(),
                    description: "More conversational while maintaining professionalism"
                },
                technical: {
                    template: this.buildLinkedInTechnicalTemplate(),
                    description: "Technical discussions with deeper CS knowledge"
                },
                supportive: {
                    template: this.buildLinkedInSupportiveTemplate(),
                    description: "Supportive and encouraging responses"
                }
            },
            twitter: {
                casual: {
                    template: this.buildTwitterCasualTemplate(),
                    description: "Casual, friendly responses perfect for Twitter's informal atmosphere"
                },
                engaging: {
                    template: this.buildTwitterEngagingTemplate(),
                    description: "Engaging responses that encourage further discussion"
                },
                technical: {
                    template: this.buildTwitterTechnicalTemplate(),
                    description: "Technical insights in Twitter's concise format"
                },
                witty: {
                    template: this.buildTwitterWittyTemplate(),
                    description: "Light-hearted, clever responses with personality"
                }
            }
        };

        this.contextualPrompts = {
            jobPosting: "The post appears to be about job opportunities or career advice.",
            projectShowcase: "The post is showcasing a personal project or technical achievement.",
            techNews: "The post is sharing or discussing recent technology news or trends.",
            learningContent: "The post contains educational content or learning resources.",
            eventAnnouncement: "The post is announcing or promoting a tech event or meetup.",
            industryInsight: "The post shares professional insights about the tech industry.",
            problemSolving: "The post discusses technical problems or solutions."
        };
    }

    /**
     * Get template for specific platform and style
     * @param {string} platform - 'linkedin' or 'twitter'
     * @param {string} style - Template style ('professional', 'engaging', etc.)
     * @return {string} - The formatted template
     */
    getTemplate(platform, style = 'engaging') {
        const platformTemplates = this.templates[platform];
        if (!platformTemplates) {
            throw new Error(`Unsupported platform: ${platform}`);
        }

        const template = platformTemplates[style];
        if (!template) {
            // Fallback to first available style
            const availableStyles = Object.keys(platformTemplates);
            console.warn(`Style '${style}' not found for ${platform}, using '${availableStyles[0]}'`);
            return platformTemplates[availableStyles[0]].template;
        }

        return template.template;
    }

    /**
     * Get context-specific prompt addition
     * @param {Object} postData - Post data for context analysis
     * @return {string} - Additional context prompt
     */
    getContextualPrompt(postData) {
        const content = (postData.content || '').toLowerCase();
        const hashtags = (postData.hashtags || []).join(' ').toLowerCase();
        const authorRole = (postData.author?.jobTitle || '').toLowerCase();

        const combinedText = `${content} ${hashtags} ${authorRole}`;

        // Analyze content type
        if (this.containsKeywords(combinedText, ['job', 'hiring', 'career', 'opportunity', 'position'])) {
            return this.contextualPrompts.jobPosting;
        }

        if (this.containsKeywords(combinedText, ['project', 'built', 'created', 'developed', 'showcase'])) {
            return this.contextualPrompts.projectShowcase;
        }

        if (this.containsKeywords(combinedText, ['news', 'announcement', 'release', 'update', 'breaking'])) {
            return this.contextualPrompts.techNews;
        }

        if (this.containsKeywords(combinedText, ['learn', 'tutorial', 'guide', 'course', 'education'])) {
            return this.contextualPrompts.learningContent;
        }

        if (this.containsKeywords(combinedText, ['event', 'meetup', 'conference', 'webinar', 'workshop'])) {
            return this.contextualPrompts.eventAnnouncement;
        }

        if (this.containsKeywords(combinedText, ['industry', 'trend', 'future', 'prediction', 'analysis'])) {
            return this.contextualPrompts.industryInsight;
        }

        if (this.containsKeywords(combinedText, ['problem', 'solution', 'debug', 'fix', 'issue', 'error'])) {
            return this.contextualPrompts.problemSolving;
        }

        return "The post contains general technology or computer science related content.";
    }

    /**
     * Check if text contains any of the specified keywords
     * @param {string} text - Text to search
     * @param {Array} keywords - Keywords to search for
     * @return {boolean} - True if any keyword is found
     */
    containsKeywords(text, keywords) {
        return keywords.some(keyword => text.includes(keyword));
    }

    // LinkedIn Template Builders

    buildLinkedInProfessionalTemplate() {
        return `${this.baseContext.perspective}

POST CONTENT: "{POST_CONTENT}"
AUTHOR: {AUTHOR_NAME}
PLATFORM: {PLATFORM}
CONTEXT: {CONTEXT}

Generate a professional comment response that:
1. Acknowledges the author's post thoughtfully
2. Adds relevant insight from a CS student perspective
3. Shows genuine engagement with the topic
4. Maintains LinkedIn's professional tone
5. Is {LENGTH}
6. Uses a {TONE} approach

Guidelines:
- Start with acknowledgment ("Great insights on..." or "Thanks for sharing...")
- Add personal perspective or related experience
- Ask a thoughtful follow-up question when appropriate
- Avoid generic responses like "Great post!"
- Keep it conversational but professional
- Stay within 1-2 sentences unless specified otherwise

Generate only the comment text, no quotes or additional formatting.`;
    }

    buildLinkedInEngagingTemplate() {
        return `${this.baseContext.perspective}

POST CONTENT: "{POST_CONTENT}"
AUTHOR: {AUTHOR_NAME}
CONTEXT: {CONTEXT}

Create an engaging LinkedIn comment that:
- Shows enthusiasm for the topic while remaining professional
- Connects the content to CS student experiences or perspectives
- Asks an engaging question or shares a relevant insight
- Encourages further discussion
- Maintains authenticity and avoids generic responses
- Is {LENGTH} with a {TONE} tone

Examples of good engagement:
- "This really resonates with my experience learning [topic]..."
- "I've been exploring [related area] - have you found [specific question]?"
- "Your point about [specific detail] reminds me of..."

Generate only the comment text, no additional formatting.`;
    }

    buildLinkedInTechnicalTemplate() {
        return `${this.baseContext.perspective}

POST CONTENT: "{POST_CONTENT}"
AUTHOR: {AUTHOR_NAME}
CONTEXT: {CONTEXT}

Generate a technical LinkedIn comment that:
- Demonstrates understanding of the technical concepts discussed
- Adds technical insight appropriate for a CS student level
- References specific technologies, frameworks, or methodologies when relevant
- Maintains professional discourse
- Shows depth of knowledge without being pretentious
- Is {LENGTH} with a {TONE} approach

Focus areas for CS student perspective:
- Programming languages and frameworks
- Software development practices
- System design concepts
- Emerging technologies
- Academic vs industry applications

Generate only the comment text, no quotes or formatting.`;
    }

    buildLinkedInSupportiveTemplate() {
        return `${this.baseContext.perspective}

POST CONTENT: "{POST_CONTENT}"
AUTHOR: {AUTHOR_NAME}
CONTEXT: {CONTEXT}

Create a supportive LinkedIn comment that:
- Offers encouragement and positivity
- Acknowledges the author's achievements or insights
- Shares related experiences or challenges from a student perspective
- Provides constructive support or validation
- Maintains professional warmth
- Is {LENGTH} with a {TONE} tone

Supportive approaches:
- Celebrating achievements: "Congratulations on..."
- Acknowledging challenges: "I can relate to the challenges of..."
- Offering encouragement: "Your journey in [area] is inspiring..."
- Sharing growth: "This has helped me understand..."

Generate only the comment text, no additional formatting.`;
    }

    // Twitter Template Builders

    buildTwitterCasualTemplate() {
        return `${this.baseContext.perspective}

TWEET CONTENT: "{POST_CONTENT}"
AUTHOR: {AUTHOR_NAME}
CONTEXT: {CONTEXT}

Generate a casual Twitter reply that:
- Matches Twitter's informal, conversational tone
- Shows genuine interest from a CS student perspective
- Is concise and engaging (remember Twitter's character limits)
- Uses natural language and maybe relevant emojis when appropriate
- Encourages interaction or shares a quick insight
- Is {LENGTH} with a {TONE} approach

Twitter-specific guidelines:
- Keep it short and punchy
- Use conversational language
- Can include relevant emojis (1-2 max)
- Avoid overly formal language
- Make it feel like a natural conversation

Generate only the reply text, no quotes or additional formatting.`;
    }

    buildTwitterEngagingTemplate() {
        return `${this.baseContext.perspective}

TWEET CONTENT: "{POST_CONTENT}"
AUTHOR: {AUTHOR_NAME}
CONTEXT: {CONTEXT}

Create an engaging Twitter reply that:
- Sparks conversation or asks an interesting question
- Shows enthusiasm and genuine engagement with the topic
- Includes CS student perspective or experience
- Is optimized for Twitter's fast-paced environment
- Encourages retweets or further discussion
- Is {LENGTH} with a {TONE} tone

Engagement strategies:
- Ask thought-provoking questions
- Share quick insights or experiences
- Reference current trends or technologies
- Use relatable CS student experiences
- Keep it conversational and accessible

Generate only the reply text, no formatting or quotes.`;
    }

    buildTwitterTechnicalTemplate() {
        return `${this.baseContext.perspective}

TWEET CONTENT: "{POST_CONTENT}"
AUTHOR: {AUTHOR_NAME}
CONTEXT: {CONTEXT}

Generate a technical Twitter reply that:
- Demonstrates technical knowledge appropriate for a CS student
- Stays concise while being informative
- References specific technologies or concepts when relevant
- Maintains Twitter's accessible tone despite technical content
- Shows learning curiosity and engagement
- Is {LENGTH} with a {TONE} approach

Technical focus areas:
- Programming languages, frameworks, tools
- Software development practices
- System architecture concepts
- Emerging technologies and trends
- Academic projects or coursework connections

Generate only the reply text, no additional formatting.`;
    }

    buildTwitterWittyTemplate() {
        return `${this.baseContext.perspective}

TWEET CONTENT: "{POST_CONTENT}"
AUTHOR: {AUTHOR_NAME}
CONTEXT: {CONTEXT}

Create a witty Twitter reply that:
- Shows personality and cleverness without being offensive
- Includes light humor related to CS or tech topics
- Maintains respect for the original author
- Is engaging and likely to get positive reactions
- Stays appropriate for professional tech discussions
- Is {LENGTH} with a {TONE} approach

Witty approaches:
- Clever tech puns or wordplay (when natural)
- Relatable CS student humor
- Light-hearted observations about tech life
- Playful references to programming concepts
- Self-deprecating humor about learning journey

Generate only the reply text, no quotes or additional formatting.`;
    }

    /**
     * Get all available styles for a platform
     * @param {string} platform - Platform name
     * @return {Array} - Array of style objects with name and description
     */
    getAvailableStyles(platform) {
        const platformTemplates = this.templates[platform];
        if (!platformTemplates) {
            return [];
        }

        return Object.entries(platformTemplates).map(([name, template]) => ({
            name,
            description: template.description
        }));
    }

    /**
     * Get template statistics
     * @return {Object} - Statistics about available templates
     */
    getTemplateStats() {
        const stats = {};

        Object.entries(this.templates).forEach(([platform, styles]) => {
            stats[platform] = {
                styleCount: Object.keys(styles).length,
                styles: Object.keys(styles)
            };
        });

        return {
            platforms: Object.keys(this.templates),
            totalTemplates: Object.values(this.templates)
                .reduce((sum, styles) => sum + Object.keys(styles).length, 0),
            byPlatform: stats,
            contextualPrompts: Object.keys(this.contextualPrompts).length
        };
    }

    /**
     * Validate template variables
     * @param {string} template - Template string
     * @return {Object} - Validation result
     */
    validateTemplate(template) {
        const requiredVariables = ['{POST_CONTENT}', '{AUTHOR_NAME}', '{PLATFORM}', '{CONTEXT}'];
        const optionalVariables = ['{TONE}', '{LENGTH}'];

        const missingRequired = requiredVariables.filter(variable =>
            !template.includes(variable)
        );

        const foundOptional = optionalVariables.filter(variable =>
            template.includes(variable)
        );

        return {
            isValid: missingRequired.length === 0,
            missingRequired,
            foundOptional,
            wordCount: template.split(' ').length
        };
    }

    /**
     * Create custom template
     * @param {string} platform - Platform name
     * @param {string} style - Style name
     * @param {string} template - Template string
     * @param {string} description - Template description
     */
    addCustomTemplate(platform, style, template, description) {
        const validation = this.validateTemplate(template);

        if (!validation.isValid) {
            throw new Error(`Invalid template. Missing required variables: ${validation.missingRequired.join(', ')}`);
        }

        if (!this.templates[platform]) {
            this.templates[platform] = {};
        }

        this.templates[platform][style] = {
            template,
            description,
            custom: true
        };

        return { success: true, validation };
    }
}

// Create singleton instance
const commentTemplates = new CommentTemplates();

export { CommentTemplates, commentTemplates };