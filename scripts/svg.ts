// esbuild plugin: an .svg file becomes a React component, `export default (props) => <svg {...props}>`.
// A plain function, so ref is a prop (React 19). Attributes become React's camelCase names, black
// (#000000, as icon exports write it) becomes currentColor, and icons are aria-hidden by default.
import { readFile } from "node:fs/promises";
import type { Plugin } from "esbuild";

// With `icon`, the svg gets the `icon` utility (style.css) and sizes to the text around it.
const size = ' className={[icon && "icon", className].filter(Boolean).join(" ") || undefined}';

// stroke-width to strokeWidth, xlink:href to xlinkHref; data-* and aria-* stay as they are.
const camel = (name: string) =>
	/^(data|aria)-/.test(name)
		? name
		: name.replace(/[-:]([a-z])/g, (_, c: string) => c.toUpperCase());

export function svgToJsx(source: string): string {
	const svg = source
		.replace(/<\?xml[^>]*>|<!--[\s\S]*?-->/g, "")
		.replace(/\s([a-z]+(?:[-:][a-z]+)+)=/g, (_, name: string) => ` ${camel(name)}=`)
		.replace(/\sclass=/g, " className=")
		.replace(/="#000000"/gi, '="currentColor"')
		.replace(
			/<svg([^>]*)>/,
			(_, attrs: string) =>
				`<svg${attrs}${attrs.includes("aria-") ? "" : ' aria-hidden="true"'} {...props}${size}>`,
		)
		.trim();
	return `export default ({ icon, className, ...props }) => (${svg});`;
}

export function svg(): Plugin {
	return {
		name: "svg",
		setup(build) {
			build.onLoad({ filter: /\.svg$/ }, async (args) => ({
				contents: svgToJsx(await readFile(args.path, "utf8")),
				loader: "jsx",
			}));
		},
	};
}
