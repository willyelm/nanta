// The Worker: the API modules, then every other path renders the interface. <head> is server-only:
// import map, style, and the script that hydrates <body> once the page's data has streamed in.
// Static files in dist/public are served before this runs (wrangler.toml [assets]).

import { routes } from "interface";
import position from "position";
import { renderToReadableStream } from "react-dom/server.browser";
import site from "site";
import { get, match, Router, router } from "system";

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
	const stream = await renderToReadableStream(
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>Vantage</title>
				<meta name="description" content="Plan locations against changing conditions." />
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

	const found = match(routes, new URL(request.url).pathname);
	return new Response(stream, {
		status: found?.pattern === "*" ? 404 : 200,
		headers: { "content-type": "text/html; charset=utf-8" },
	});
});

export default router(position, site, [page]);
