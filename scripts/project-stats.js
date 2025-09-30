#!/usr/bin/env node

/**
 * Project Statistics Script - Comprehensive project analysis and metrics
 * Provides detailed statistics about the codebase, documentation, and project health
 */

const fs = require('fs').promises;
const path = require('path');

class ProjectStatsAnalyzer {
    constructor() {
        this.projectRoot = process.cwd();
        this.stats = {
            overview: {},
            codeMetrics: {},
            fileTypes: {},
            documentation: {},
            testing: {},
            performance: {},
            complexity: {}
        };

        // File type categorization
        this.fileCategories = {
            code: ['.js', '.json'],
            styles: ['.css'],
            markup: ['.html'],
            documentation: ['.md'],
            config: ['.json', '.js'],
            assets: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico']
        };

        // Directories to analyze
        this.targetDirectories = [
            'background',
            'content-scripts',
            'popup',
            'utils',
            'services',
            'prompts',
            'test',
            'docs',
            'assets'
        ];

        // Files to include in root analysis
        this.rootFiles = [
            'manifest.json',
            'config.js',
            'package.json',
            'README.md',
            'CHANGELOG.md',
            'todo.md'
        ];
    }

    /**
     * Main analysis function
     */
    async analyze() {
        try {
            console.log('📊 Starting project statistics analysis...\n');

            await this.analyzeOverview();
            await this.analyzeCodeMetrics();
            await this.analyzeFileTypes();
            await this.analyzeDocumentation();
            await this.analyzeTesting();
            await this.analyzeComplexity();

            await this.generateReport();

            console.log('\n✅ Analysis completed successfully!');

        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Analyze project overview
     */
    async analyzeOverview() {
        console.log('🔍 Analyzing project overview...');

        const packageJson = await this.readJsonFile('package.json');

        this.stats.overview = {
            name: packageJson.name || 'Unknown',
            version: packageJson.version || 'Unknown',
            description: packageJson.description || 'No description',
            author: packageJson.author || 'Unknown',
            license: packageJson.license || 'Unknown',
            keywords: packageJson.keywords || [],
            analysisDate: new Date().toISOString(),
            nodeVersion: process.version
        };

        // Get git information if available
        try {
            const gitDir = path.join(this.projectRoot, '.git');
            await fs.access(gitDir);
            this.stats.overview.versionControl = 'Git';
        } catch (error) {
            this.stats.overview.versionControl = 'None';
        }
    }

    /**
     * Analyze code metrics
     */
    async analyzeCodeMetrics() {
        console.log('📝 Analyzing code metrics...');

        const codeFiles = await this.findCodeFiles();

        let totalLines = 0;
        let totalCodeLines = 0;
        let totalCommentLines = 0;
        let totalBlankLines = 0;
        let totalFiles = 0;

        const fileMetrics = {};

        for (const filePath of codeFiles) {
            const metrics = await this.analyzeFile(filePath);
            const relativePath = path.relative(this.projectRoot, filePath);

            fileMetrics[relativePath] = metrics;

            totalFiles++;
            totalLines += metrics.totalLines;
            totalCodeLines += metrics.codeLines;
            totalCommentLines += metrics.commentLines;
            totalBlankLines += metrics.blankLines;
        }

        this.stats.codeMetrics = {
            totalFiles,
            totalLines,
            totalCodeLines,
            totalCommentLines,
            totalBlankLines,
            averageLinesPerFile: totalFiles > 0 ? Math.round(totalLines / totalFiles) : 0,
            commentRatio: totalLines > 0 ? ((totalCommentLines / totalLines) * 100).toFixed(1) : 0,
            fileMetrics
        };
    }

    /**
     * Analyze individual file
     */
    async analyzeFile(filePath) {
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n');

        let codeLines = 0;
        let commentLines = 0;
        let blankLines = 0;

        let inBlockComment = false;

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed === '') {
                blankLines++;
            } else if (trimmed.startsWith('//')) {
                commentLines++;
            } else if (trimmed.startsWith('/*')) {
                commentLines++;
                inBlockComment = !trimmed.includes('*/');
            } else if (inBlockComment) {
                commentLines++;
                if (trimmed.includes('*/')) {
                    inBlockComment = false;
                }
            } else {
                codeLines++;
            }
        }

        return {
            totalLines: lines.length,
            codeLines,
            commentLines,
            blankLines,
            size: Buffer.byteLength(content, 'utf8')
        };
    }

