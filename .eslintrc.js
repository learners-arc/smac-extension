module.exports = {
    env: {
        browser: true,
        es2021: true,
        webextensions: true,
        node: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module'
    },
    rules: {
        // Error prevention
        'no-unused-vars': ['error', {
            'argsIgnorePattern': '^_',
            'varsIgnorePattern': '^_'
        }],
        'no-undef': 'error',
        'no-console': ['warn', {
            allow: ['warn', 'error', 'info']
        }],

        // Best practices
        'prefer-const': 'error',
        'no-var': 'error',
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        'no-eval': 'error',
        'no-implied-eval': 'error',

        // Code style
        'indent': ['error', 4, {
            'SwitchCase': 1
        }],
        'quotes': ['error', 'single', {
            'avoidEscape': true
        }],
        'semi': ['error', 'always'],
        'comma-dangle': ['error', 'never'],
        'brace-style': ['error', '1tbs'],

        // ES6+ features
        'arrow-spacing': 'error',
        'template-curly-spacing': 'error',
        'object-shorthand': 'warn',
        'prefer-arrow-callback': 'warn',
        'prefer-template': 'warn',

        // Performance
        'no-loop-func': 'error',
        'no-inner-declarations': 'error',

        // Chrome Extension specific
        'no-global-assign': 'error',
        'no-implicit-globals': 'error'
    },
    globals: {
        // Chrome Extension APIs
        'chrome': 'readonly',

        // Browser globals
        'window': 'readonly',
        'document': 'readonly',
        'navigator': 'readonly',
        'console': 'readonly',
        'performance': 'readonly',

        // Extension specific globals
        'CONFIG': 'readonly'
    },
    overrides: [
        {
            // Configuration files
            files: ['*.config.js', 'config.js'],
            rules: {
                'no-console': 'off'
            }
        },
        {
            // Test files
            files: ['test/**/*.js'],
            rules: {
                'no-console': 'off',
                'no-unused-vars': 'off'
            }
        },
        {
            // Build scripts
            files: ['scripts/**/*.js'],
            env: {
                node: true
            },
            rules: {
                'no-console': 'off'
            }
        }
    ],
    ignorePatterns: [
        'node_modules/',
        'dist/',
        'packages/',
        'coverage/',
        '*.min.js'
    ]
};