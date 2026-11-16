import Xmark from "interface/icon/xmark.svg";
import { List, ListItem, Panel, PanelBar, Panels } from "interface/panel";
import { type Candidate, removeCandidate, savedCandidates } from "interface/sites/store";
import { Tooltip } from "interface/tooltip";
import { useState } from "react";
import { useHydrated } from "system";

const bodies: Record<string, string> = { "301": "Moon", "399": "Earth", "499": "Mars" };

// Your plans: each a site and a window you saved, opened back where you saved it. They live in
// this browser, so the list fills in once the page is running there.
export function CandidatesPage() {
	const hydrated = useHydrated();
	const [list, setList] = useState<Candidate[] | null>(null);
	const items = list ?? (hydrated ? savedCandidates() : []);
	const remove = (code: string) => {
		removeCandidate(code);
		setList(savedCandidates());
	};

	return (
		<Panels>
			<Panel as="nav" aria-label="Candidates" className="divide-y divide-divider">
				<PanelBar back="/" title="Candidates" />
				{items.length ? (
					<List>
						{items.map((c) => (
							<ListItem
								key={c.code}
								href={`/${c.body}/sites/${encodeURIComponent(c.site)}?${new URLSearchParams({ window: c.window })}`}
								action={
									<Tooltip label="Remove">
										<button
											type="button"
											aria-label={`Remove ${c.code}`}
											className="flex items-center justify-center aspect-square min-h-control hover:bg-neutralHover"
											onClick={() => remove(c.code)}
										>
											<Xmark icon />
										</button>
									</Tooltip>
								}
							>
								<span className="text-heading uppercase">{c.code}</span>
								<span className="text-caption text-secondary">
									{bodies[c.body] ?? c.body} · site {c.site} · window {c.window}
								</span>
							</ListItem>
						))}
					</List>
				) : (
					<p className="p-md">
						No candidates yet. Pick a site and a window, then save them as a candidate.
					</p>
				)}
			</Panel>
		</Panels>
	);
}
