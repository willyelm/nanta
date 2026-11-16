// The Worker: the API modules, then every other path renders the interface. <head> is server-only:
// import map, style, and the script that hydrates <body> once the page's data has streamed in.
// Static files in dist/public are served before this runs (wrangler.toml [assets]).

import body from "body";
import imagery from "imagery";
import { routes } from "interface";
import { schemeBoot } from "interface/scheme";
import { densityBoot } from "interface/scheme/density";
import position from "position";
import { renderToReadableStream } from "react-dom/server.browser";
import site from "site";
import { get, log, match, Router, router, since } from "system";
import window from "window";
import { splash } from "./scripts/splash.ts";

// Runs when the Worker loads: at dev startup and reloads, and once per production instance.
splash("server", process.env.NODE_ENV === "production" ? "prod" : "dev");

const importMap = JSON.stringify({
	imports: {
		react: MANIFEST.runtime,
		"react/jsx-runtime": MANIFEST.runtime,
		"react-dom": MANIFEST.runtime,
		"react-dom/client": MANIFEST.runtime,
		system: MANIFEST.runtime,
		interface: MANIFEST.interface,
	},
});

const page = get("*", async (request) => {
	const start = performance.now();
	const { pathname } = new URL(request.url);
	const stream = await renderToReadableStream(
		<html lang="en" data-scheme="light" data-density="regular">
			<head>
				<script>{schemeBoot}</script>
				<script>{densityBoot}</script>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="description" content="Plan locations against changing conditions." />
				<meta name="author" content="Will Medina" />
				<link rel="author" href="https://willmedina.com" />
				<meta property="og:type" content="website" />
				<meta property="og:site_name" content="Nanta" />
				<meta property="og:title" content="Nanta: Choose the path under the Sun and the Earth" />
				<meta property="og:description" content="Plan locations against changing conditions." />
				<meta property="og:url" content="https://nanta.us/" />
				<meta property="og:image" content="https://nanta.us/favicon.png" />
				<meta name="twitter:card" content="summary" />
				<link rel="icon" href="/favicon.png" type="image/png" />
				<script type="importmap">{importMap}</script>
				<link rel="stylesheet" href={MANIFEST.style} />
				<script type="module">
					{`import { hydrate } from "system";
					import { routes } from "interface";
					hydrate(routes);`}
				</script>
			</head>
			<body>
				<Router routes={routes} url={request.url} />
			</body>
		</html>,
	);

	const found = match(routes, pathname);
	const status = found?.notFound ? 404 : 200;
	// The shell is the first paint; all ready is once every streamed data load has finished.
	log("render", pathname, status, "shell", since(start));
	stream.allReady.then(
		() => log("render", pathname, status, "all ready", since(start)),
		(error: unknown) => log.error("render", pathname, "failed", since(start), error),
	);
	return new Response(stream, {
		status,
		headers: { "content-type": "text/html; charset=utf-8" },
	});
});

export default router(body, imagery, position, site, window, [page]);
