import type { Positions } from "position";
import { Suspense } from "react";
import { type Api, Catch, json, resumable } from "system";
import { Layout } from "./Layout";

// Sample fetches to test the API after deploying.
const QUERY = "site=south-pole&from=2027-03-01&to=2027-03-03&step=6h";
const SUN = `/api/positions/sun?${QUERY}`;
const EARTH = `/api/positions/earth?${QUERY}`;

export function HomePage() {
	return (
		<Layout>
			<h2>Sample: south pole, March 1 to 3, 2027</h2>
			<table>
				<thead>
					<tr>
						<th>Time (UTC)</th>
						<th>Sun elevation</th>
						<th>Earth elevation</th>
					</tr>
				</thead>
				<Catch fallback={<Failed />}>
					<Suspense fallback={<Skeleton />}>
						<Rows />
					</Suspense>
				</Catch>
			</table>
			<p>
				<a href="/sites">Browse sites</a>
			</p>
			<p>
				API: <a href="/api/sites">Sites</a> · <a href={SUN}>Sun</a> · <a href={EARTH}>Earth</a>
			</p>
		</Layout>
	);
}

const [, usePositions] = resumable(async (api: Api) => {
	const [sun, earth] = await Promise.all([json<Positions>(api(SUN)), json<Positions>(api(EARTH))]);
	return { sun, earth };
});

function Rows() {
	const { sun, earth } = usePositions();
	return (
		<tbody>
			{sun.positions.map((s, i) => (
				<tr key={s.time}>
					<td>{s.time.slice(0, 16).replace("T", " ")}</td>
					<td>{s.elevation.toFixed(2)}°</td>
					<td>{earth.positions[i]?.elevation.toFixed(2)}°</td>
				</tr>
			))}
		</tbody>
	);
}

// Placeholder rows while positions load.
function Skeleton() {
	return (
		<tbody aria-busy="true">
			{[0, 1, 2, 3].map((i) => (
				<tr key={i}>
					<td>Loading…</td>
					<td>—</td>
					<td>—</td>
				</tr>
			))}
		</tbody>
	);
}

function Failed() {
	return (
		<tbody>
			<tr>
				<td colSpan={3} role="alert">
					Couldn't load positions.
				</td>
			</tr>
		</tbody>
	);
}
