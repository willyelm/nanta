import { Loader, Panels } from "interface/panel";
import { ConditionsPanel } from "interface/sites/ConditionsPanel";
import { CandidatesBar, readingClass } from "interface/sites/CandidatesBar";
import { SitesPanel, SitesSkeleton } from "interface/sites/SitesPanel";
import { useView } from "interface/space";
import { WindowsPanel } from "interface/windows";
import { useState } from "react";
import { useParams, useSearchParams } from "system";
import { nantaTitle, sitesDetail } from "./title";

// /{body}/sites and /{body}/sites/{site}: Site Navigator and Window Selection beside the model.
// With a site, Reading across the bottom. Without one, saved candidates still keep the comparison
// bar. Expanding fills the screen; the window and time stay in the query: ?window=&time=.
export function SitesPage() {
	const { code, site = "" } = useParams();
	const params = useSearchParams();
	const window = params.get("window") ?? "TODAY";
	const [expanded, setExpanded] = useState(false);
	useView({ body: code });
	const shown = { code, site, window };
	const here = `/${code}/sites${site ? `/${encodeURIComponent(site)}` : ""}`;
	const toggle = () => setExpanded((open) => !open);
	const reading = Boolean(site && window);

	return (
		<>
			<title>{nantaTitle(sitesDetail(code, site, window))}</title>
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
			{reading ? (
				<Loader
					label="Loading the reading…"
					error="Couldn't load the reading."
					className={readingClass(expanded)}
				>
					<ConditionsPanel {...shown} expanded={expanded} onExpand={toggle} />
				</Loader>
			) : (
				<CandidatesBar />
			)}
		</>
	);
}
