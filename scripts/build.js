#!/usr/bin/env node

/**
 * Build Script - Production-ready Chrome Extension packaging
 * Creates optimized builds for development and production deployment
 */

const fs = require('fs').promises;
const path = require('path');

class ExtensionBuilder {
    constructor() {
        this.sourceDir = process.cwd();
        this.distDir = path.join(this.sourceDir, 'dist');
        this.isDevelopment = process.argv.includes('--dev');
        this.isProduction = process.argv.includes('--prod');

        // Files to include in build
        this.includeFiles = [
            'manifest.json',
            'config.js',
            'background/',
            'content-scripts/',
            'popup/',
            'utils/',
            'services/',
            'prompts/',
            'test/',
            'assets/',
            'docs/'
        ];

        // Files to exclude
        this.excludeFiles = [
            '.git',
            '.gitignore',
            'node_modules',
            'package.json',
            'package-lock.json',
            'scripts',
            '*.md',
            '.eslintrc*',
            '.prettierrc*',
            'todo.md',
            'CHANGELOG.md'
        ];

        this.buildConfig = {
            development: {
                minify: false,
                removeComments: false,
                debugMode: true,
                validateAPI: false
            },
            production: {
                minify: true,
                removeComments: true,
                debugMode: false,
                validateAPI: true
            }
        };
    }

    /**
     * Main build process
     */
    async build() {
        try {
            console.log('🔨 Starting build process...');
            console.log(`📦 Mode: ${this.isDevelopment ? 'Development' : this.isProduction ? 'Production' : 'Default'}`);

            // Clean previous build
            await this.cleanBuild();

            // Create dist directory
            await this.createDistDirectory();

            // Copy source files
            await this.copySourceFiles();

            // Process manifest
            await this.processManifest();

            // Process configuration
            await this.processConfiguration();

            // Optimize files
            if (this.isProduction) {
                await this.optimizeForProduction();
            }

            // Validate build
            await this.validateBuild();

            // Generate build report
            await this.generateBuildReport();

            console.log('✅ Build completed successfully!');
            console.log(`📁 Output directory: ${this.distDir}`);

        } catch (error) {
            console.error('❌ Build failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Clean previous build
     */
    async cleanBuild() {
        try {
            await fs.rmdir(this.distDir, { recursive: true });
            console.log('🧹 Cleaned previous build');
        } catch (error) {
            // Directory doesn't exist, which is fine
        }
    }

    /**
     * Create dist directory structure
     */
    async createDistDirectory() {
        await fs.mkdir(this.distDir, { recursive: true });
        console.log('📁 Created dist directory');
    }

    /**
     * Copy source files to dist
     */
    async copySourceFiles() {
        console.log('📋 Copying source files...');

        for (const file of this.includeFiles) {
            const sourcePath = path.join(this.sourceDir, file);
            const destPath = path.join(this.distDir, file);

            try {
                const stat = await fs.stat(sourcePath);

                if (stat.isDirectory()) {
                    await this.copyDirectory(sourcePath, destPath);
                } else {
                    await this.copyFile(sourcePath, destPath);
                }
            } catch (error) {
                console.warn(`⚠️ Could not copy ${file}: ${error.message}`);
            }
        }

        console.log('✅ Source files copied');
    }

    /**
     * Copy directory recursively
     */
    async copyDirectory(source, dest) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(source, { withFileTypes: true });

        for (const entry of entries) {
            const sourcePath = path.join(source, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectory(sourcePath, destPath);
            } else {
                await this.copyFile(sourcePath, destPath);
            }
        }
    }

    /**
     * Copy individual file
     */
    async copyFile(source, dest) {
        const destDir = path.dirname(dest);
        await fs.mkdir(destDir, { recursive: true });
        await fs.copyFile(source, dest);
    }

    /**
     * Process manifest.json for build
     */
    async processManifest() {
        const manifestPath = path.join(this.distDir, 'manifest.json');
        const manifestContent = await fs.readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestContent);

        // Update version for development builds
        if (this.isDevelopment) {
            const version = manifest.version.split('.');
            version[2] = (parseInt(version[2]) + 1).toString();
            manifest.version = version.join('.');
            manifest.name += ' (Dev)';
        }

        // Add build timestamp
        manifest.build_timestamp = new Date().toISOString();
        manifest.build_mode = this.isDevelopment ? 'development' :
            this.isProduction ? 'production' : 'default';

        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        console.log('📋 Processed manifest.json');
    }

    /**
     * Process configuration for build
     */
    async processConfiguration() {
        const configPath = path.join(this.distDir, 'config.js');
        let configContent = await fs.readFile(configPath, 'utf8');

        const config = this.buildConfig[this.isProduction ? 'production' : 'development'];

        // Update debug mode
        configContent = configContent.replace(
            /DEBUG_MODE:\s*\w+/,
            `DEBUG_MODE: ${config.debugMode}`
        );

        // Add build configuration
        configContent = configContent.replace(
            /};$/,
            `    
    // Build Configuration
    BUILD: {
        MODE: '${this.isDevelopment ? 'development' : this.isProduction ? 'production' : 'default'}',
        TIMESTAMP: '${new Date().toISOString()}',
        VERSION: '1.0.0',
        MINIFIED: ${config.minify},
        DEBUG_ENABLED: ${config.debugMode}
    }
};`
        );

        await fs.writeFile(configPath, configContent);
        console.log('⚙️ Processed configuration');
    }