    /**
     * Find all code files
     */
    async findCodeFiles() {
        const codeFiles = [];

        // Analyze target directories
        for (const dir of this.targetDirectories) {
            const dirPath = path.join(this.projectRoot, dir);
            try {
                const files = await this.findFilesRecursively(dirPath, ['.js', '.json', '.css', '.html']);
                codeFiles.push(...files);
            } catch (error) {
                // Directory doesn't exist
            }
        }

        // Analyze root files
        for (const file of this.rootFiles) {
            const filePath = path.join(this.projectRoot, file);
            try {
                await fs.access(filePath);
                codeFiles.push(filePath);
            } catch (error) {
                // File doesn't exist
            }
        }

        return codeFiles;
    }

    /**
     * Find files recursively
     */
    async findFilesRecursively(dir, extensions) {
        const files = [];

        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    const subFiles = await this.findFilesRecursively(fullPath, extensions);
                    files.push(...subFiles);
                } else if (extensions.some(ext => entry.name.endsWith(ext))) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            // Directory access error
        }

        return files;
    }

    /**
     * Analyze file types
     */
    async analyzeFileTypes() {
        console.log('📁 Analyzing file types...');

        const allFiles = await this.findAllFiles();
        const typeStats = {};

        for (const filePath of allFiles) {
            const ext = path.extname(filePath);
            const size = (await fs.stat(filePath)).size;

            if (!typeStats[ext]) {
                typeStats[ext] = {
                    count: 0,
                    totalSize: 0,
                    files: []
                };
            }

            typeStats[ext].count++;
            typeStats[ext].totalSize += size;
            typeStats[ext].files.push(path.relative(this.projectRoot, filePath));
        }

        // Sort by count
        const sortedTypes = Object.entries(typeStats)
            .sort(([, a], [, b]) => b.count - a.count)
            .reduce((obj, [key, value]) => {
                obj[key] = {
                    ...value,
                    averageSize: Math.round(value.totalSize / value.count),
                    totalSizeFormatted: this.formatBytes(value.totalSize)
                };
                return obj;
            }, {});

        this.stats.fileTypes = {
            totalFiles: allFiles.length,
            typeBreakdown: sortedTypes
        };
    }

    /**
     * Find all files in project
     */
    async findAllFiles() {
        const allFiles = [];

        async function scan(dir) {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });

                for (const entry of entries) {
                    if (entry.name.startsWith('.') && entry.name !== '.gitignore') {
                        continue; // Skip hidden files except .gitignore
                    }

                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory()) {
                        if (entry.name !== 'node_modules' && entry.name !== '.git') {
                            await scan(fullPath);
                        }
                    } else {
                        allFiles.push(fullPath);
                    }
                }
            } catch (error) {
                // Directory access error
            }
        }

        await scan(this.projectRoot);
        return allFiles;
    }

    /**
     * Analyze documentation
     */
    async analyzeDocumentation() {
        console.log('📚 Analyzing documentation...');

        const docFiles = await this.findFilesRecursively(this.projectRoot, ['.md']);

        let totalDocLines = 0;
        let totalDocSize = 0;
        const docMetrics = {};

        for (const filePath of docFiles) {
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n').length;
            const size = Buffer.byteLength(content, 'utf8');

            const relativePath = path.relative(this.projectRoot, filePath);
            docMetrics[relativePath] = {
                lines,
                size,
                sizeFormatted: this.formatBytes(size)
            };

            totalDocLines += lines;
            totalDocSize += size;
        }

        this.stats.documentation = {
            totalFiles: docFiles.length,
            totalLines: totalDocLines,
            totalSize: totalDocSize,
            totalSizeFormatted: this.formatBytes(totalDocSize),
            averageLinesPerDoc: docFiles.length > 0 ? Math.round(totalDocLines / docFiles.length) : 0,
            files: docMetrics
        };
    }

    /**
     * Analyze testing
     */
    async analyzeTesting() {
        console.log('🧪 Analyzing testing...');

        const testDir = path.join(this.projectRoot, 'test');
        let testFiles = [];

        try {
            testFiles = await this.findFilesRecursively(testDir, ['.js']);
        } catch (error) {
            // Test directory doesn't exist
        }

        let totalTestLines = 0;
        const testMetrics = {};

        for (const filePath of testFiles) {
            const metrics = await this.analyzeFile(filePath);
            const relativePath = path.relative(this.projectRoot, filePath);

            testMetrics[relativePath] = metrics;
            totalTestLines += metrics.totalLines;
        }

        this.stats.testing = {
            testFiles: testFiles.length,
            totalTestLines,
            averageLinesPerTest: testFiles.length > 0 ? Math.round(totalTestLines / testFiles.length) : 0,
            testCoverage: this.calculateTestCoverage(),
            files: testMetrics
        };
    }

    /**
     * Calculate estimated test coverage
     */
    calculateTestCoverage() {
        const { totalCodeLines } = this.stats.codeMetrics;
        const { totalTestLines } = this.stats.testing;

        if (totalCodeLines === 0) return 0;

        // Rough estimation: assume 1 line of test per 3 lines of code is good coverage
        const estimatedCoverage = Math.min((totalTestLines / totalCodeLines) * 3 * 100, 100);
        return Math.round(estimatedCoverage);
    }

    /**
     * Analyze code complexity
     */
    async analyzeComplexity() {
        console.log('🔧 Analyzing complexity...');

        const jsFiles = await this.findFilesRecursively(this.projectRoot, ['.js']);

        let totalFunctions = 0;
        let totalClasses = 0;
        let totalImports = 0;
        let totalExports = 0;
        const complexityMetrics = {};

        for (const filePath of jsFiles) {
            const content = await fs.readFile(filePath, 'utf8');
            const relativePath = path.relative(this.projectRoot, filePath);

            const metrics = {
                functions: (content.match(/function\s+\w+|=>\s*{|async\s+\w+/g) || []).length,
                classes: (content.match(/class\s+\w+/g) || []).length,
                imports: (content.match(/import\s+.*from|require\(/g) || []).length,
                exports: (content.match(/export\s+|module\.exports/g) || []).length,
                conditionals: (content.match(/if\s*\(|switch\s*\(|try\s*{/g) || []).length,
                loops: (content.match(/for\s*\(|while\s*\(|forEach\(/g) || []).length
            };

            complexityMetrics[relativePath] = metrics;

            totalFunctions += metrics.functions;
            totalClasses += metrics.classes;
            totalImports += metrics.imports;
            totalExports += metrics.exports;
        }

        this.stats.complexity = {
            totalJSFiles: jsFiles.length,
            totalFunctions,
            totalClasses,
            totalImports,
            totalExports,
            averageFunctionsPerFile: jsFiles.length > 0 ? Math.round(totalFunctions / jsFiles.length) : 0,
            files: complexityMetrics
        };
    }

    /**
     * Read JSON file
     */
    async readJsonFile(filename) {
        try {
            const content = await fs.readFile(path.join(this.projectRoot, filename), 'utf8');
            return JSON.parse(content);
        } catch (error) {
            return {};
        }
    }

    /**
     * Format bytes for display
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Generate comprehensive report
     */
    async generateReport() {
        console.log('📋 Generating report...');

        // Calculate total project size
        const allFiles = await this.findAllFiles();
        let totalProjectSize = 0;

        for (const file of allFiles) {
            try {
                const stat = await fs.stat(file);
                totalProjectSize += stat.size;
            } catch (error) {
                // File access error
            }
        }

        this.stats.overview.totalProjectSize = totalProjectSize;
        this.stats.overview.totalProjectSizeFormatted = this.formatBytes(totalProjectSize);

        // Display console report
        this.displayConsoleReport();

        // Save detailed report
        await this.saveDetailedReport();
    }

    /**
     * Display console report
     */
    displayConsoleReport() {
        const { overview, codeMetrics, documentation, testing, complexity } = this.stats;

        console.log('\n' + '='.repeat(60));
        console.log('📊 PROJECT STATISTICS REPORT');
        console.log('='.repeat(60));

        console.log(`\n📦 Project Overview:`);
        console.log(`   Name: ${overview.name}`);
        console.log(`   Version: ${overview.version}`);
        console.log(`   Total Size: ${overview.totalProjectSizeFormatted}`);
        console.log(`   Author: ${overview.author}`);
        console.log(`   License: ${overview.license}`);

        console.log(`\n📝 Code Metrics:`);
        console.log(`   Total Files: ${codeMetrics.totalFiles}`);
        console.log(`   Total Lines: ${codeMetrics.totalLines.toLocaleString()}`);
        console.log(`   Code Lines: ${codeMetrics.totalCodeLines.toLocaleString()}`);
        console.log(`   Comment Lines: ${codeMetrics.totalCommentLines.toLocaleString()}`);
        console.log(`   Comment Ratio: ${codeMetrics.commentRatio}%`);
        console.log(`   Avg Lines/File: ${codeMetrics.averageLinesPerFile}`);

        console.log(`\n📚 Documentation:`);
        console.log(`   Doc Files: ${documentation.totalFiles}`);
        console.log(`   Doc Lines: ${documentation.totalLines.toLocaleString()}`);
        console.log(`   Doc Size: ${documentation.totalSizeFormatted}`);
        console.log(`   Avg Lines/Doc: ${documentation.averageLinesPerDoc}`);

        console.log(`\n🧪 Testing:`);
        console.log(`   Test Files: ${testing.testFiles}`);
        console.log(`   Test Lines: ${testing.totalTestLines.toLocaleString()}`);
        console.log(`   Estimated Coverage: ${testing.testCoverage}%`);

        console.log(`\n🔧 Complexity:`);
        console.log(`   JavaScript Files: ${complexity.totalJSFiles}`);
        console.log(`   Total Functions: ${complexity.totalFunctions}`);
        console.log(`   Total Classes: ${complexity.totalClasses}`);
        console.log(`   Avg Functions/File: ${complexity.averageFunctionsPerFile}`);

        console.log(`\n📁 Top File Types:`);
        const topTypes = Object.entries(this.stats.fileTypes.typeBreakdown)
            .slice(0, 5);

        for (const [ext, data] of topTypes) {
            console.log(`   ${ext || 'no-ext'}: ${data.count} files (${data.totalSizeFormatted})`);
        }

        console.log('\n' + '='.repeat(60));
    }

    /**
     * Save detailed report
     */
    async saveDetailedReport() {
        const reportPath = path.join(this.projectRoot, 'project-stats.json');
        await fs.writeFile(reportPath, JSON.stringify(this.stats, null, 2));

        // Also create a markdown report
        const markdownReport = this.generateMarkdownReport();
        const markdownPath = path.join(this.projectRoot, 'docs', 'project-stats.md');

        try {
            await fs.mkdir(path.dirname(markdownPath), { recursive: true });
            await fs.writeFile(markdownPath, markdownReport);
            console.log(`📄 Detailed reports saved:`);
            console.log(`   JSON: ${reportPath}`);
            console.log(`   Markdown: ${markdownPath}`);
        } catch (error) {
            console.log(`📄 JSON report saved: ${reportPath}`);
            console.warn(`⚠️ Could not save markdown report: ${error.message}`);
        }
    }

    /**
     * Generate markdown report
     */
    generateMarkdownReport() {
        const { overview, codeMetrics, documentation, testing, complexity, fileTypes } = this.stats;

        return `# Project Statistics Report

*Generated on: ${new Date().toLocaleDateString()}*

## Overview

| Metric | Value |
|--------|--------|
| **Name** | ${overview.name} |
| **Version** | ${overview.version} |
| **Total Size** | ${overview.totalProjectSizeFormatted} |
| **Author** | ${overview.author} |
| **License** | ${overview.license} |
| **Node Version** | ${overview.nodeVersion} |

## Code Metrics

| Metric | Value |
|--------|--------|
| **Total Files** | ${codeMetrics.totalFiles} |
| **Total Lines** | ${codeMetrics.totalLines.toLocaleString()} |
| **Code Lines** | ${codeMetrics.totalCodeLines.toLocaleString()} |
| **Comment Lines** | ${codeMetrics.totalCommentLines.toLocaleString()} |
| **Blank Lines** | ${codeMetrics.totalBlankLines.toLocaleString()} |
| **Comment Ratio** | ${codeMetrics.commentRatio}% |
| **Average Lines per File** | ${codeMetrics.averageLinesPerFile} |

## Documentation

| Metric | Value |
|--------|--------|
| **Documentation Files** | ${documentation.totalFiles} |
| **Documentation Lines** | ${documentation.totalLines.toLocaleString()} |
| **Documentation Size** | ${documentation.totalSizeFormatted} |
| **Average Lines per Doc** | ${documentation.averageLinesPerDoc} |

## Testing

| Metric | Value |
|--------|--------|
| **Test Files** | ${testing.testFiles} |
| **Test Lines** | ${testing.totalTestLines.toLocaleString()} |
| **Estimated Coverage** | ${testing.testCoverage}% |

## Complexity Analysis

| Metric | Value |
|--------|--------|
| **JavaScript Files** | ${complexity.totalJSFiles} |
| **Total Functions** | ${complexity.totalFunctions} |
| **Total Classes** | ${complexity.totalClasses} |
| **Total Imports** | ${complexity.totalImports} |
| **Total Exports** | ${complexity.totalExports} |
| **Average Functions per File** | ${complexity.averageFunctionsPerFile} |

## File Type Breakdown

| Extension | Files | Total Size |
|-----------|--------|------------|
${Object.entries(fileTypes.typeBreakdown).map(([ext, data]) =>
            `| ${ext || 'no-extension'} | ${data.count} | ${data.totalSizeFormatted} |`
        ).join('\n')}

---

*Report generated by Project Statistics Analyzer*
`;
    }
}

// Run analysis if called directly
if (require.main === module) {
    const analyzer = new ProjectStatsAnalyzer();
    analyzer.analyze().catch(error => {
        console.error('Analysis failed:', error);
        process.exit(1);
    });
}

module.exports = ProjectStatsAnalyzer;