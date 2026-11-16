import { Loader, Panels } from "interface/panel";
import { ConditionsPanel } from "interface/sites/ConditionsPanel";
import { SiteFormPanel } from "interface/sites/SiteFormPanel";
import { SitePanel } from "interface/sites/SitePanel";
import { SitesPanel, SitesSkeleton } from "interface/sites/SitesPanel";
import { useView } from "interface/space";
import { TimePanel, WindowsPanel } from "interface/windows";
import { useParams, useSearchParams } from "system";

// /{body}/sites, /{body}/sites/{site}, /new and /edit are one page over space: location on the
// left, windows on the right, and across the bottom the time, or a site's conditions. The window
// and the time stay in the query: ?window=&time=.
function Sites({ adding = false, editing = false }: { adding?: boolean; editing?: boolean }) {
	const { code, site = "" } = useParams();
	const params = useSearchParams();
	// NOW, today from Horizons, unless the URL names another window.
	const window = params.get("window") ?? "NOW";
	useView({ body: code });
	const shown = { code, site, window };
	const ready = !adding && !editing && site && window;

	// Three areas over space: location on the left (the body's sites, one site, or the site form;
	// back goes up a level), windows on the right, and the conditions across the bottom.
	return (
		<>
			<Panels>
				<Loader label="Loading sites…" error="Couldn't load sites." fallback={<SitesSkeleton />}>
					{adding ? (
						<SiteFormPanel code={code} />
					) : editing ? (
						<SiteFormPanel code={code} editing={site} />
					) : site ? (
						<SitePanel {...shown} />
					) : (
						<SitesPanel {...shown} />
					)}
				</Loader>
				{!adding && !editing ? (
					<Loader label="Loading windows…" error="Couldn't load the windows.">
						<WindowsPanel
							here={`/${code}/sites${site ? `/${encodeURIComponent(site)}` : ""}`}
							window={window}
						/>
					</Loader>
				) : null}
			</Panels>
			{!adding && !editing && !site && window ? (
				<Loader
					label="Loading the window…"
					error="Couldn't load the window."
					className="max-w-none"
				>
					<TimePanel window={window} />
				</Loader>
			) : null}
			{ready ? (
				<Loader
					label="Loading conditions…"
					error="Couldn't load the conditions."
					className="max-w-none shrink-0 h-[30dvh] min-h-[15rem]"
				>
					<ConditionsPanel {...shown} />
				</Loader>
			) : null}
		</>
	);
}

// /{body}/sites: the sites. /{body}/sites/{site}: one site. /{body}/sites/new and
// /{body}/sites/{site}/edit: the form, empty or filled.
export const SitesPage = () => <Sites />;
export const SitePage = () => <Sites />;
export const NewSitePage = () => <Sites adding />;
export const EditSitePage = () => <Sites editing />;
