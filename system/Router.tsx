import {
	type ComponentType,
	createContext,
	type ReactNode,
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

export type Params = Record<string, string>;

export type RouteNode = {
	path: string;
	index?: ComponentType<{ children?: ReactNode }>;
	notFound?: ComponentType<{ children?: ReactNode }>;
	children?: RouteNode[];
};

export function route(path: string, spec: Omit<RouteNode, "path"> = {}): RouteNode {
	return { path, ...spec };
}

type Part = { text?: string; param?: string };
type Page = ComponentType<{ children?: ReactNode }>;
type Leaf = { parts: Part[]; chain: Page[] };

export type Routes = { table: Map<string, Leaf>; notFound?: { chain: Page[] } };

const partsOf = (path: string): Part[] =>
	path
		.split("/")
		.filter(Boolean)
		.map((segment) => (/^\{(.+)\}$/.exec(segment) ? { param: segment.slice(1, -1) } : { text: segment }));

// `/{code}/sites` is `2|1=sites`. A URL probes the same shape, static bits first.
const key = (parts: Part[]) =>
	parts.reduce((id, part, i) => (part.text !== undefined ? `${id}|${i}=${part.text}` : id), String(parts.length));

// Flatten once, at startup. More static keys are longer, so they win a shared slot.
export function define(nodes: RouteNode[]): Routes {
	const leaves: Leaf[] = [];
	let notFound: Routes["notFound"];
	const walk = (node: RouteNode, parts: Part[], chain: Page[]) => {
		const next = parts.concat(partsOf(node.path));
		const frame = node.index ? chain.concat(node.index) : chain;
		if (node.notFound) notFound = { chain: frame.concat(node.notFound) };
		if (node.children) for (const child of node.children) walk(child, next, frame);
		else if (node.index) leaves.push({ parts: next, chain: frame });
	};
	for (const node of nodes) walk(node, [], []);
	leaves.sort((a, b) => key(b.parts).length - key(a.parts).length);
	const table = new Map<string, Leaf>();
	for (const leaf of leaves) if (!table.has(key(leaf.parts))) table.set(key(leaf.parts), leaf);
	return { table, notFound };
}

export function match(routes: Routes, pathname: string) {
	const segments = pathname.split("/").filter(Boolean);
	for (let mask = (1 << segments.length) - 1; mask >= 0; mask--) {
		const leaf = routes.table.get(
			segments.reduce((id, segment, i) => (mask & (1 << i) ? `${id}|${i}=${segment}` : id), String(segments.length)),
		);
		if (!leaf) continue;
		const params: Params = {};
		for (const [i, part] of leaf.parts.entries()) if (part.param) params[part.param] = decodeURIComponent(segments[i]);
		return { params, chain: leaf.chain, notFound: false as const };
	}
	return routes.notFound ? { params: {}, chain: routes.notFound.chain, notFound: true as const } : null;
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
		// Unmatched paths go to the server: 404s, API links, files.
		if (match(routes, to.pathname)?.notFound !== false) return;
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
	return (
		<DataContext value={data}>
			<RouterContext value={{ url: current, params: found.params, pending }}>
				<Nest chain={found.chain} />
			</RouterContext>
			{/* Streams last, once every load has settled. */}
			<Suspense fallback={null}>
				<DataScript data={data} />
			</Suspense>
		</DataContext>
	);
}

function Nest({ chain }: { chain: Page[] }) {
	return <Level chain={chain} at={0} />;
}

function Level({ chain, at }: { chain: Page[]; at: number }) {
	const Page = chain[at];
	if (at + 1 >= chain.length) return <Page />;
	return (
		<Page>
			<Level chain={chain} at={at + 1} />
		</Page>
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
