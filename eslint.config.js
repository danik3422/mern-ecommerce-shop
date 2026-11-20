import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default [
	{ ignores: ['**/dist', '**/coverage', '**/node_modules'] },
	js.configs.recommended,
	{
		rules: {
			'no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
			eqeqeq: ['error', 'always', { null: 'ignore' }],
			'prefer-const': 'error',
		},
	},
	{
		files: ['*.js', 'server/**/*.js', 'client/vite.config.js'],
		languageOptions: { globals: globals.node },
	},
	{
		files: ['client/**/*.{js,jsx}'],
		languageOptions: {
			globals: globals.browser,
			parserOptions: { ecmaFeatures: { jsx: true } },
		},
		plugins: { 'react-refresh': reactRefresh.default ?? reactRefresh },
		rules: {
			'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
		},
	},
	{
		files: ['client/**/*.{js,jsx}'],
		...reactHooks.configs.flat['recommended-latest'],
	},
	{
		files: ['**/*.test.{js,jsx}', 'client/src/test/**'],
		languageOptions: { globals: { ...globals.node, ...globals.vitest } },
	},
]
