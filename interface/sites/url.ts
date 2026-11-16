import { useEffect, useRef, useState } from "react";
import { replace, useSearchParams } from "system";

// Camera pose abbreviations in the URL: az, el, d.
const CAMERA = ["az", "el", "d"] as const;
const CAMERA_ALIASES: Record<(typeof CAMERA)[number], string[]> = {
	az: ["az", "azimuth"],
	el: ["el", "elevation"],
	d: ["d", "distance"],
};

function liveCamera(live: URLSearchParams, key: (typeof CAMERA)[number]) {
	for (const name of CAMERA_ALIASES[key]) {
		const value = live.get(name);
		if (value) return value;
	}
	return null;
}

export type KeepChange = {
	window?: string | null;
	time?: string | null;
	az?: string | null;
	el?: string | null;
	d?: string | null;
};

// A path with the window, time, and camera kept from the URL, so they survive every move: a
// site, editing it, back, saving. `change` sets one, or drops it with null. Camera angles prefer
// `live` (usually `location.search`, which the scene writes with history.replaceState).
export function keepHref(
	path: string,
	change: KeepChange = {},
	live: URLSearchParams = new URLSearchParams(),
	fallback: URLSearchParams = live,
) {
	const query = new URLSearchParams();
	const window = change.window === undefined ? fallback.get("window") : change.window;
	const time = change.time === undefined ? fallback.get("time") : change.time;
	if (window) query.set("window", window);
	if (time) query.set("time", time);
	for (const key of CAMERA) {
		const value = change[key] === undefined ? liveCamera(live, key) : change[key];
		if (value) query.set(key, value);
	}
	const text = query.toString();
	return text ? `${path}?${text}` : path;
}

// On the client, camera angles come from `location.search`; on the server, from the router's
// search params.
export function useKeep() {
	const params = useSearchParams();
	return (path: string, change: KeepChange = {}) => {
		const live = typeof location !== "undefined" ? new URLSearchParams(location.search) : params;
		return keepHref(path, change, live, params);
	};
}

// One pending replace while a slider or chart is dragged. The last href wins.
let pending: string | null = null;
let timer = 0;

function later(href: string, ms = 120) {
	pending = href;
	if (timer) clearTimeout(timer);
	timer = window.setTimeout(() => {
		timer = 0;
		const next = pending;
		pending = null;
		if (next) replace(next);
	}, ms);
}

// Hold an href for flush without scheduling a replace (keeps focus during keyboard scrub).
function queue(href: string) {
	pending = href;
	if (timer) clearTimeout(timer);
	timer = 0;
}

function flush() {
	if (!pending && !timer) return;
	if (timer) clearTimeout(timer);
	timer = 0;
	const next = pending;
	pending = null;
	if (next) replace(next);
}

function cancel() {
	if (timer) clearTimeout(timer);
	timer = 0;
	pending = null;
}

// Local time index that follows the pointer; the URL catches up on release. Back/forward still
// come from `fromUrl` when you are not dragging. While dragging, do not replace the URL until
// end — a mid-scrub replace steals focus and breaks arrow keys.
export function useTimeScrub(fromUrl: number, href: (at: number) => string) {
	const [at, setAt] = useState(fromUrl);
	const dragging = useRef(false);

	useEffect(() => {
		if (dragging.current) return;
		cancel();
		setAt(fromUrl);
	}, [fromUrl]);

	return {
		at,
		setTime(index: number) {
			setAt(index);
			const next = href(index);
			if (dragging.current) queue(next);
			else later(next);
		},
		onDragStart() {
			dragging.current = true;
		},
		onDragEnd() {
			dragging.current = false;
			flush();
		},
	};
}

// Exported for tests of the coalesce behaviour.
export const replaceLater = later;
export const flushReplace = flush;
export const cancelReplace = cancel;
