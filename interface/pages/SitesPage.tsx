import type { Body } from "body";
import { Horizon } from "interface/horizon/Horizon";
import { Skeleton } from "interface/skeleton";
import type { Positions } from "position";
import { Suspense } from "react";
import type { Site, SitePage } from "site";
import { type Api, Catch, json, resumable, useParams, useSearchParams } from "system";

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
		<div className="flex flex-col gap-lg">
			<p>
				<a href="/">← Spheres</a>
			</p>
			<Catch fallback={<h2>{code}</h2>}>
				<Suspense fallback={<h2>{code}</h2>}>
					<Heading code={code} />
				</Suspense>
			</Catch>
			<Catch fallback={<p role="alert">Couldn't load sites.</p>}>
				<Suspense
					fallback={
						<div role="status" aria-busy="true" className="flex flex-wrap gap-sm">
							<span className="sr-only">Loading sites…</span>
							{[1, 2, 3, 4].map((key) => (
								<Skeleton key={key} width="8rem" height="var(--spacing-control)" />
							))}
						</div>
					}
				>
					<List code={code} site={site} from={from} to={to} />
				</Suspense>
			</Catch>
		</div>
	);
}

const [, useBody] = resumable(async (api: Api, code: string) =>
	json<Body>(api(`/api/bodies/${encodeURIComponent(code)}`)),
);

function Heading({ code }: { code: string }) {
	const body = useBody(code);
	return (
		<h2>
			{body.name} · {body.code}
		</h2>
	);
}

const [, useSites] = resumable(async (api: Api) => {
	return json<SitePage>(api("/api/sites?limit=20"));
});

function List({ code, site, from, to }: { code: string; site: string; from: string; to: string }) {
	const result = useSites();
	const items = [...result.items].sort(
		(a, b) => Number(b.id === "south-pole") - Number(a.id === "south-pole"),
	);
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
			<ul className="flex flex-wrap gap-sm">
				{items.map((item) => (
					<li key={item.id}>
						<a
							className="inline-flex items-center min-h-control px-md border border-control text-default no-underline hover:bg-neutralHover pressed:bg-neutralActive"
							href={href({ site: item.id })}
							aria-current={item.id === selected?.id ? "true" : undefined}
						>
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
		<section className="flex flex-col gap-md">
			<h3>{site.name}</h3>
			<p>
				{site.lat.toFixed(3)}°, {site.lon.toFixed(3)}°E
			</p>
			<ul className="flex flex-wrap gap-sm">
				{windows.map((window) => (
					<li key={window.from}>
						<a
							className="inline-flex items-center min-h-control px-md border border-control text-default no-underline hover:bg-neutralHover pressed:bg-neutralActive"
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
					<Suspense
						fallback={
							<div role="status" aria-busy="true">
								<span className="sr-only">Loading horizon…</span>
								<Skeleton height="16rem" />
							</div>
						}
					>
						<Sky code={code} site={site.id} from={from} to={to} />
					</Suspense>
				</Catch>
			) : (
				<p>Choose a window.</p>
			)}
		</section>
	);
}

const [, useHorizon] = resumable(
	async (api: Api, code: string, site: string, from: string, to: string) => {
		const query = new URLSearchParams({ site, from, to, step: "6h", center: code });
		const [sun, earth] = await Promise.all([
			json<Positions>(api(`/api/positions/sun?${query}`)),
			json<Positions>(api(`/api/positions/earth?${query}`)),
		]);
		return { sun, earth };
	},
);

function Sky({ code, site, from, to }: { code: string; site: string; from: string; to: string }) {
	const { sun, earth } = useHorizon(code, site, from, to);
	return <Horizon sun={sun.positions} earth={earth.positions} />;
}
