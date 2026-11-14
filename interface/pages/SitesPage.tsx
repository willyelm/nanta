import { Suspense } from "react";
import type { SitePage } from "site";
import { type Api, Catch, json, resumable, useNavigating, useSearchParams } from "system";
import { Layout } from "./Layout";

// Small pages, so pagination shows with the sample catalog.
const LIMIT = 2;

// The URL is the state (/sites?q=apollo&page=2), so refreshes and shared links render the same
// view. The form and links are plain HTML: the router navigates in place.
export function SitesPage() {
	const params = useSearchParams();
	const q = params.get("q") ?? "";
	const page = Number(params.get("page")) || 1;
	const navigating = useNavigating();

	return (
		<Layout>
			<p>
				<a href="/">← Home</a>
			</p>
			<h2>Sites</h2>
			<search>
				<form method="get">
					<input
						type="search"
						name="q"
						defaultValue={q}
						key={q}
						placeholder="Search sites"
						aria-label="Search sites"
					/>{" "}
					<button type="submit">Search</button>
				</form>
			</search>
			<Catch fallback={<p role="alert">Couldn't load sites.</p>}>
				<Suspense fallback={<p aria-busy="true">Loading sites…</p>}>
					<div aria-busy={navigating}>
						<Results q={q} page={page} />
					</div>
				</Suspense>
			</Catch>
		</Layout>
	);
}

const [, useSites] = resumable(async (api: Api, q: string, page: number) => {
	const query = new URLSearchParams({ q, page: String(page), limit: String(LIMIT) });
	return json<SitePage>(api(`/api/sites?${query}`));
});

function Results({ q, page }: { q: string; page: number }) {
	const result = useSites(q, page);
	const pageLink = (n: number) => `?${new URLSearchParams({ ...(q && { q }), page: String(n) })}`;

	return (
		<>
			<p aria-live="polite">
				{result.total} {result.total === 1 ? "site" : "sites"}
			</p>
			<ul>
				{result.items.map((s) => (
					<li key={s.id}>
						{s.name} · {s.lat.toFixed(3)}°, {s.lon.toFixed(3)}°E
					</li>
				))}
			</ul>
			<nav aria-label="Pages">
				{result.page > 1 ? <a href={pageLink(result.page - 1)}>← Previous</a> : "← Previous"}
				{` · Page ${result.page} of ${result.pages} · `}
				{result.page < result.pages ? <a href={pageLink(result.page + 1)}>Next →</a> : "Next →"}
			</nav>
		</>
	);
}
