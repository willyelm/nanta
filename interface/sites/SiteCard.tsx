import { useView } from "interface/space";
import type { Site } from "site";

// A site as a card, only what matters to pick it: the code name over its description, then
// latitude and longitude, each label over its value.
export function SiteCard({ site }: { site: Site }) {
	return (
		<dl className="flex items-start gap-md">
			<div className="flex-1 min-w-0">
				<dt className="sr-only">Code</dt>
				<dd className="text-heading uppercase">{site.code}</dd>
				{/* One line, cut with an ellipsis; the full text stays for hover and screen readers. */}
				<dd className="text-caption text-secondary truncate" title={site.name}>
					{site.name}
				</dd>
			</div>
			{[
				["Latitude", `${site.lat.toFixed(3)}°`],
				["Longitude", `${site.lon.toFixed(3)}°E`],
			].map(([term, value]) => (
				<div key={term} className="flex flex-col gap-xs text-end text-caption whitespace-nowrap">
					<dt className="text-secondary">{term}</dt>
					<dd className="tabular-nums">{value}</dd>
				</div>
			))}
		</dl>
	);
}

// Puts the site on the model while it's shown.
export function SiteView({ site }: { site: Site }) {
	useView({ lat: site.lat, lon: site.lon });
	return null;
}
