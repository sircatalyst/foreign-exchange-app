import eslint from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
	{
		ignores: ["eslint.config.mjs", "dist/**", "node_modules/**"],
	},
	{
		files: ["src/**/*.ts", "test/**/*.ts"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: import.meta.dirname,
				ecmaVersion: "latest",
				sourceType: "module",
			},
			globals: {
				...globals.node,
				...globals.jest,
			},
		},
		plugins: {
			prettier: eslintPluginPrettier,
			"@typescript-eslint": tseslint,
		},
		rules: {
			...eslint.configs.recommended.rules,
			...tseslint.configs.recommended.rules,
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					vars: "all",
					varsIgnorePattern: "^_",
					args: "after-used",
					argsIgnorePattern: "^_",
				},
			],
			"prettier/prettier": ["error", {}, { usePrettierrc: true }],
			quotes: ["error", "double"],
			"no-unused-vars": "off",
		},
	},
	eslintPluginPrettierRecommended,
];
