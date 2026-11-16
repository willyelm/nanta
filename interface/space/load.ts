import type { Body as Entry } from "body";
import type { State } from "position";
import { codes, names } from "./geometry";

export type Star = { name: string; ra: number; dec: number; magnitude: number; radiance: number };

export async function fetchStars(): Promise<Star[]> {
	const response = await fetch("/api/bodies");
	if (!response.ok) return [];
	const list = (await response.json()) as Entry[];
	const stars: Star[] = [];
	for (const star of list) {
		const { ra, dec, magnitude } = star;
		if (ra === undefined || dec === undefined || magnitude === undefined) continue;
		stars.push({ name: star.name, ra, dec, magnitude, radiance: star.radiance ?? 2 });
	}
	return stars;
}

const CODES = ["399", "301", "499", "199"];

// One day's Horizons states, by body code.
export type States = Record<string, State>;

// Queued Horizons fetches for Earth, Moon, Mars, Mercury at a day. Calls `on` once all have loaded.
export function horizons(say: (text: string) => void, on: () => void) {
	const days = new Map<string, States>();
	const ready = new Set<string>();
	let queue = Promise.resolve();
	let stopped = false;
	const load = (day: string) => {
		if (days.has(day)) return;
		const states: States = {};
		days.set(day, states);
		queue = queue.then(async () => {
			for (const code of CODES) {
				const name = names[codes[code]];
				say(`Loading Horizons state for ${day.replace("T", " ")}: ${name} (${code})…`);
				const response = await fetch(`/api/space?time=${day}&body=${code}`).catch(() => null);
				if (stopped) return;
				if (!response?.ok) return say(`Couldn't load ${name}.`);
				states[code] = (await response.json()) as State;
			}
			// Ready only now, so the redraw places every body at once.
			ready.add(day);
			say("");
			on();
		});
	};
	return {
		stop() {
			stopped = true;
		},
		// The day's states once every body has loaded.
		statesFor(time?: number) {
			const day = `${new Date(time ?? Date.now()).toISOString().slice(0, 10)}T00:00`;
			load(day);
			return ready.has(day) ? days.get(day) : undefined;
		},
	};
}
