import type { Site } from "site";
import type { Window } from "windows";

// Things you add, kept in this browser by key. A code is the id; saving one with a code that
// exists replaces it. Storage can be blocked; then nothing is kept beyond the visit.
function collection<T extends { code: string }>(key: string) {
	const read = (): T[] => {
		try {
			return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
		} catch {
			return [];
		}
	};
	return {
		all: read,
		remove(code: string) {
			try {
				localStorage.setItem(key, JSON.stringify(read().filter((item) => item.code !== code)));
			} catch {
				// Storage blocked.
			}
		},
		save(item: T) {
			try {
				const rest = read().filter((other) => other.code !== item.code);
				localStorage.setItem(key, JSON.stringify([...rest, item]));
			} catch {
				// Storage blocked.
			}
		},
	};
}

const sites = collection<Site>("nanta.sites");
export const saved = (body: string) => sites.all().filter((site) => site.body === body);
export const save = sites.save;

const windows = collection<Window>("nanta.windows");
export const savedWindows = windows.all;
export const saveWindow = windows.save;
export const removeWindow = windows.remove;

// A candidate is a plan: one site and one window on a body, by their codes. Its code joins them.
export type Candidate = { code: string; body: string; site: string; window: string };
export const candidateCode = (site: string, window: string) => `${site}·${window}`;

const candidates = collection<Candidate>("nanta.candidates");
export const savedCandidates = candidates.all;
export const saveCandidate = candidates.save;
export const removeCandidate = candidates.remove;
