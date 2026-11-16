import { get } from "system";

// Pictures of a site: map tiles around it, from the NASA source for its body. Moon and Mars come
// from Solar System Treks (one equirectangular grid: zoom z is 2^(z+1) by 2^z tiles of 256 px).
// Earth comes from GIBS, a daily satellite picture for the date asked. Only URLs are built; the
// browser loads the images from NASA.

export type Image = {
	title: string;
	source: string;
	date?: string; // YYYY-MM-DD, for pictures of one day
	latest?: boolean; // the day asked has no picture yet; this is the latest one
	tiles: string[][]; // rows of tile URLs, top to bottom
	x: number; // the site in the mosaic, 0 to 1 from the left
	y: number; // and from the top
	km: number; // the mosaic's width on the ground
};

type Layer = { title: string; path: string; zoom: number; format: "jpg" | "png" };

const TREK = "https://trek.nasa.gov/tiles";
const RADIUS: Record<string, number> = { "199": 2439.7, "301": 1737.4, "399": 6371, "499": 3389.5 };

const layers: Record<string, { source: string; layers: Layer[] }> = {
	"199": {
		source: "NASA Mercury Trek",
		layers: [
			{
				title: "MESSENGER mosaic",
				path: "Mercury/EQ/Mercury_MESSENGER_MDIS_Basemap_BDR_Mosaic_Global_166m",
				zoom: 7,
				format: "jpg",
			},
			{
				title: "MESSENGER enhanced color",
				path: "Mercury/EQ/Mercury_MESSENGER_MDIS_Basemap_EnhancedColor_Mosaic_Global_665m",
				zoom: 5,
				format: "jpg",
			},
		],
	},
	"301": {
		source: "NASA Moon Trek",
		layers: [
			{
				title: "LRO WAC mosaic",
				path: "Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02",
				zoom: 8,
				format: "jpg",
			},
			{
				title: "LOLA color relief",
				path: "Moon/EQ/LRO_LOLA_ClrShade_Global_128ppd_v04",
				zoom: 5,
				format: "png",
			},
		],
	},
	"499": {
		source: "NASA Mars Trek",
		layers: [
			{
				title: "Viking color mosaic",
				path: "Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m",
				zoom: 7,
				format: "jpg",
			},
			{
				title: "MOLA color relief",
				path: "Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m",
				zoom: 7,
				format: "jpg",
			},
		],
	},
};

// Three by three tiles centered on the tile holding the site, clamped at the poles.
export function trek(
	layer: Layer,
	source: string,
	lat: number,
	lon: number,
	radius: number,
): Image {
	const z = layer.zoom;
	const [cols, rows] = [2 ** (z + 1), 2 ** z];
	const east = ((lon + 180) % 360) - 180; // 0..360 east to -180..180
	const fx = ((east + 180) / 360) * cols;
	const fy = ((90 - lat) / 180) * rows;
	const [col, row] = [Math.floor(fx), Math.min(Math.max(Math.floor(fy), 1), rows - 2)];
	const tiles = [-1, 0, 1].map((dy) =>
		[-1, 0, 1].map((dx) => {
			const c = (col + dx + cols) % cols;
			return `${TREK}/${layer.path}/1.0.0/default/default028mm/${z}/${row + dy}/${c}.${layer.format}`;
		}),
	);
	const degrees = (3 * 360) / cols;
	return {
		title: layer.title,
		source,
		tiles,
		x: (fx - col + 1) / 3,
		y: (fy - row + 1) / 3,
		km: Math.round(degrees * (Math.PI / 180) * radius * Math.cos(lat * (Math.PI / 180))),
	};
}

// GIBS pictures, 2° across: Blue Marble, the ground without clouds, and VIIRS on NOAA-20 for a
// day (its wide swath leaves no gaps near the equator, where MODIS does). Today and later have
// no picture yet: use yesterday.
export function gibs(lat: number, lon: number, date: string): Image[] {
	const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
	const day = date && date < yesterday ? date : yesterday;
	const east = ((lon + 180) % 360) - 180;
	const picture = (layer: string, time?: string) => {
		const query = new URLSearchParams({
			SERVICE: "WMS",
			REQUEST: "GetMap",
			VERSION: "1.3.0",
			LAYERS: layer,
			CRS: "EPSG:4326",
			BBOX: [lat - 1, east - 1, lat + 1, east + 1].join(","),
			WIDTH: "768",
			HEIGHT: "768",
			FORMAT: "image/jpeg",
			...(time ? { TIME: time } : {}),
		});
		return [[`https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?${query}`]];
	};
	const km = Math.round(2 * (Math.PI / 180) * RADIUS["399"] * Math.cos(lat * (Math.PI / 180)));
	const at = { source: "NASA GIBS", x: 0.5, y: 0.5, km };
	return [
		{ ...at, title: "Blue Marble relief", tiles: picture("BlueMarble_ShadedRelief_Bathymetry") },
		{
			...at,
			title: "VIIRS NOAA-20 true color",
			date: day,
			latest: day !== date,
			tiles: picture("VIIRS_NOAA20_CorrectedReflectance_TrueColor", day),
		},
	];
}

export function imagery(body: string, lat: number, lon: number, date = ""): Image[] | null {
	if (body === "399") return gibs(lat, lon, date);
	const set = layers[body];
	return set ? set.layers.map((layer) => trek(layer, set.source, lat, lon, RADIUS[body])) : null;
}

const fail = (status: number, error: string) => Response.json({ error }, { status });

// GET /api/imagery/:body?lat=&lon=&date=YYYY-MM-DD
export default [
	get("/api/imagery/:body", async (request, params) => {
		const q = new URL(request.url).searchParams;
		const [lat, lon] = [Number(q.get("lat")), Number(q.get("lon"))];
		if (!(lat >= -90 && lat <= 90)) return fail(400, "lat must be -90 to 90");
		if (!(lon >= 0 && lon <= 360)) return fail(400, "lon must be 0 to 360 east");
		const images = imagery(String(params.body), lat, lon, q.get("date") ?? "");
		if (!images) return fail(404, "no imagery for this body");
		return Response.json({ images }, { headers: { "cache-control": "public, max-age=86400" } });
	}),
];
