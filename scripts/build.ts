// `node scripts/build.ts [build|dev]`. Three neutral builds: the runtime (React + system), the
// interface + style, and the Worker. Both apps import React from the runtime: one copy. Metafile
// names become MANIFEST; dev keeps plain names so watch rebuilds don't change it.

import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { relative } from "node:path";
import {
	analyzeMetafile,
	type BuildOptions,
	build,
	context,
	type Metafile,
	type Plugin,
} from "esbuild";
import { splash } from "./splash.ts";

const dist = "dist";
const statics = `${dist}/public/static`;

// Imports that resolve to the runtime: by import map in the browser (main.tsx), by path in main.js.
const runtime = ["react", "react/jsx-runtime", "react-dom", "react-dom/client", "system"];

const base: BuildOptions = {
	bundle: true,
	format: "esm",
	platform: "neutral",
	mainFields: ["module", "main"],
	conditions: ["worker", "browser"],
	target: "esnext",
	jsx: "automatic",
	logLevel: "error",
	metafile: true,
	loader: { ".woff2": "file", ".ttf": "file" },
};

const runtimeBuild: BuildOptions = {
	...base,
	entryPoints: { system: "system/index.ts" },
	outdir: statics,
};

const interfaceBuild: BuildOptions = {
	...base,
	entryPoints: { interface: "interface/index.tsx", style: "interface/style.css" },
	outdir: statics,
	external: runtime,
};

// The output file built from `entry`, as found in a metafile.
function output(meta: Metafile | undefined, entry: string): string {
	for (const [file, out] of Object.entries(meta?.outputs ?? {})) {
		if (out.entryPoint === entry) return file;
	}
	throw new Error(`no output for ${entry}`);
}

const url = (file: string) => `/${relative(`${dist}/public`, file)}`;
const fromMain = (file: string) => `./${relative(dist, file)}`;

// CSS imported from JS (CSS modules) is emitted next to that JS entry.
function cssBundle(meta: Metafile | undefined, entry: string): string {
	for (const out of Object.values(meta?.outputs ?? {})) {
		if (out.entryPoint === entry && out.cssBundle) return out.cssBundle;
	}
	throw new Error(`no css bundle for ${entry}`);
}

function serverBuild(runtimeMeta?: Metafile, interfaceMeta?: Metafile): BuildOptions {
	const system = fromMain(output(runtimeMeta, "system/index.ts"));
	const manifest = {
		runtime: url(output(runtimeMeta, "system/index.ts")),
		interface: url(output(interfaceMeta, "interface/index.tsx")),
		style: url(output(interfaceMeta, "interface/style.css")),
		modules: url(cssBundle(interfaceMeta, "interface/index.tsx")),
	};
	return {
		...base,
		entryPoints: { main: "main.tsx" },
		outdir: dist,
		define: { MANIFEST: JSON.stringify(manifest) },
		// react-dom/server (bundled here, server only) calls require("react"/"react-dom"):
		// answer with the runtime's copies, so the Worker has one React.
		banner: {
			js: `import * as __runtime from "${system}";
const require = (id) => {
	const module = { react: __runtime.React, "react-dom": __runtime.ReactDOM }[id];
	if (module) return module;
	throw new Error("main.js cannot require " + id);
};`,
		},
		plugins: [toRuntime(system)],
	};
}

// Imports of runtime names load the runtime file; require() calls go to the shim in the banner.
function toRuntime(path: string): Plugin {
	const names = runtime.map((n) => n.replace(/[/.]/g, "\\$&")).join("|");
	return {
		name: "runtime",
		setup(b) {
			b.onResolve({ filter: new RegExp(`^(${names})$`) }, (args) =>
				args.kind === "require-call"
					? { path: args.path, external: true }
					: { path, external: true },
			);
		},
	};
}

// React reads process.env.NODE_ENV, which the neutral platform doesn't set.
const defines = (env: "production" | "development") => ({
	"process.env.NODE_ENV": JSON.stringify(env),
});

async function production() {
	await rm(dist, { recursive: true, force: true });
	const define = defines("production");
	const hashed = { define, minify: true, entryNames: "[name]-[hash]" };
	const runtimeOut = await build({ ...runtimeBuild, ...hashed });
	const interfaceOut = await build({ ...interfaceBuild, ...hashed, sourcemap: "external" });
	const server = serverBuild(runtimeOut.metafile, interfaceOut.metafile);
	const serverOut = await build({
		...server,
		define: { ...define, ...server.define },
		minify: true,
	});
	// Each output file with its largest inputs, from the metafiles.
	for (const out of [runtimeOut, interfaceOut, serverOut]) {
		if (out.metafile) console.log(await analyzeMetafile(out.metafile));
	}
	console.log("[build] manifest", server.define?.MANIFEST);
}

async function dev() {
	const define = defines("development");
	const runtimeCtx = await context({ ...runtimeBuild, define });
	const interfaceCtx = await context({ ...interfaceBuild, define, sourcemap: "inline" });
	// Plain names in dev: the first build's manifest stays valid while watching.
	const runtimeOut = await runtimeCtx.rebuild();
	const interfaceOut = await interfaceCtx.rebuild();
	const server = serverBuild(runtimeOut.metafile, interfaceOut.metafile);
	const serverCtx = await context({
		...server,
		define: { ...define, ...server.define },
	});
	await Promise.all([runtimeCtx.watch(), interfaceCtx.watch(), serverCtx.watch()]);

	// Own process group, so stopping dev also stops workerd and esbuild services.
	const wrangler = spawn("npx", ["wrangler", "dev", "--port", "3000", "--live-reload"], {
		stdio: "inherit",
		detached: true,
	});
	const stop = async () => {
		if (wrangler.pid) {
			try {
				process.kill(-wrangler.pid, "SIGTERM");
			} catch {
				// Already gone.
			}
		}
		await Promise.all([runtimeCtx.dispose(), interfaceCtx.dispose(), serverCtx.dispose()]);
		process.exit(0);
	};
	process.on("SIGINT", stop);
	process.on("SIGTERM", stop);
	wrangler.on("exit", stop);
}

const modes: Record<string, () => Promise<void>> = { build: production, dev };
const run = modes[process.argv[2] ?? "build"];
if (!run) {
	console.error("usage: node scripts/build.ts [build|dev]");
	process.exit(1);
}
const command = process.argv[2] ?? "build";
splash("build", command === "build" ? "prod" : "dev");
run().catch((error: unknown) => {
	console.error("[build]", error);
	process.exit(1);
});
