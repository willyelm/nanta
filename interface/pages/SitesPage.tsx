import { Loader, Panels } from "interface/panel";
import { ConditionsPanel } from "interface/sites/ConditionsPanel";
import { readingClass } from "interface/sites/Reading";
import { SitesPanel, SitesSkeleton } from "interface/sites/SitesPanel";
import { useView } from "interface/space";
import { TimePanel, WindowsPanel } from "interface/windows";
import { useState } from "react";
import { useParams, useSearchParams } from "system";

// /{body}/sites and /{body}/sites/{site}: Site Navigator and Window Selection beside the model,
// Reading across the bottom. Expanding the reading fills the screen and keeps site · window in a
// strip; the window and time stay in the query: ?window=&time=.
export function SitesPage() {
	const { code, site = "" } = useParams();
	const params = useSearchParams();
	const window = params.get("window") ?? "NOW";
	const [expanded, setExpanded] = useState(false);
	useView({ body: code });
	const shown = { code, site, window };
	const here = `/${code}/sites${site ? `/${encodeURIComponent(site)}` : ""}`;
	const toggle = () => setExpanded((open) => !open);

	return (
		<>
			{expanded ? null : (
				<Panels>
					<Loader label="Loading sites…" error="Couldn't load sites." fallback={<SitesSkeleton />}>
						<SitesPanel {...shown} />
					</Loader>
					<Loader label="Loading windows…" error="Couldn't load the windows.">
						<WindowsPanel here={here} window={window} />
					</Loader>
				</Panels>
			)}
			{!site && window ? (
				<Loader
					label="Loading the reading…"
					error="Couldn't load the reading."
					className={expanded ? "max-w-none flex-1 min-h-0" : "max-w-none"}
				>
					<TimePanel window={window} expanded={expanded} onExpand={toggle} />
				</Loader>
			) : null}
			{site && window ? (
				<Loader
					label="Loading the reading…"
					error="Couldn't load the reading."
					className={readingClass(expanded)}
				>
					<ConditionsPanel {...shown} expanded={expanded} onExpand={toggle} />
				</Loader>
			) : null}
		</>
	);
}
