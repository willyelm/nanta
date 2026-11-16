import type { Body } from "body";
import { conditions, flagged, samples } from "interface/horizon/catalog";
import { saved } from "interface/sites/store";
import { useWindows } from "interface/windows";
import type { Positions, Sky } from "position";
import { useMemo } from "react";
import type { Condition, Site, SitePage as SiteList } from "site";
import { type Api, json, resumable, useHydrated } from "system";

export const [, useBody] = resumable(async (api: Api, code: string) =>
	json<Body>(api(`/api/bodies/${encodeURIComponent(code)}`)),
);

export const [, useCatalog] = resumable(async (api: Api, code: string) =>
	json<SiteList>(api(`/api/sites?body=${encodeURIComponent(code)}&limit=20`)),
);

// The body's sites: the predefined ones from the server, then the ones added in this browser
// (after hydration, since the server can't see them).
export function useSites(code: string): Site[] {
	const catalog = useCatalog(code).items;
	// A site edited in this browser takes the place of the catalog's one with the same code.
	const mine = useHydrated() ? saved(code) : [];
	return [...catalog.filter((site) => !mine.some((m) => m.code === site.code)), ...mine];
}

// The bodies the site's conditions need, seen from its coordinates: one request each, in turn,
// as Horizons refuses parallel requests from one client.
export const [, useHorizon] = resumable(
	async (
		api: Api,
		code: string,
		lat: number,
		lon: number,
		from: string,
		to: string,
		needs: Condition[],
	) => {
		const query = new URLSearchParams({
			lat: String(lat),
			lon: String(lon),
			from,
			to,
			step: "1h",
			center: code,
		});
		const sky: Sky = {};
		for (const condition of needs) {
			const body = conditions[condition].body;
			sky[body] = (await json<Positions>(api(`/api/positions/${body}?${query}`))).positions;
		}
		return sky;
	},
);

// What a page shows: the body, the site, and the window, by their codes.
export type Shown = { code: string; site: string; window: string };

// The chosen site, what it's judged on, and its samples over the window.
export function useShown({ code, site, window }: Shown) {
	const chosen = useSites(code).find((item) => item.code === site);
	const span = useWindows().find((w) => w.code === window);
	const [from, to] = span ? [span.from, span.to] : ["", ""];
	// Stable across time scrubs: only the site's flags change the list, not each render.
	const sunlight = chosen?.sunlight ?? false;
	const earth = chosen?.earth_visibility ?? false;
	const list = useMemo(() => flagged({ sunlight, earth_visibility: earth }), [sunlight, earth]);
	const sky = useHorizon(code, chosen?.lat ?? 0, chosen?.lon ?? 0, from, to, span ? list : []);
	const first = list.length ? samples(sky, list[0]) : [];
	return { list, sky, first };
}
