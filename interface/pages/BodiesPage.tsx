import type { Body } from "body";
import { Loader, Panel, Panels } from "interface/panel";
import { useView } from "interface/space";
import { useState } from "react";
import { type Api, json, resumable } from "system";

const [, useBodies] = resumable(async (api: Api) => json<Body[]>(api("/api/bodies")));

const panel = "w-panel divide-y divide-divider pad-0";

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
			{bodies
				// Sites stand on planets and satellites; the Sun is always in space, but not a place.
				.filter((body) => body.type !== "star")
				.map((body) => (
					<a
						key={body.code}
						className="flex flex-col min-h-control p-lg text-default no-underline hover:bg-neutralHover"
						href={`/${body.code}/sites`}
						onPointerEnter={() => setSelected(body.code)}
						onFocus={() => setSelected(body.code)}
					>
						<div className="text-heading uppercase">{body.name}</div>
						<dl className="grid grid-cols-[6.5rem_1fr] gap-x-md gap-y-xs">
							<dt className="text-label text-secondary">NAIF ID</dt>
							<dd>{body.code}</dd>
							<dt className="text-label text-secondary">Air</dt>
							<dd>{body.air}</dd>
							<dt className="text-label text-secondary">Solar day</dt>
							<dd>{body.day}</dd>
							<dt className="text-label text-secondary">Radius</dt>
							<dd>{body.radius}</dd>
						</dl>
					</a>
				))}
		</Panel>
	);
}
