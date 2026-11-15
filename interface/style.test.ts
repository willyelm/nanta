// Contrast of the theme colors in style.css, both schemes, against every neutral step, as tables.
// Text: 6:1, NASA-STD-3001 Vol. 2 for text an operator reads (also WCAG 2.2 1.4.3, 4.5:1).
// Control and input borders, and chart lines: 3:1, WCAG 2.2 1.4.11. Dividers are decorative, so unchecked.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("./style.css", import.meta.url), "utf8");

const bg = ["neutral", "neutralHover", "neutralActive"];
const text = ["default", "secondary"];
const cue = ["control", "input"];
const chart = ["sun", "earth", "horizon", "select"];

// The theme's tokens for a scheme, without the dashes: `@theme static { ... }` holds the light
// values, and `[data-scheme="dark"] { ... }` overrides the colors that change.
function scheme(name: string): Map<string, string> {
	const theme = css.match(/@theme static\s*{([^}]*)}/)?.[1];
	assert.ok(theme, "no @theme static block in style.css");
	const dark = css.match(/\[data-scheme="dark"\]\s*{([^}]*)}/)?.[1];
	assert.ok(dark, "no dark scheme in style.css");
	const declarations = (name === "dark" ? theme + dark : theme).matchAll(/--([\w-]+):\s*([^;]+);/g);
	const tokens = new Map([...declarations].map(([, k, v]) => [k, v.trim()]));
	// Role tokens can point at another token: var(--name) resolves to that token's color.
	const resolve = (value: string): string => {
		const name = value.match(/^var\(--([\w-]+)\)$/)?.[1];
		return name ? resolve(tokens.get(name) ?? value) : value;
	};
	return new Map([...tokens].map(([k, v]) => [k, resolve(v)]));
}

// #rrggbb to linear sRGB (the sRGB transfer function, inverted).
function hex(color: string): number[] {
	return [1, 3, 5]
		.map((i) => Number.parseInt(color.slice(i, i + 2), 16) / 255)
		.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
}

// oklch(L% C H) to linear sRGB, clamped to the gamut (Björn Ottosson's OKLab matrices).
function linear(color: string): number[] {
	if (/^#[\da-f]{6}$/i.test(color)) return hex(color);
	const match = color.match(/^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)$/);
	assert.ok(match, `${color} is not oklch(L% C H)`);
	const [l, c, h] = [Number(match[1]) / 100, Number(match[2]), (Number(match[3]) * Math.PI) / 180];
	const [a, b] = [c * Math.cos(h), c * Math.sin(h)];
	const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
		-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
		-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
	].map((v) => Math.min(1, Math.max(0, v)));
}

// WCAG 2.2 relative luminance and contrast ratio.
function luminance(color: string): number {
	const [r, g, b] = linear(color);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
	const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (light + 0.05) / (dark + 0.05);
}

// Every combination of `names` (tokens `<group>-<name>`) and bg, as table rows. Rows and
// columns follow the order of `by`: bg then names, or names then bg.
function combinations(
	tokens: Map<string, string>,
	group: string,
	label: string,
	names: string[],
	by: "bg" | "names",
) {
	const pairs =
		by === "bg"
			? bg.flatMap((back) => names.map((name) => [back, name]))
			: names.flatMap((name) => bg.map((back) => [back, name]));
	return pairs.map(([back, name]) => {
		const fg = tokens.get(`${group}-${name}`);
		const bgColor = tokens.get(`background-color-${back}`);
		assert.ok(fg && bgColor, `missing ${group}-${name} or background-color-${back}`);
		const columns: [string, string][] = [
			["bg", back],
			[label, name],
		];
		if (by === "names") columns.reverse();
		return { ...Object.fromEntries(columns), ratio: contrast(fg, bgColor) };
	});
}

// Prints the rows under a heading, then fails on any below the minimum.
function check(
	title: string,
	rows: ({ ratio: number } & Record<string, string | number>)[],
	minimum: number,
) {
	const table = rows.map((row) => ({
		...row,
		ratio: Number(row.ratio.toFixed(2)),
		pass: row.ratio >= minimum ? "✓" : "✗",
	}));
	console.log(`\n${title}, at least ${minimum}:1`);
	console.table(table);
	assert.deepEqual(
		table.filter((row) => row.pass === "✗"),
		[],
		`below ${minimum}:1`,
	);
}

for (const name of ["light", "dark"]) {
	const tokens = scheme(name);
	test(`${name}: text on bg is at least 6:1`, () => {
		check(`${name}: text on bg`, combinations(tokens, "text-color", "text", text, "bg"), 6);
	});
	test(`${name}: cues on bg are at least 3:1`, () => {
		check(`${name}: cues on bg`, combinations(tokens, "border-color", "cue", cue, "names"), 3);
	});
	test(`${name}: focus outline on bg is at least 3:1`, () => {
		check(
			`${name}: focus on bg`,
			combinations(tokens, "outline-color", "focus", ["focus"], "names"),
			3,
		);
	});
	test(`${name}: chart lines on bg are at least 3:1`, () => {
		check(`${name}: chart on bg`, combinations(tokens, "chart-color", "chart", chart, "names"), 3);
	});
}
