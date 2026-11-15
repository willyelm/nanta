import type { Body } from "body";
import { Button } from "interface/button";
import { Conditions, Curve } from "interface/horizon/Conditions";
import { conditions, flagged, samples } from "interface/horizon/catalog";
import { HorizonChart } from "interface/horizon/HorizonChart";
import { Reading } from "interface/horizon/Reading";
import Plus from "interface/icon/plus.svg";
import { List, ListItem, Loader, Panel, PanelBar, Panels } from "interface/panel";
import { save, saved } from "interface/sites/store";
import { useView } from "interface/space";
import type { Positions, Sky } from "position";
import { type FormEvent, useCallback, useState } from "react";
import type { Condition, Site, SitePage } from "site";
import {
	type Api,
	json,
	navigate,
	resumable,
	useHydrated,
	useParams,
	useSearchParams,
} from "system";

const windows = [
	{ label: "2027 Mar 1–3", from: "2027-03-01", to: "2027-03-03" },
	{ label: "2027 Jun 1–3", from: "2027-06-01", to: "2027-06-03" },
];

// /{body}/sites, /{body}/sites/{site}, and /{body}/sites/new are one page: sites on the left,
// or the form to add one; with a site and a window, its conditions on the right and the
// timeline across the bottom. The window stays in the query: ?from=&to=.
function Sites({ adding = false }: { adding?: boolean }) {
	const { code, site = "" } = useParams();
	const params = useSearchParams();
	const from = params.get("from") ?? "";
	const to = params.get("to") ?? "";
	useView({ body: code });
	// The sample shown, shared by the conditions and the timeline.
	const [at, setAt] = useState(0);
	const shown = { code, site, from, to, at };
	const ready = !adding && site && from && to;

	return (
		<>
			<Panels>
				<Loader label="Loading sites…" error="Couldn't load sites." className="w-panel">
					{adding ? <NewSitePanel code={code} /> : <SitesPanel {...shown} />}
				</Loader>
				{ready ? (
					<Loader label="Loading horizon…" error="Couldn't load the horizon." className="w-panel">
						<ConditionsPanel {...shown} setAt={setAt} />
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

export const SitesPage = () => <Sites />;
export const NewSitePage = () => <Sites adding />;

const [, useBody] = resumable(async (api: Api, code: string) =>
	json<Body>(api(`/api/bodies/${encodeURIComponent(code)}`)),
);

const [, useCatalog] = resumable(async (api: Api, code: string) =>
	json<SitePage>(api(`/api/sites?body=${encodeURIComponent(code)}&limit=20`)),
);

// The body's sites: the predefined ones from the server, then the ones added in this browser
// (after hydration, since the server can't see them).
function useSites(code: string): Site[] {
	const catalog = useCatalog(code).items;
	return [...catalog, ...(useHydrated() ? saved(code) : [])];
}

const link =
	"inline-flex items-center min-h-control px-md border border-control text-default no-underline hover:bg-neutralHover pressed:bg-neutralActive";

// The body's sites to choose from; with one chosen, where it is and the windows to read.
function SitesPanel({ code, site, from, to }: Shown) {
	const body = useBody(code);
	const items = useSites(code).sort((a, b) => Number(b.code === "SCR") - Number(a.code === "SCR"));
	const selected = items.find((item) => item.code === site);
	const query = (start: string, end: string) =>
		start && end ? `?${new URLSearchParams({ from: start, to: end })}` : "";
	const href = (next: string, start = from, end = to) =>
		`/${code}/sites/${encodeURIComponent(next)}${query(start, end)}`;

	return (
		<Panel as="nav" aria-label="Sites" className="w-panel divide-y divide-divider">
			<PanelBar
				back="/"
				title={`${body.name} ${body.code}`}
				action={
					<Button as="a" href={`/${code}/sites/new`} aria-label="Add a site" className="m-xs">
						<Plus icon />
					</Button>
				}
			/>

			<List aria-label="Sites">
				{items.map((item) => (
					<ListItem key={item.code} href={href(item.code)} current={item.code === selected?.code}>
						<span className="text-heading uppercase">{item.code}</span>
						<span className="text-label text-secondary">{item.name}</span>
					</ListItem>
				))}
			</List>
			{selected ? (
				<section className="flex flex-col gap-md p-md">
					<SiteView site={selected} />
					<h3>
						{selected.code} · {selected.name}
					</h3>
					<p>
						{selected.lat.toFixed(3)}°, {selected.lon.toFixed(3)}°E
						{selected.radius ? ` · ${selected.radius} km` : ""}
					</p>
					<ul className="flex flex-wrap gap-sm">
						{windows.map((w) => (
							<li key={w.from}>
								<a
									className={link}
									href={href(selected.code, w.from, w.to)}
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
				<p className="p-md">Choose a site, or add one.</p>
			)}
		</Panel>
	);
}

const field = "flex flex-col gap-xs";
const input = "min-h-control px-sm border border-input bg-neutral text-default";

// A new site: a code name, where it is, how big, and what it's judged on. It shows on the model
// as you type; clicking the body picks the point. Saved in this browser, then opened.
function NewSitePanel({ code }: { code: string }) {
	const body = useBody(code);
	const [form, setForm] = useState({ code: "", lat: "0", lon: "0", radius: "5" });
	const [flags, setFlags] = useState({ sunlight: true, earth_visibility: code === "301" });
	const lat = Number(form.lat);
	const lon = ((Number(form.lon) % 360) + 360) % 360 || 0;
	const radius = Number(form.radius);
	const valid =
		/^[A-Z0-9-]{1,12}$/.test(form.code) &&
		lat >= -90 &&
		lat <= 90 &&
		radius > 0 &&
		(flags.sunlight || flags.earth_visibility);
	const onPick = useCallback((la: number, lo: number) => {
		setForm((f) => ({ ...f, lat: la.toFixed(3), lon: lo.toFixed(3) }));
	}, []);
	useView({ lat, lon, radius, onPick });

	const set = (key: keyof typeof form) => (event: { target: { value: string } }) => {
		const value = key === "code" ? event.target.value.toUpperCase() : event.target.value;
		setForm((f) => ({ ...f, [key]: value }));
	};
	const toggle = (condition: Condition) => setFlags((f) => ({ ...f, [condition]: !f[condition] }));
	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (!valid) return;
		save({ code: form.code, name: form.code, body: code, ...flags, lat, lon, radius });
		navigate(`/${code}/sites/${form.code}`);
	};

	return (
		<Panel as="section" aria-label="New site" className="w-panel divide-y divide-divider">
			<PanelBar
				back="/"
				title={`${body.name} ${body.code}`}
				action={
					<a href={`/${code}/sites`} className="p-md">
						CANCEL
					</a>
				}
			/>
			<form className="flex flex-col gap-md p-md" onSubmit={submit}>
				<label className={field}>
					<span className="text-label text-secondary">Code name</span>
					<input
						className={input}
						value={form.code}
						onChange={set("code")}
						placeholder="RIDGE-2"
						maxLength={12}
						required
					/>
				</label>
				<div className="grid grid-cols-2 gap-sm">
					<label className={field}>
						<span className="text-label text-secondary">Latitude °</span>
						<input
							className={input}
							type="number"
							step="any"
							min={-90}
							max={90}
							value={form.lat}
							onChange={set("lat")}
						/>
					</label>
					<label className={field}>
						<span className="text-label text-secondary">Longitude °E</span>
						<input
							className={input}
							type="number"
							step="any"
							value={form.lon}
							onChange={set("lon")}
						/>
					</label>
				</div>
				<label className={field}>
					<span className="text-label text-secondary">Radius km</span>
					<input
						className={input}
						type="number"
						step="any"
						min={0.01}
						value={form.radius}
						onChange={set("radius")}
					/>
				</label>
				<fieldset className="flex flex-col gap-xs">
					<legend className="text-label text-secondary">Look for</legend>
					{(Object.keys(conditions) as Condition[]).map((condition) => (
						<label key={condition} className="flex items-center gap-sm">
							<input
								type="checkbox"
								checked={flags[condition]}
								onChange={() => toggle(condition)}
							/>
							{conditions[condition].name}
						</label>
					))}
				</fieldset>
				<p className="text-caption">Or click the body in the model to pick the point.</p>
				<button className={link} type="submit" disabled={!valid}>
					Add site
				</button>
			</form>
		</Panel>
	);
}

// The bodies the site's conditions need, seen from its coordinates: one request each, in turn,
// as Horizons refuses parallel requests from one client.
const [, useHorizon] = resumable(
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

type Shown = { code: string; site: string; from: string; to: string; at: number };

// The chosen site, what it's judged on, and its samples over the window.
function useShown({ code, site, from, to }: Shown) {
	const chosen = useSites(code).find((item) => item.code === site);
	const list = chosen ? flagged(chosen) : [];
	const sky = useHorizon(code, chosen?.lat ?? 0, chosen?.lon ?? 0, from, to, list);
	const first = list.length ? samples(sky, list[0]) : [];
	return { list, sky, first };
}

// The horizon from the site, the conditions at the chosen sample, and the table. It also puts
// the samples on the model; picking on the chart moves the time.
function ConditionsPanel({ setAt, ...shown }: Shown & { setAt: (at: number) => void }) {
	const { list, sky } = useShown(shown);
	useView({ sky, at: shown.at });
	return (
		<Panel as="aside" className="w-panel">
			<HorizonChart list={list} sky={sky} at={shown.at} onPick={setAt} />
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
	useView({ lat: site.lat, lon: site.lon, radius: site.radius });
	return null;
}
