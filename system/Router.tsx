import {
	type ComponentType,
	createContext,
	Suspense,
	use,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
	useTransition,
} from "react";
import { hydrateRoot } from "react-dom/client";
import { browser, type Data, DataContext, DataScript, whenResumed } from "./resumable.tsx";
import { app } from "./router.ts";

export type Routes = Record<string, ComponentType>;
export type Params = Record<string, string>;

// Patterns match in order: literal segments, `:name` params, and "*" (keep it last).
export function match(routes: Routes, pathname: string) {
	for (const [pattern, Page] of Object.entries(routes)) {
		const params = test(pattern, pathname);
		if (params) return { pattern, Page, params };
	}
	return null;
}

function test(pattern: string, pathname: string): Params | null {
	if (pattern === "*") return {};
	const parts = pattern.split("/").filter(Boolean);
	const segments = pathname.split("/").filter(Boolean);
	if (parts.length !== segments.length) return null;
	const params: Params = {};
	for (let i = 0; i < parts.length; i++) {
		if (parts[i].startsWith(":")) {
			params[parts[i].slice(1)] = decodeURIComponent(segments[i]);
		} else if (parts[i] !== segments[i]) {
			return null;
		}
	}
	return params;
}

// Router

type RouterState = { url: URL; params: Params; pending: boolean };
const RouterContext = createContext<RouterState | null>(null);

// Renders the page matching `url`, then streams the data its loads produced. On the server, each
// render gets its own cache, and loads call the app's handler in process; in the browser,
// hydrate() renders it with location.href and the session's cache.
export function Router({ routes, url }: { routes: Routes; url: string }) {
	const [data] = useState<Data>(() =>
		typeof document === "undefined"
			? { api: (path) => local(path, url), cache: new Map() }
			: browser,
	);
	const [href, setHref] = useState(url);
	const [pending, startNavigation] = useTransition();
	const committed = useRef<(() => void) | null>(null);

	// Navigation finishes after commit, so the browser restores scroll and focus on the new page.
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs once per committed navigation
	useEffect(() => {
		committed.current?.();
		committed.current = null;
	}, [href]);

	const onNavigate = useEffectEvent((event: NavigateEvent) => {
		const to = new URL(event.destination.url);
		if (!event.canIntercept || event.hashChange || event.formData) return;
		if (event.downloadRequest !== null || to.origin !== location.origin) return;
		// Paths only "*" matches go to the server: 404s, API links, files.
		if (match(routes, to.pathname)?.pattern === "*") return;
		event.intercept({
			handler: () =>
				new Promise<void>((resolve) => {
					committed.current = resolve;
					startNavigation(() => setHref(to.href));
				}),
		});
	});

	useEffect(() => {
		if (!("navigation" in window)) return;
		navigation.addEventListener("navigate", onNavigate);
		return () => navigation.removeEventListener("navigate", onNavigate);
	}, []);

	const current = new URL(href);
	const found = match(routes, current.pathname);
	if (!found) throw new Error(`no route matches ${current.pathname}`);
	const { Page, params } = found;
	return (
		<DataContext value={data}>
			<RouterContext value={{ url: current, params, pending }}>
				<Page />
			</RouterContext>
			{/* Streams last, once every load has settled. */}
			<Suspense fallback={null}>
				<DataScript data={data} />
			</Suspense>
		</DataContext>
	);
}

function useRouter() {
	const router = use(RouterContext);
	if (!router) throw new Error("use inside <Router>");
	return router;
}

export const useLocation = () => useRouter().url;
export const useParams = () => useRouter().params;
export const useSearchParams = () => useRouter().url.searchParams;
// True while the next page is loading. The current page stays on screen.
export const useNavigating = () => useRouter().pending;

// Navigate from code. Links and forms don't need it.
export function navigate(to: string) {
	if ("navigation" in window) navigation.navigate(to);
	else location.assign(to);
}

// Calls the app's handler for an API path, as if the request came from `url`.
async function local(path: string, url: string): Promise<Response> {
	if (!app) throw new Error("server rendering needs the app's router() to exist");
	return app.fetch(new Request(new URL(path, url)));
}

// Hydrates document.body once the page's data script has run; called from main.tsx's <head>.
export async function hydrate(routes: Routes) {
	await whenResumed;
	hydrateRoot(document.body, <Router routes={routes} url={location.href} />);
}
