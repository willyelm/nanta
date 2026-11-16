import type { Sky } from "position";
import { useEffect, useEffectEvent, useRef } from "react";

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
	// Which site→body sight lines to draw (Look for checkboxes). Default both when unset.
	sunlight?: boolean;
	earth_visibility?: boolean;
	// Set while a site is being placed: a click on the body reports its latitude and longitude.
	onPick?: (lat: number, lon: number) => void;
};

// The view, and how the scene applies it: the scene sets apply while it's mounted.
export const store: { view: View; apply?: (view: View) => void } = { view: {} };

// Sets these parts of the view while mounted, and clears them on unmount. Updates merge in place
// so a dragged time slider does not clear then re-apply. onPick is an effect event: the scene
// keeps one stable callback and always sees the latest handler.
export function useView({
	body,
	lat,
	lon,
	sky,
	at,
	time,
	caption,
	sunlight,
	earth_visibility,
	onPick,
}: View) {
	const owned = useRef<(keyof View)[]>([]);
	const picking = onPick != null;
	const pick = useEffectEvent((la: number, lo: number) => {
		onPick?.(la, lo);
	});

	useEffect(() => {
		const next: View = {};
		if (body !== undefined) next.body = body;
		if (lat !== undefined) next.lat = lat;
		if (lon !== undefined) next.lon = lon;
		if (sky !== undefined) next.sky = sky;
		if (at !== undefined) next.at = at;
		if (time !== undefined) next.time = time;
		if (caption !== undefined) next.caption = caption;
		if (sunlight !== undefined) next.sunlight = sunlight;
		if (earth_visibility !== undefined) next.earth_visibility = earth_visibility;
		if (picking) next.onPick = pick;

		const view = { ...store.view };
		for (const key of owned.current) {
			if (!(key in next)) delete view[key];
		}
		Object.assign(view, next);
		owned.current = Object.keys(next) as (keyof View)[];
		store.view = view;
		store.apply?.(view);
	}, [body, lat, lon, sky, at, time, caption, sunlight, earth_visibility, picking]);

	useEffect(() => {
		return () => {
			const view = { ...store.view };
			for (const key of owned.current) delete view[key];
			owned.current = [];
			store.view = view;
			store.apply?.(view);
		};
	}, []);
}
