import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

const eslintConfig = [
	{
		ignores: [
			".now/*",
			"**/*.css",
			".changeset/**",
			"dist/**",
			"esm/**",
			"public/**",
			"tests/**",
			"scripts/**",
			"**/*.config.js",
			".DS_Store",
			"node_modules/**",
			"coverage/**",
			".next/**",
			"build/**",
			// Exceptions (files to include)
			"!.commitlintrc.cjs",
			"!.lintstagedrc.cjs",
			"!jest.config.js",
			"!plopfile.js",
			"!react-shim.js",
			"!tsup.config.ts",
		],
	},
	...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
