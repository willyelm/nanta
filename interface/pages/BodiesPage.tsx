import type { Body } from "body";
import { List, ListItem, Loader, Panel, Panels } from "interface/panel";
import { useView } from "interface/space";
import { useState } from "react";
import { type Api, json, resumable } from "system";

const [, useBodies] = resumable(async (api: Api) => json<Body[]>(api("/api/bodies")));

const panel = "w-panel";

// Seconds as fixed-width days, hours, and minutes: 29d 12h 44m. The same fields for every body,
// so values line up and compare without converting.
export function duration(seconds: number) {
	const minutes = Math.round(seconds / 60);
	const [d, h, m] = [Math.floor(minutes / 1440), Math.floor(minutes / 60) % 24, minutes % 60];
	const two = (n: number) => String(n).padStart(2, "0");
	return `${two(d)}d ${two(h)}h ${two(m)}m`;
}

export function BodiesPage() {
	return (
		<Panels>
			<Loader label="Loading bodies…" error="Couldn't load bodies." className={panel}>
				<BodiesPanel />
			</Loader>
		</Panels>
	);
}

// The bodies a site can stand on, as links. Pointing at or focusing one selects it in the model.
function BodiesPanel() {
	const bodies = useBodies();
	const [selected, setSelected] = useState<string>();
	useView({ body: selected });
	return (
		<Panel as="nav" aria-label="Body" className={panel}>
			<List>
				{bodies
					// Sites stand on planets and satellites; the Sun is always in space, but not a place.
					.filter((body) => body.type !== "star")
					.map((body) => (
						<ListItem
							key={body.code}
							href={`/${body.code}/sites`}
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
								<div className="flex flex-col gap-xs">
									<dt className="text-label text-secondary">Air</dt>
									<dd>
										{body.air ? "Yes" : "No"}
										<span className="block text-caption text-secondary">
											{body.refraction ? "Refracted horizon" : "Geometric horizon"}
										</span>
									</dd>
								</div>
								<div className="flex flex-col gap-xs">
									<dt className="text-label text-secondary">Solar day</dt>
									<dd className="tabular-nums">{body.day ? duration(body.day) : "—"}</dd>
								</div>
								<div className="flex flex-col gap-xs">
									<dt className="text-label text-secondary">Radius</dt>
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
