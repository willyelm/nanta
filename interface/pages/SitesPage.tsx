import { Suspense } from "react";
import type { Positions } from "position";
import type { Site, SitePage } from "site";
import { type Api, Catch, json, resumable, useParams, useSearchParams } from "system";
import { Horizon } from "../horizon/Horizon";
import styles from "./SitesPage.module.css";

const windows = [
	{ label: "2027 Mar 1–3", from: "2027-03-01", to: "2027-03-03" },
	{ label: "2027 Jun 1–3", from: "2027-06-01", to: "2027-06-03" },
];

export function SitesPage() {
	const { code } = useParams();
	const params = useSearchParams();
	const site = params.get("site") ?? "south-pole";
	const from = params.get("from") ?? "";
	const to = params.get("to") ?? "";

	return (
		<div className={styles.page}>
			<p>
				<a href="/">← Spheres</a>
			</p>
			<h2>{{ "301": "Moon", "399": "Earth", "499": "Mars" }[code] ?? code} · {code}</h2>
			<Catch fallback={<p role="alert">Couldn't load sites.</p>}>
				<Suspense fallback={<p aria-busy="true">Loading sites…</p>}>
					<List code={code} site={site} from={from} to={to} />
				</Suspense>
			</Catch>
		</div>
	);
}

const [, useSites] = resumable(async (api: Api) => {
	return json<SitePage>(api("/api/sites?limit=20"));
});

function List({ code, site, from, to }: { code: string; site: string; from: string; to: string }) {
	const result = useSites();
	const items = [...result.items].sort((a, b) => Number(b.id === "south-pole") - Number(a.id === "south-pole"));
	const selected = items.find((item) => item.id === site) ?? items[0];
	const href = (next: { site?: string; from?: string; to?: string }) => {
		const query = new URLSearchParams({ site: next.site ?? selected?.id ?? site });
		const start = next.from === undefined ? from : next.from;
		const end = next.to === undefined ? to : next.to;
		if (start && end) {
			query.set("from", start);
			query.set("to", end);
		}
		return `/${code}/sites?${query}`;
	};

	return (
		<>
			<ul className={styles.sites}>
				{items.map((item) => (
					<li key={item.id}>
						<a href={href({ site: item.id })} aria-current={item.id === selected?.id ? "true" : undefined}>
							{item.name}
						</a>
					</li>
				))}
			</ul>
			{selected ? <Place code={code} site={selected} from={from} to={to} href={href} /> : null}
		</>
	);
}

function Place({
	code,
	site,
	from,
	to,
	href,
}: {
	code: string;
	site: Site;
	from: string;
	to: string;
	href: (next: { from?: string; to?: string }) => string;
}) {
	return (
		<section className={styles.place}>
			<h3>{site.name}</h3>
			<p>
				{site.lat.toFixed(3)}°, {site.lon.toFixed(3)}°E
			</p>
			<ul className={styles.windows}>
				{windows.map((window) => (
					<li key={window.from}>
						<a
							href={href({ from: window.from, to: window.to })}
							aria-current={from === window.from && to === window.to ? "true" : undefined}
						>
							{window.label}
						</a>
					</li>
				))}
			</ul>
			{from && to ? (
				<Catch fallback={<p role="alert">Couldn't load the horizon.</p>}>
					<Suspense fallback={<p aria-busy="true">Loading horizon…</p>}>
						<Sky code={code} site={site.id} from={from} to={to} />
					</Suspense>
				</Catch>
			) : (
				<p>Choose a window.</p>
			)}
		</section>
	);
}

const [, useHorizon] = resumable(async (api: Api, code: string, site: string, from: string, to: string) => {
	const query = new URLSearchParams({ site, from, to, step: "6h", center: code });
	const [sun, earth] = await Promise.all([
		json<Positions>(api(`/api/positions/sun?${query}`)),
		json<Positions>(api(`/api/positions/earth?${query}`)),
	]);
	return { sun, earth };
});

function Sky({ code, site, from, to }: { code: string; site: string; from: string; to: string }) {
	const { sun, earth } = useHorizon(code, site, from, to);
	return <Horizon sun={sun.positions} earth={earth.positions} />;
}
