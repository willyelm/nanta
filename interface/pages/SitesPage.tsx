import { Loader, Panels } from "interface/panel";
import { CandidatesBar, readingClass } from "interface/sites/CandidatesBar";
import { ConditionsPanel, ReadingSkeleton } from "interface/sites/ConditionsPanel";
import { SitesPanel, SitesSkeleton } from "interface/sites/SitesPanel";
import { useKeep } from "interface/sites/url";
import { useView } from "interface/space";
import { WindowsPanel } from "interface/windows";
import { replace, useParams, useSearchParams } from "system";
import { nantaTitle, sitesDetail } from "./title";

// /{body}/sites and /{body}/sites/{site}: Sites and Windows beside the model.
// With a site, Reading across the bottom. Without one, saved candidates still keep the comparison
// bar. Expanding fills the screen; the window, time, and expansion stay in the query:
// ?window=&time=&reading=full.
export function SitesPage() {
	const { code, site = "" } = useParams();
	const params = useSearchParams();
	const window = params.get("window") ?? "TODAY";
	const expanded = params.get("reading") === "full";
	const keep = useKeep();
	useView({ body: code });
	const shown = { code, site, window };
	const here = `/${code}/sites${site ? `/${encodeURIComponent(site)}` : ""}`;
	const toggle = () => replace(keep(here, { reading: expanded ? null : "full" }));
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
						<WindowsPanel here={here} window={window} model={!site} />
					</Loader>
				</Panels>
			)}
			{reading ? (
				<Loader
					label="Loading the reading…"
					error="Couldn't load the reading."
					className={readingClass(expanded)}
					fallback={<ReadingSkeleton />}
				>
					<ConditionsPanel {...shown} expanded={expanded} onExpand={toggle} />
				</Loader>
			) : (
				<CandidatesBar />
			)}
		</>
	);
}
