import { Button } from "interface/button";
import EditPencil from "interface/icon/edit-pencil.svg";
import { Panel, PanelBar } from "interface/panel";
import { type Shown, useSites } from "interface/sites/data";
import { SiteCard, SiteView } from "interface/sites/SiteCard";
import { useKeep } from "interface/sites/url";
import { Tooltip } from "interface/tooltip";

// One site: back to the body's sites, its code, and where it is.
export function SitePanel({ code, site }: Shown) {
	const keep = useKeep();
	const selected = useSites(code).find((item) => item.code === site);
	if (!selected) {
		return (
			<Panel as="section" aria-label="Site" className="divide-y divide-divider">
				<PanelBar back={keep(`/${code}/sites`)} title={site} />
				<p role="alert" className="p-md">
					No site {site} on this body.
				</p>
			</Panel>
		);
	}
	return (
		<Panel as="section" aria-label={`Site ${selected.code}`} className="divide-y divide-divider">
			<SiteView site={selected} />
			<PanelBar
				back={keep(`/${code}/sites`)}
				title={selected.code}
				action={
					<Tooltip label={`Edit ${selected.code}`}>
						<Button
							as="a"
							href={keep(`/${code}/sites/${encodeURIComponent(selected.code)}/edit`)}
							aria-label={`Edit ${selected.code}`}
							className="px-0 aspect-square border-0"
						>
							<EditPencil icon />
						</Button>
					</Tooltip>
				}
			/>
			<div className="p-md">
				<SiteCard site={selected} />
			</div>
		</Panel>
	);
}
