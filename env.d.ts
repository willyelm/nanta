// Built file URLs from esbuild's metafile, defined in the server build (scripts/build.ts).
declare const MANIFEST: { runtime: string; interface: string; style: string; modules: string };

declare module "*.module.css" {
	const classes: { readonly [key: string]: string };
	export default classes;
}
