import type { Body } from "body";
import { Conditions, Curve } from "interface/horizon/Conditions";
import { conditions, samples } from "interface/horizon/catalog";
import { Reading } from "interface/horizon/Reading";
import { Loader, Panel, Panels } from "interface/panel";
import { useView } from "interface/space";
import type { Positions, Sky } from "position";
import { useState } from "react";
import type { Condition, Site, SitePage } from "site";
import { type Api, json, resumable, useParams, useSearchParams } from "system";

const windows = [
	{ label: "2027 Mar 1–3", from: "2027-03-01", to: "2027-03-03" },
	{ label: "2027 Jun 1–3", from: "2027-06-01", to: "2027-06-03" },
];

export function SitesPage() {
	const { code } = useParams();
	const params = useSearchParams();
	// No site until one is chosen: the body alone, and a list to pick from.
	const site = params.get("site") ?? "";
	const from = params.get("from") ?? "";
	const to = params.get("to") ?? "";
	useView({ body: code });
	// The sample shown, shared by the conditions and the timeline.
	const [at, setAt] = useState(0);
	const shown = { code, site, from, to, at };
	const ready = site && from && to;

	// Sites on the left; with a site and a window, its conditions on the right and the timeline
	// across the bottom.
	return (
		<>
			<Panels>
				<Loader label="Loading sites…" error="Couldn't load sites." className="w-panel">
					<SitesPanel {...shown} />
				</Loader>
				{ready ? (
					<Loader label="Loading horizon…" error="Couldn't load the horizon." className="w-panel">
						<ConditionsPanel {...shown} />
					</Loader>
				) : null}
			</Panels>
			{ready ? (
				<Loader label="Loading the timeline…" error="Couldn't load the timeline.">
					<TimelinePanel {...shown} setAt={setAt} />
				</Loader>
			) : null}
		</>
	);
}

const [, useBody] = resumable(async (api: Api, code: string) =>
	json<Body>(api(`/api/bodies/${encodeURIComponent(code)}`)),
);

const [, useSites] = resumable(async (api: Api, code: string) =>
	json<SitePage>(api(`/api/sites?body=${encodeURIComponent(code)}&limit=20`)),
);

const link =
	"inline-flex items-center min-h-control px-md border border-control text-default no-underline hover:bg-neutralHover pressed:bg-neutralActive";

// The body's sites to choose from; with one chosen, where it is and the windows to read.
function SitesPanel({ code, site, from, to }: Shown) {
	const body = useBody(code);
	const items = [...useSites(code).items].sort(
		(a, b) => Number(b.id === "south-pole") - Number(a.id === "south-pole"),
	);
	const selected = items.find((item) => item.id === site);
	const href = (next: { site?: string; from?: string; to?: string }) => {
		const query = new URLSearchParams({ site: next.site ?? site });
		const start = next.from ?? from;
		const end = next.to ?? to;
		if (start && end) {
			query.set("from", start);
			query.set("to", end);
		}
		return `/${code}/sites?${query}`;
	};

	return (
		<Panel as="nav" aria-label="Sites" className="w-panel">
			<p>
				<a href="/">← Spheres</a>
			</p>
			<h2>
				{body.name} · {body.code}
			</h2>
			<ul className="flex flex-wrap gap-sm">
				{items.map((item) => (
					<li key={item.id}>
						<a
							className={link}
							href={href({ site: item.id })}
							aria-current={item.id === selected?.id ? "true" : undefined}
						>
							{item.name}
						</a>
					</li>
				))}
			</ul>
			{selected ? (
				<section className="flex flex-col gap-md">
					<SiteView site={selected} />
					<h3>{selected.name}</h3>
					<p>
						{selected.lat.toFixed(3)}°, {selected.lon.toFixed(3)}°E
					</p>
					<ul className="flex flex-wrap gap-sm">
						{windows.map((w) => (
							<li key={w.from}>
								<a
									className={link}
									href={href({ from: w.from, to: w.to })}
									aria-current={from === w.from && to === w.to ? "true" : undefined}
								>
									{w.label}
								</a>
							</li>
						))}
					</ul>
					{from && to ? null : <p>Choose a window.</p>}
				</section>
			) : (
				<p>Choose a site.</p>
			)}
		</Panel>
	);
}

// The bodies the site's conditions need, seen from the site: one request each, in turn, as
// Horizons refuses parallel requests from one client.
const [, useHorizon] = resumable(
	async (api: Api, code: string, site: string, from: string, to: string, needs: Condition[]) => {
		const query = new URLSearchParams({ site, from, to, step: "1h", center: code });
		const sky: Sky = {};
		for (const condition of needs) {
			const body = conditions[condition].body;
			sky[body] = (await json<Positions>(api(`/api/positions/${body}?${query}`))).positions;
		}
		return sky;
	},
);

type Shown = { code: string; site: string; from: string; to: string; at: number };

// The chosen site, what it's judged on, and its samples over the window.
function useShown({ code, site, from, to }: Shown) {
	const { items } = useSites(code);
	const chosen = items.find((item) => item.id === site);
	const list = chosen?.conditions ?? [];
	const sky = useHorizon(code, chosen?.id ?? site, from, to, list);
	const first = list.length ? samples(sky, list[0]) : [];
	return { list, sky, first };
}

// The site's conditions at the chosen sample, and the table. It also puts the samples on the
// model.
function ConditionsPanel(shown: Shown) {
	const { list, sky } = useShown(shown);
	useView({ sky, at: shown.at });
	return (
		<Panel as="aside" className="w-panel">
			<Conditions list={list} sky={sky} at={shown.at} />
			<Reading list={list} sky={sky} at={shown.at} />
		</Panel>
	);
}

// The time slider and one curve per condition, across the bottom.
function TimelinePanel({ setAt, ...shown }: Shown & { setAt: (at: number) => void }) {
	const { list, sky, first } = useShown(shown);
	const at = Math.min(shown.at, Math.max(first.length - 1, 0));
	const time = first[at]?.time.slice(0, 16).replace("T", " ");
	return (
		<Panel as="section" aria-label="Over the window">
			<label className="flex flex-col gap-xs">
				<span>
					Time <output className="tabular-nums">{time} UTC</output>
				</span>
				<input
					type="range"
					min={0}
					max={Math.max(first.length - 1, 0)}
					value={at}
					onChange={(event) => setAt(Number(event.target.value))}
				/>
			</label>
			<div className="grid grid-cols-2 gap-md">
				{list.map((condition) => (
					<figure key={condition} className="flex flex-col gap-xs">
						<figcaption className="text-label">{conditions[condition].label} elevation</figcaption>
						<Curve
							positions={samples(sky, condition)}
							at={at}
							color={conditions[condition].color}
							dashed={conditions[condition].dashed}
						/>
					</figure>
				))}
			</div>
		</Panel>
	);
}

// Puts the site on the model while it's shown.
function SiteView({ site }: { site: Site }) {
	useView({ lat: site.lat, lon: site.lon });
	return null;
}
