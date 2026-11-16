import { useView } from "interface/space";
import type { Site } from "site";

// Two rows: code with latitude and longitude lined up in tabular columns, then the description
// taking the full width below (ellipsis when long).
export function SiteCard({ site }: { site: Site }) {
	return (
		<dl className="flex flex-col gap-xs w-full min-w-0">
			<div className="flex items-center gap-md min-w-0">
				<dt className="sr-only">Code</dt>
				<dd className="uppercase flex-1 min-w-0 truncate">{site.code}</dd>
				<div className="flex gap-md shrink-0 text-caption text-end">
					<div className="w-[8ch]">
						<dt className="sr-only">Latitude</dt>
						<dd className="tabular-nums">{site.lat.toFixed(3)}°</dd>
					</div>
					<div className="w-[9ch]">
						<dt className="sr-only">Longitude</dt>
						<dd className="tabular-nums">{site.lon.toFixed(3)}°E</dd>
					</div>
				</div>
			</div>
			<div className="min-w-0">
				<dt className="sr-only">Description</dt>
				<dd className="text-caption text-secondary truncate" title={site.name}>
					{site.name}
				</dd>
			</div>
		</dl>
	);
}

// Puts the site on the model while it's shown.
export function SiteView({ site }: { site: Site }) {
	useView({
		lat: site.lat,
		lon: site.lon,
		site: site.code,
		sunlight: site.sunlight,
		earth_visibility: site.earth_visibility,
	});
	return null;
}
