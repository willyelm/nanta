import type { Site } from "site";

// The sites you add, kept in this browser. A site's code is its id; adding one with a code
// that exists replaces it.
const KEY = "nanta.sites";

export function saved(body: string): Site[] {
	try {
		const all = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Site[];
		return all.filter((site) => site.body === body);
	} catch {
		return [];
	}
}

export function save(site: Site) {
	try {
		const all = (JSON.parse(localStorage.getItem(KEY) ?? "[]") as Site[]).filter(
			(other) => other.code !== site.code,
		);
		localStorage.setItem(KEY, JSON.stringify([...all, site]));
	} catch {
		// Storage blocked: the site still opens from its URL for this visit.
	}
}
