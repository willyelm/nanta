// esbuild plugin: interface/style.css through Tailwind (PostCSS). Tailwind scans the source for
// class names on every build and rebuild.
import { readFile } from "node:fs/promises";
import tailwindcss from "@tailwindcss/postcss";
import type { Plugin } from "esbuild";
import postcss from "postcss";

export function tailwind(): Plugin {
	return {
		name: "tailwind",
		setup(build) {
			build.onLoad({ filter: /interface[/\\]style\.css$/ }, async (args) => {
				const source = await readFile(args.path, "utf8");
				const { css } = await postcss([tailwindcss()]).process(source, { from: args.path });
				return { contents: css, loader: "css", watchDirs: ["interface"] };
			});
		},
	};
}
