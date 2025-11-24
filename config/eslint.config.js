import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import prettier from 'eslint-config-prettier'

export default [
    js.configs.recommended,
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        ignores: [
            '**/coverage/**',
            '**/dist/**',
            '**/node_modules/**',
            '**/.husky/**',
            '**/build/**',
        ],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
                // Removed project: './tsconfig.json' for faster linting
                // Use `npm run typecheck` for type checking
            },
            globals: {
                describe: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                vi: 'readonly',
                test: 'readonly',
                window: 'readonly',
                document: 'readonly',
                process: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                NodeJS: 'readonly',
                HTMLDivElement: 'readonly',
                HTMLInputElement: 'readonly',
                EventTarget: 'readonly',
                HTMLElement: 'readonly',
                Element: 'readonly',
                Node: 'readonly',
                KeyboardEvent: 'readonly',
                MouseEvent: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'readonly',
                require: 'readonly',
                exports: 'readonly',
                OscillatorNode: 'readonly',
                GainNode: 'readonly',
                AudioContext: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            react,
            'react-hooks': reactHooks,
            'jsx-a11y': jsxA11y,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            ...react.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            ...jsxA11y.configs.recommended.rules,
            // React-Three-Fiber uses lowercase intrinsic names for geometries/materials
            // which triggers `react/jsx-pascal-case`. Disable that rule project-wide
            // but only for our source files so real JSX components still follow PascalCase.
            'react/jsx-pascal-case': 'off',
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/no-unknown-property': [
                'error',
                {
                    ignore: [
                        'position',
                        'rotation',
                        'geometry',
                        'material',
                        'intensity',
                        'castShadow',
                        'shadow-mapSize-width',
                        'shadow-mapSize-height',
                        'args',
                        'transparent',
                        'receiveShadow',
                        'opacity',
                        'color',
                        'metalness',
                        'roughness',
                        'side',
                        'scale',
                    ],
                },
            ],
            'react-hooks/set-state-in-effect': 'off',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    prettier,
]
