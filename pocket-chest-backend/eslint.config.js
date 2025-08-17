import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
	js.configs.recommended,
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: typescriptParser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
			globals: {
				console: 'readonly',
				fetch: 'readonly',
				Request: 'readonly',
				Response: 'readonly',
				Headers: 'readonly',
				URL: 'readonly',
				URLSearchParams: 'readonly',
				FormData: 'readonly',
				crypto: 'readonly',
				TextEncoder: 'readonly',
				TextDecoder: 'readonly',
			},
		},
		plugins: {
			'@typescript-eslint': typescript,
		},
		rules: {
			...typescript.configs.recommended.rules,
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					ignoreRestSiblings: true,
					caughtErrors: 'none',
				},
			],
			'@typescript-eslint/no-explicit-any': 'off', // Allow any in tests
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-non-null-assertion': 'warn',
			'@typescript-eslint/no-empty-object-type': 'off',
			'prefer-const': 'error',
			'no-var': 'error',
			'no-console': 'off',
			'no-undef': 'off',
			'no-useless-escape': 'off', // Allow escaped slashes in regex
		},
	},
	{
		ignores: [
			'node_modules/',
			'dist/',
			'coverage/',
			'.wrangler/',
			'scripts/',
			'worker-configuration.d.ts', // Generated file
			'eslint.config.js', // Config file itself
		],
	},
];
