import { Button } from "interface/button";
import Plus from "interface/icon/plus.svg";
import { List, ListItem, Panel, PanelBar } from "interface/panel";
import { type Shown, useBody, useSites } from "interface/sites/data";
import { SiteCard } from "interface/sites/SiteCard";
import { useKeep } from "interface/sites/url";
import { Skeleton } from "interface/skeleton";
import { Tooltip } from "interface/tooltip";

// The navigator: back, the body, add, and its sites to choose from, the current one marked.
export function SitesPanel({ code, site }: Shown) {
	const body = useBody(code);
	const keep = useKeep();
	const items = useSites(code).sort((a, b) => Number(b.code === "SCR") - Number(a.code === "SCR"));
	const selected = items.find((item) => item.code === site);
	// Changing the site keeps the window and time: mix and match.
	const href = (next: string) => keep(`/${code}/sites/${encodeURIComponent(next)}`);

	return (
		<Panel as="nav" aria-label="Sites" className="divide-y divide-divider">
			<PanelBar
				back={keep("/")}
				title={`${body.name} ${body.code}`}
				action={
					<Tooltip label="Add a site">
						<Button
							as="a"
							variant="accent"
							href={keep(`/${code}/sites/new`)}
							aria-label="Add a site"
							className="px-0 aspect-square border-0"
						>
							<Plus icon />
						</Button>
					</Tooltip>
				}
			/>

			<List aria-label="Sites">
				{items.map((item) => (
					<ListItem key={item.code} href={href(item.code)} current={item.code === selected?.code}>
						<SiteCard site={item} />
					</ListItem>
				))}
			</List>
		</Panel>
	);
}

// The site list while it loads: the bar, then rows shaped like the cards.
export function SitesSkeleton() {
	return (
		<div aria-hidden="true" className="flex flex-col divide-y divide-divider">
			<Skeleton height="var(--spacing-control)" />
			{[1, 2, 3, 4].map((row) => (
				<div key={row} className="flex gap-md p-lg">
					<Skeleton className="flex-1" height="var(--spacing-row)" />
					<Skeleton width="var(--spacing-chart)" height="var(--spacing-row)" />
					<Skeleton width="var(--spacing-chart)" height="var(--spacing-row)" />
				</div>
			))}
		</div>
	);
}
