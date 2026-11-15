import type { Body } from "body";
import { Skeleton } from "interface/skeleton";
import { Suspense } from "react";
import { type Api, Catch, json, resumable } from "system";

const [, useBodies] = resumable(async (api: Api) => json<Body[]>(api("/api/bodies")));

export function HomePage() {
	return (
		<div className="flex flex-col gap-lg">
			<h2>Body</h2>
			<Catch fallback={<p role="alert">Couldn't load bodies.</p>}>
				<Suspense
					fallback={
						<div role="status" aria-busy="true" className="flex flex-col gap-md">
							<span className="sr-only">Loading bodies…</span>
							{[1, 2, 3].map((key) => (
								<Skeleton key={key} height="10rem" />
							))}
						</div>
					}
				>
					<Bodies />
				</Suspense>
			</Catch>
		</div>
	);
}

function Bodies() {
	const bodies = useBodies();
	return (
		<nav className="flex flex-col flex-wrap gap-md" aria-label="Body">
			{bodies.map((body) => (
				<a
					key={body.code}
					className="flex flex-col gap-md flex-[1_1_16rem] min-h-control p-lg border border-control bg-neutral text-default no-underline hover:bg-neutralHover pressed:bg-neutralActive"
					href={`/${body.code}/sites`}
				>
					<span className="text-heading">{body.name}</span>
					<dl className="grid grid-cols-[6.5rem_1fr] gap-x-md gap-y-xs">
						{body.latin ? (
							<>
								<dt className="text-secondary">Latin</dt>
								<dd>{body.latin}</dd>
							</>
						) : null}
						<dt className="text-secondary">Horizons</dt>
						<dd>{body.code}</dd>
						<dt className="text-secondary">Air</dt>
						<dd>{body.air}</dd>
						<dt className="text-secondary">Solar day</dt>
						<dd>{body.day}</dd>
						<dt className="text-secondary">Radius</dt>
						<dd>{body.radius}</dd>
					</dl>
				</a>
			))}
		</nav>
	);
}