    /**
     * Optimize files for production
     */
    async optimizeForProduction() {
        console.log('🔧 Optimizing for production...');

        // Remove debug code
        await this.removeDebugCode();

        // Minify CSS (basic)
        await this.minifyCSS();

        // Remove test files in production
        const testDir = path.join(this.distDir, 'test');
        try {
            await fs.rmdir(testDir, { recursive: true });
            console.log('🗑️ Removed test files from production build');
        } catch (error) {
            // Test directory might not exist
        }

        console.log('✅ Production optimization completed');
    }

    /**
     * Remove debug code from JavaScript files
     */
    async removeDebugCode() {
        const jsFiles = await this.findFiles(this.distDir, '.js');

        for (const filePath of jsFiles) {
            let content = await fs.readFile(filePath, 'utf8');

            // Remove console.debug calls
            content = content.replace(/console\.debug\([^)]*\);?\n?/g, '');

            // Remove debug-only code blocks
            content = content.replace(/\/\*\s*DEBUG_START\s*\*\/[\s\S]*?\/\*\s*DEBUG_END\s*\*\//g, '');

            // Remove single-line debug comments
            content = content.replace(/\/\/\s*DEBUG:.*\n/g, '');

            await fs.writeFile(filePath, content);
        }

        console.log(`🧹 Removed debug code from ${jsFiles.length} JavaScript files`);
    }

    /**
     * Basic CSS minification
     */
    async minifyCSS() {
        const cssFiles = await this.findFiles(this.distDir, '.css');

        for (const filePath of cssFiles) {
            let content = await fs.readFile(filePath, 'utf8');

            // Remove comments
            content = content.replace(/\/\*[\s\S]*?\*\//g, '');

            // Remove extra whitespace
            content = content.replace(/\s+/g, ' ');
            content = content.replace(/;\s*}/g, '}');
            content = content.replace(/\s*{\s*/g, '{');
            content = content.replace(/;\s*/g, ';');
            content = content.trim();

            await fs.writeFile(filePath, content);
        }

        console.log(`📦 Minified ${cssFiles.length} CSS files`);
    }

    /**
     * Find files with specific extension
     */
    async findFiles(dir, extension) {
        const files = [];

        async function scan(currentDir) {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);

                if (entry.isDirectory()) {
                    await scan(fullPath);
                } else if (entry.name.endsWith(extension)) {
                    files.push(fullPath);
                }
            }
        }

        await scan(dir);
        return files;
    }

    /**
     * Validate build output
     */
    async validateBuild() {
        console.log('🔍 Validating build...');

        const requiredFiles = [
            'manifest.json',
            'config.js',
            'background/service-worker.js',
            'popup/popup.html',
            'popup/popup.js',
            'popup/popup.css'
        ];

        const missingFiles = [];

        for (const file of requiredFiles) {
            const filePath = path.join(this.distDir, file);
            try {
                await fs.access(filePath);
            } catch (error) {
                missingFiles.push(file);
            }
        }

        if (missingFiles.length > 0) {
            throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
        }

        // Validate manifest
        const manifestPath = path.join(this.distDir, 'manifest.json');
        const manifestContent = await fs.readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestContent);

        if (!manifest.manifest_version || manifest.manifest_version !== 3) {
            throw new Error('Invalid manifest version');
        }

        console.log('✅ Build validation passed');
    }

    /**
     * Generate build report
     */
    async generateBuildReport() {
        const report = {
            buildTime: new Date().toISOString(),
            mode: this.isDevelopment ? 'development' : this.isProduction ? 'production' : 'default',
            sourceDirectory: this.sourceDir,
            outputDirectory: this.distDir,
            filesProcessed: 0,
            totalSize: 0,
            fileTypes: {}
        };

        // Count files and calculate sizes
        const files = await this.findFiles(this.distDir, '');

        for (const file of files) {
            const stat = await fs.stat(file);
            const ext = path.extname(file) || 'no-extension';

            report.filesProcessed++;
            report.totalSize += stat.size;

            if (!report.fileTypes[ext]) {
                report.fileTypes[ext] = { count: 0, size: 0 };
            }

            report.fileTypes[ext].count++;
            report.fileTypes[ext].size += stat.size;
        }

        // Format sizes
        report.totalSizeFormatted = this.formatBytes(report.totalSize);
        Object.keys(report.fileTypes).forEach(ext => {
            report.fileTypes[ext].sizeFormatted = this.formatBytes(report.fileTypes[ext].size);
        });

        // Save report
        const reportPath = path.join(this.distDir, 'build-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        // Display summary
        console.log('\n📊 Build Report:');
        console.log(`   Files processed: ${report.filesProcessed}`);
        console.log(`   Total size: ${report.totalSizeFormatted}`);
        console.log(`   Build mode: ${report.mode}`);
        console.log(`   Output: ${report.outputDirectory}`);
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
}

// Run build if called directly
if (require.main === module) {
    const builder = new ExtensionBuilder();
    builder.build().catch(error => {
        console.error('Build failed:', error);
        process.exit(1);
    });
}

module.exports = ExtensionBuilder;