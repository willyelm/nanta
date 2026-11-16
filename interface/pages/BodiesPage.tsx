import type { Body } from "body";
import { List, ListItem, Loader, Panel, Panels } from "interface/panel";
import { CandidatesBar } from "interface/sites/CandidatesBar";
import { useKeep } from "interface/sites/url";
import { Skeleton } from "interface/skeleton";
import { useView } from "interface/space";
import { WindowsPanel } from "interface/windows";
import { useState } from "react";
import { type Api, json, resumable, useSearchParams } from "system";
import { nantaTitle } from "./title";

const [, useBodies] = resumable(async (api: Api) => json<Body[]>(api("/api/bodies")));

// Seconds as fixed-width days, hours, and minutes: 29d 12h 44m. The same fields for every body,
// so values line up and compare without converting.
export function duration(seconds: number) {
	const minutes = Math.round(seconds / 60);
	const [d, h, m] = [Math.floor(minutes / 1440), Math.floor(minutes / 60) % 24, minutes % 60];
	const two = (n: number) => String(n).padStart(2, "0");
	return `${two(d)}d ${two(h)}h ${two(m)}m`;
}

// The first page: Bodies on the left, Windows on the right. Saved candidates keep a
// comparison bar across the bottom even before a site is open.
export function BodiesPage() {
	const window = useSearchParams().get("window") ?? "TODAY";
	return (
		<>
			<title>{nantaTitle("Landing path finder")}</title>
			<Panels>
				<Loader label="Loading bodies…" error="Couldn't load bodies." fallback={<BodiesSkeleton />}>
					<BodiesPanel />
				</Loader>
				<Loader label="Loading windows…" error="Couldn't load the windows.">
					<WindowsPanel here="/" window={window} />
				</Loader>
			</Panels>
			<CandidatesBar />
		</>
	);
}

// Matches BodiesPanel cards: name + NAIF on top and three facts under them
// (ListItem p-md, grid gap-x-sm gap-y-sm).
function BodiesSkeleton() {
	return (
		<div aria-hidden="true" className="flex flex-col divide-y divide-divider">
			{[1, 2, 3].map((row) => (
				<div key={row} className="grid grid-cols-3 gap-x-sm gap-y-sm p-md">
					<Skeleton className="col-span-2" height="1.25rem" />
					<Skeleton height="1.25rem" />
					<Skeleton height="2.5rem" />
					<Skeleton height="2.5rem" />
					<Skeleton height="2.5rem" />
				</div>
			))}
		</div>
	);
}

// The bodies a site can stand on, as links. Pointing at or focusing one selects it in the model.
function BodiesPanel() {
	const bodies = useBodies();
	const keep = useKeep();
	// The first body from the API is selected on load; pointing at or focusing another selects it.
	const first = bodies.find((body) => body.type !== "star")?.code;
	const [selected, setSelected] = useState(first);
	useView({ body: selected });
	return (
		<Panel as="nav" aria-label="Body" className="divide-y divide-divider">
			<List>
				{bodies
					// Sites stand on planets and satellites; the Sun is always in space, but not a place.
					.filter((body) => body.type !== "star")
					.map((body) => (
						<ListItem
							key={body.code}
							href={keep(`/${body.code}/sites`)}
							onPointerEnter={() => setSelected(body.code)}
							onFocus={() => setSelected(body.code)}
						>
							<dl className="grid grid-cols-3 gap-x-sm gap-y-sm">
								<div className="col-span-2">
									<dt className="sr-only">Name</dt>
									<dd className="text-heading uppercase">{body.name}</dd>
								</div>
								<div className="text-end">
									<dt className="sr-only">NAIF ID</dt>
									<dd className="text-heading tabular-nums">{body.code}</dd>
								</div>

								<div className="flex flex-col">
									<dt className="text-caption text-secondary">Solar day</dt>
									<dd className="tabular-nums">{body.day ? duration(body.day) : "—"}</dd>
								</div>
								<div className="flex flex-col">
									<dt className="text-caption text-secondary">Air</dt>
									<dd>
										{body.air ? "Yes" : "No"}
										<span className="block text-caption text-secondary">
											{body.refraction ? "Refracted horizon" : "Geometric horizon"}
										</span>
									</dd>
								</div>
								<div className="flex flex-col">
									<dt className="text-caption text-secondary">Radius</dt>
									<dd className="tabular-nums">
										{body.radius
											? `${body.radius.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`
											: "—"}
									</dd>
								</div>
							</dl>
						</ListItem>
					))}
			</List>
		</Panel>
	);
}
