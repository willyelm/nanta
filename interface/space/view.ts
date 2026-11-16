import type { Sky } from "position";
import { useEffect } from "react";

// What the model shows: the body by Horizons code, a site on it (degrees, east longitude), and
// the other bodies seen from that site over a window, at sample `at`.
export type View = {
	body?: string;
	lat?: number;
	lon?: number;
	sky?: Sky;
	at?: number;
	// A sentence about what the model shows, written over it: "Sun 0.8° below the horizon, …".
	caption?: string;
	// The moment the bodies are placed at, in ms; now when unset. A window sets it.
	time?: number;
	// Set while a site is being placed: a click on the body reports its latitude and longitude.
	onPick?: (lat: number, lon: number) => void;
};

// The view, and how the scene applies it: the scene sets apply while it's mounted.
export const store: { view: View; apply?: (view: View) => void } = { view: {} };

// Sets the given parts of the view while the calling component is mounted, and clears them after.
export function useView(part: View) {
	const { body, lat, lon, sky, at, time, caption, onPick } = part;
	useEffect(() => {
		const set = Object.entries({ body, lat, lon, sky, at, time, caption, onPick }).filter(
			([, v]) => v !== undefined,
		);
		store.view = { ...store.view, ...Object.fromEntries(set) };
		store.apply?.(store.view);
		return () => {
			const next = { ...store.view };
			for (const [key] of set) delete next[key as keyof View];
			store.view = next;
			store.apply?.(store.view);
		};
	}, [body, lat, lon, sky, at, time, caption, onPick]);
}
