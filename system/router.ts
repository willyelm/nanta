// Request router on web standards: modules export routes, main.tsx assembles them, and routes
// match in order with URLPattern paths. Runs on Workers, Deno, and Bun; Node needs an adapter.

export type RequestParams = Record<string, string | undefined>;

export type Handler = (request: Request, params: RequestParams) => Response | Promise<Response>;

export type Route = [method: string, pattern: URLPattern, handler: Handler];

const route =
	(method: string) =>
	(pathname: string, handler: Handler): Route => [
		method,
		new URLPattern({ pathname }), // compiled once, at startup
		handler,
	];

export const get = route("GET");
export const post = route("POST");
export const put = route("PUT");
export const del = route("DELETE");

export type App = { fetch(request: Request): Response | Promise<Response> };

// The app's handler: the last router() built, main.tsx's. Set once at startup, so it's safe to
// share across requests; <Router> calls it to load data in process during server rendering.
export let app: App | undefined;

export function router(...modules: Route[][]): App {
	const routes = modules.flat();
	app = {
		fetch(request) {
			for (const [method, pattern, handler] of routes) {
				if (method !== request.method) continue; // cheap check first
				const match = pattern.exec(request.url);
				if (match) return handler(request, match.pathname.groups);
			}
			return Response.json({ error: "not found" }, { status: 404 });
		},
	};
	return app;
}
