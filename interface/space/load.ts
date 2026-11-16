import type { Body as Entry } from "body";
import type { State } from "position";
import { byCode, names } from "./geometry";

export type Star = { name: string; ra: number; dec: number; magnitude: number };

export async function fetchStars(): Promise<Star[]> {
	const response = await fetch("/api/bodies");
	if (!response.ok) return [];
	const list = (await response.json()) as Entry[];
	const stars: Star[] = [];
	for (const star of list) {
		const { ra, dec, magnitude } = star;
		if (ra === undefined || dec === undefined || magnitude === undefined) continue;
		stars.push({ name: star.name, ra, dec, magnitude });
	}
	return stars;
}

// Queued Horizons fetches for Earth, Moon, Mars at a day. Calls `on` after each body loads.
export function horizons(say: (text: string) => void, on: () => void) {
	const loaded = new Map<string, State[]>();
	let queue = Promise.resolve();
	let stopped = false;
	const load = (hour: string) => {
		if (loaded.has(hour)) return;
		loaded.set(hour, []);
		queue = queue.then(async () => {
			for (const code of ["399", "301", "499"]) {
				const name = names[byCode[code]];
				say(`Loading Horizons state for ${hour.replace("T", " ")}: ${name} (${code})…`);
				const response = await fetch(`/api/space?time=${hour}&body=${code}`).catch(() => null);
				if (stopped) return;
				if (!response?.ok) {
					say(`Couldn't load ${name}.`);
					return;
				}
				loaded.set(hour, [...(loaded.get(hour) ?? []), (await response.json()) as State]);
				say(`Rendering ${name}…`);
				on();
			}
			say("");
		});
	};
	return {
		stop() {
			stopped = true;
		},
		statesFor(time?: number) {
			const day = `${new Date(time ?? Date.now()).toISOString().slice(0, 10)}T00:00`;
			load(day);
			const exact = loaded.get(day) ?? [];
			return exact.length === 3 ? exact : undefined;
		},
	};
}
