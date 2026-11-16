import type { Image } from "imagery";
import { Skeleton } from "interface/skeleton";
import { Suspense } from "react";
import { type Api, Catch, json, resumable } from "system";

export const [, useImagery] = resumable(
	async (api: Api, code: string, lat: number, lon: number, date: string) => {
		const query = new URLSearchParams({ lat: String(lat), lon: String(lon), date });
		const answer = await json<{ images: Image[] }>(
			api(`/api/imagery/${encodeURIComponent(code)}?${query}`),
		);
		return answer.images;
	},
);

// Pictures of the site from its body's NASA source, the site ringed at its point. Bodies without
// a source show nothing. Earth's picture is of the reading's day; the others don't change.
export function Imagery({
	code,
	lat,
	lon,
	date,
}: {
	code: string;
	lat: number;
	lon: number;
	date: string;
}) {
	return (
		<Catch fallback={<p className="text-caption text-secondary">Couldn't load imagery.</p>}>
			<Suspense
				fallback={
					<div aria-hidden="true" className="flex flex-col gap-xs">
						<Skeleton className="aspect-square" height="auto" />
						<Skeleton width="80%" height="0.75rem" />
					</div>
				}
			>
				<Pictures code={code} lat={lat} lon={lon} date={code === "399" ? date : ""} />
			</Suspense>
		</Catch>
	);
}

function Pictures({
	code,
	lat,
	lon,
	date,
}: {
	code: string;
	lat: number;
	lon: number;
	date: string;
}) {
	const images = useImagery(code, lat, lon, date);
	if (!images.length)
		return (
			<p className="text-caption text-secondary">
				No imagery this close to the pole yet: the map grid stretches it into streaks.
			</p>
		);
	return (
		<ul aria-label="Imagery" className="flex flex-col gap-md">
			{images.map((image) => (
				<li key={image.title}>
					<figure className="flex flex-col gap-xs">
						<div className="relative aspect-square w-full overflow-hidden bg-neutralActive">
							<div
								className="grid size-full"
								style={{ gridTemplateColumns: `repeat(${image.tiles[0].length}, 1fr)` }}
							>
								{image.tiles.flat().map((url) => (
									<img key={url} src={url} alt="" loading="lazy" className="block size-full" />
								))}
							</div>
							<span
								aria-hidden="true"
								className="absolute size-utility -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--chart-color-select)]"
								style={{ left: `${image.x * 100}%`, top: `${image.y * 100}%` }}
							/>
						</div>
						<figcaption className="text-caption text-secondary">
							{image.title}, {image.source}
							{image.date ? `, ${image.latest ? "latest available " : ""}${image.date}` : ""}. About{" "}
							{image.km.toLocaleString("en-US")} km across.
						</figcaption>
					</figure>
				</li>
			))}
		</ul>
	);
}
