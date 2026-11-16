// Loaded with --import before the tests: a jsdom window as globals, then hooks that pass every
// .ts and .tsx file through esbuild, and resolve extensionless imports and tsconfig aliases.
import { readFileSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { after, afterEach } from "node:test";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";
import { JSDOM } from "jsdom";
import { splash } from "./splash.ts";
import { svgToJsx } from "./svg.ts";

// Tests run in one process (--test-isolation=none), so this file and the splash load once.
splash("test", "dev");

// pretendToBeVisual gives jsdom's own requestAnimationFrame and cancelAnimationFrame.
const { window } = new JSDOM("<!doctype html><html><body></body></html>", {
	url: "http://localhost/",
	pretendToBeVisual: true,
});

// What jsdom lacks. matchMedia matches nothing, a light system; mock it in a test to change that.
const stubs = {
	matchMedia: (media: string) => ({
		media,
		matches: false,
		addEventListener() {},
		removeEventListener() {},
	}),
	ResizeObserver: class {
		observe() {}
		unobserve() {}
		disconnect() {}
	},
	scrollTo() {},
};
Object.assign(window, stubs);
// No canvas in jsdom: getContext returns null quietly instead of logging "not implemented".
window.HTMLCanvasElement.prototype.getContext = () => null;

// No Popover API in jsdom, and its stylesheet hides every [popover]. Show and hide with an inline
// display, and fire toggle with newState like browsers, so onToggle runs.
const open = new WeakSet<HTMLElement>();
function toggle(element: HTMLElement, show: boolean) {
	if (open.has(element) === show) return;
	if (show) open.add(element);
	else open.delete(element);
	element.style.display = show ? "block" : "";
	const event = Object.assign(new window.Event("toggle"), { newState: show ? "open" : "closed" });
	element.dispatchEvent(event);
}
Object.assign(window.HTMLElement.prototype, {
	showPopover(this: HTMLElement) {
		toggle(this, true);
	},
	hidePopover(this: HTMLElement) {
		toggle(this, false);
	},
	togglePopover(this: HTMLElement) {
		toggle(this, !open.has(this));
	},
});

Object.assign(globalThis, { window, IS_REACT_ACT_ENVIRONMENT: true });

// Every window property Node lacks becomes a global. Node has its own versions of these, but the
// DOM needs jsdom's: its events dispatch on its elements, and its storage is per window.
const own = ["navigator", "localStorage", "sessionStorage", "Event", "EventTarget", "CustomEvent"];
for (const key of Object.getOwnPropertyNames(window)) {
	if (key in globalThis && !own.includes(key)) continue;
	Object.defineProperty(globalThis, key, {
		configurable: true,
		get: () => window[key as keyof typeof window],
	});
}

afterEach(() => {
	document.body.replaceChildren();
	localStorage.clear();
	sessionStorage.clear();
});
after(() => window.close());

const root = new URL("../", import.meta.url);
const aliases = new Set(["system", "interface", "body", "imagery", "position", "site", "window"]);
const suffixes = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];
const isFile = (url: string) => statSync(fileURLToPath(url), { throwIfNoEntry: false })?.isFile();
const ours = (url?: string) => !!url?.startsWith(root.href) && !url.includes("/node_modules/");

registerHooks({
	resolve(specifier, context, next) {
		const alias = aliases.has(specifier.split("/")[0]);
		const base = alias
			? new URL(specifier, root).href
			: specifier.startsWith(".") && ours(context.parentURL)
				? new URL(specifier, context.parentURL).href
				: null;
		const url = base && suffixes.map((suffix) => base + suffix).find(isFile);
		return url ? { url, shortCircuit: true } : next(specifier, context);
	},
	load(url, context, next) {
		if (!ours(url)) return next(url, context);
		const svg = url.endsWith(".svg");
		const loader = svg ? "jsx" : url.endsWith(".tsx") ? "tsx" : url.endsWith(".ts") ? "ts" : null;
		if (!loader) return next(url, context);
		const source = readFileSync(fileURLToPath(url), "utf8");
		const { code } = transformSync(svg ? svgToJsx(source) : source, {
			loader,
			jsx: "automatic",
			format: "esm",
			// Coverage and stack traces point at the source lines, not esbuild's output.
			sourcemap: "inline",
			sourcefile: fileURLToPath(url),
		});
		return { format: "module", source: code, shortCircuit: true };
	},
});
