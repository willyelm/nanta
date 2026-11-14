import {
	Component,
	createContext,
	type ReactNode,
	startTransition,
	use,
	useEffect,
	useReducer,
} from "react";

export type Api = (path: string) => Promise<Response>;
export type Values = Record<string, unknown>;

// One loaded value: the promise use() reads, the last resolved value, and who to tell on change.
type Entry = { promise: Promise<unknown>; value?: unknown; listeners: Set<() => void> };

// Where loads run and live. The browser keeps one for the session; on the server, <Router> makes
// one per render, so data never crosses between requests.
export type Data = { api: Api; cache: Map<string, Entry> };
export const DataContext = createContext<Data | null>(null);

export const browser: Data = { api: (path) => fetch(path), cache: new Map() };

// What the server loaded, handed over by the data script <Router> streams after the page.
const resumed = Promise.withResolvers<Values>();
export let resumedValues: Values | undefined;
export const whenResumed = resumed.promise;

export function resumeData(values: Values) {
	for (const [key, value] of Object.entries(values)) {
		browser.cache.set(key, { promise: settled(value), value, listeners: new Set() });
	}
	resumedValues = values;
	resumed.resolve(values);
}

// Tells listeners in a transition, so suspending users keep their current value on screen.
function notify(found: Entry) {
	startTransition(() => {
		for (const listener of found.listeners) listener();
	});
}

// Points the entry at a new promise and notifies now (users suspend on it) and once it resolves
// (outside readers get the value). A newer promise makes an older one's result stale.
function track(found: Entry, promise: Promise<unknown>) {
	found.promise = promise;
	notify(found);
	promise.then(
		(value) => {
			if (found.promise !== promise) return;
			found.value = value;
			notify(found);
		},
		() => {},
	);
}

function entry(data: Data, key: string, load: () => Promise<unknown>): Entry {
	let found = data.cache.get(key);
	if (!found) {
		found = { promise: Promise.resolve(), listeners: new Set() };
		data.cache.set(key, found);
		track(found, load());
	}
	return found;
}

function keyOf(args: unknown[]): string {
	try {
		return JSON.stringify(args);
	} catch (reason) {
		throw new TypeError(`resumable arguments must be serializable: ${String(reason)}`);
	}
}

// Numbers resumable() calls in load order, which is the same on server and browser.
let stores = 0;

// Turns an async function into a hook and a store. Call it at the top level of a module: its order
// and the arguments key the data. The hook suspends inside <Suspense>; the store reads, listens,
// and updates from anywhere in the browser, and every change re-renders the hook's users.
export function resumable<Args extends unknown[], T>(fn: (api: Api, ...args: Args) => Promise<T>) {
	const id = stores++;
	const key = (args: Args) => `${id}:${keyOf(args)}`;
	const inBrowser = (args: Args) => entry(browser, key(args), () => fn(browser.api, ...args));

	// biome-ignore lint/correctness/noComponentHookFactories: built once per store at module load, never during render
	function useStore(...args: Args): T {
		const data = use(DataContext) ?? browser;
		const found = entry(data, key(args), () => fn(data.api, ...args));
		const [, rerender] = useReducer((n: number) => n + 1, 0);
		useEffect(() => {
			found.listeners.add(rerender);
			return () => {
				found.listeners.delete(rerender);
			};
		}, [found]);
		return use(found.promise as Promise<T>);
	}

	const store = {
		// The last loaded value, or undefined if it hasn't loaded yet. Never starts a load.
		get: (...args: Args) => browser.cache.get(key(args))?.value as T | undefined,
		// Starts the load if needed and returns it, for example to prefetch on hover.
		load: (...args: Args) => inBrowser(args).promise as Promise<T>,
		// Calls `listener` whenever the value changes or reloads; returns the unsubscribe function.
		subscribe(listener: () => void, ...args: Args): () => void {
			const found = inBrowser(args);
			found.listeners.add(listener);
			return () => {
				found.listeners.delete(listener);
			};
		},
		// Loads again; users keep showing the current value until the new one arrives.
		refresh(...args: Args): Promise<T> {
			const found = inBrowser(args);
			track(found, fn(browser.api, ...args));
			return found.promise as Promise<T>;
		},
		// Replaces the value, for example after a change the user made.
		set: (value: T, ...args: Args) => track(inBrowser(args), settled(value)),
	};
	return [store, useStore] as const;
}

// Reads a JSON API response, rejecting with the API's error message.
export async function json<T>(response: Promise<Response>): Promise<T> {
	const r = await response;
	const body = await r.json();
	if (!r.ok) throw new Error(body.error ?? r.statusText);
	return body;
}

// Waits until nothing in a render's cache is pending, yielding a task each round so newly resolved
// boundaries can render and start loads of their own. Then collects the values.
async function settle({ cache }: Data): Promise<Values> {
	for (let size = -1; size !== cache.size; ) {
		size = cache.size;
		await Promise.allSettled([...cache.values()].map((found) => found.promise));
		await new Promise((resume) => setTimeout(resume, 0));
	}
	const values: Values = {};
	for (const [key, found] of cache) {
		await found.promise.then(
			(value) => {
				values[key] = value;
			},
			() => {},
		);
	}
	return values;
}

const settling = new WeakMap<Data, Promise<Values>>();

// The page's data as a module script calling resumeData(), once every load has settled. The
// browser renders the same markup, so hydration matches; React never runs scripts it renders.
export function DataScript({ data }: { data: Data }) {
	let values = resumedValues;
	if (data !== browser) {
		let pending = settling.get(data);
		if (!pending) {
			pending = settle(data);
			settling.set(data, pending);
		}
		values = use(pending);
	}
	// Escapes `<` so the data can't close the script tag.
	const json = JSON.stringify(values ?? {}).replace(/</g, "\\u003c");
	return <script type="module">{`import{resumeData}from"system";resumeData(${json})`}</script>;
}

// A promise use() can read without suspending.
function settled<T>(value: T): Promise<T> {
	return Object.assign(Promise.resolve(value), {
		status: "fulfilled" as const,
		value,
	});
}

// Shows `fallback` when anything inside fails to render, such as data that failed to load.
export class Catch extends Component<
	{ fallback: ReactNode; children: ReactNode },
	{ failed: boolean }
> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	render() {
		return this.state.failed ? this.props.fallback : this.props.children;
	}
}
