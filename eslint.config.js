import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import {
  layoutRules,
  pageLayoutVariantRules,
} from './eslint-architecture-rules.js';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'build/**',
      '.env*',
      'public/**',
      'drizzle/**',
      'supabase/**',
      '_Initiation/**',
      '_reference/**',
      '**/*.config.js',
      '**/*.config.ts',
      '**/routeTree.gen.ts'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        NodeJS: 'readonly',
        // React globals (for JSX transform)
        React: 'readonly',
        // Browser/DOM globals
        window: 'readonly',
        document: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLAnchorElement: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLOptionElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        FocusEvent: 'readonly',
        MediaQueryListEvent: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        MutationObserver: 'readonly',
        PerformanceObserver: 'readonly',
        // Common Web APIs (Node 18+ has fetch/Request/Response)
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        // Node.js crypto (global in Node 19+)
        crypto: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        ArrayBuffer: 'readonly',
        Uint8Array: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        history: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        // Browser dialogs and APIs
        prompt: 'readonly',
        confirm: 'readonly',
        MediaRecorder: 'readonly',
        // DOM types
        Node: 'readonly',
        HTMLImageElement: 'readonly',
        HTMLSpanElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        Window: 'readonly',
        Image: 'readonly',
        FileList: 'readonly',
        // Fetch API (Node 18+)
        AbortSignal: 'readonly',
        Headers: 'readonly',
        // Performance API (browser, Node)
        performance: 'readonly',
        // Encoding APIs (browser, Node 11+)
        atob: 'readonly',
        btoa: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
        // Streams (browser, Node 18+)
        ReadableStream: 'readonly',
        // File API (browser)
        FileReader: 'readonly',
        // XHR and AbortController (browser, Node 18+)
        XMLHttpRequest: 'readonly',
        AbortController: 'readonly',
        // Storage API events
        StorageEvent: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...reactRefreshPlugin.configs.recommended.rules,

      // Customize rules as needed
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/prop-types': 'off', // Using TypeScript for prop validation
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  // UI/UX Layout Rules
  layoutRules,
  pageLayoutVariantRules,
  // Server files export server functions and constants, not React components
  {
    files: ['src/server/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
];