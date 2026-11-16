import { Button } from "interface/button";
import ArrowSeparateVertical from "interface/icon/arrow-separate-vertical.svg";
import ArrowUnionVertical from "interface/icon/arrow-union-vertical.svg";
import Xmark from "interface/icon/xmark.svg";
import { Panel } from "interface/panel";
import { type Candidate, removeCandidate, savedCandidates } from "interface/sites/store";
import { keepHref } from "interface/sites/url";
import { Tooltip } from "interface/tooltip";
import { useState } from "react";
import { classNames, useHydrated } from "system";

// Comparison chrome for the bottom panel: candidate chips, expand, and panel height.
// The samples table is horizon/Reading — a different module.

// Compact ×: 24px, only while the chip is hovered or the control is focused.
const unlinkClass =
	"absolute top-0 right-0 border-0 bg-neutral/90 opacity-0 group-hover:opacity-100 focus-visible:opacity-100";

// Candidates live in this browser; re-read after save/remove so the strip stays in step.
export function useCandidates(): [Candidate[], () => void] {
	const hydrated = useHydrated();
	const [list, setList] = useState<Candidate[] | null>(null);
	const items = list ?? (hydrated ? savedCandidates() : []);
	return [items, () => setList(savedCandidates())];
}

// Expands the reading to fill the screen, or collapses it back to the bottom strip.
export function ExpandReading({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
	const label = expanded ? "Collapse reading" : "Expand reading";
	return (
		<Tooltip label={label}>
			<Button
				aria-label={label}
				aria-pressed={expanded}
				className="px-0 aspect-square border-0"
				onClick={onToggle}
			>
				{expanded ? <ArrowUnionVertical icon /> : <ArrowSeparateVertical icon />}
			</Button>
		</Tooltip>
	);
}

// Reserved while the reading is full screen: the site and window that the side panels would show.
export function ReadingContext({ site, window }: { site?: string; window: string }) {
	return (
		<div className="flex items-center gap-sm px-md min-h-control text-caption uppercase tabular-nums">
			{site ? (
				<>
					<span>{site}</span>
					<span className="text-secondary" aria-hidden="true">
						·
					</span>
				</>
			) : null}
			<span>{window}</span>
		</div>
	);
}

// Saved candidates as boxes: site over window, click to open, × to remove.
export function candidateLabel(candidate: Candidate) {
	return `${candidate.site} ${candidate.window}`;
}

export function CandidatesStrip({
	items,
	current,
	onRemove,
}: {
	items: Candidate[];
	current?: string;
	onRemove?: (code: string) => void;
}) {
	if (!items.length) return null;
	// Keep camera pose from the live URL; drop time so a new window starts clean.
	const live =
		typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
	return (
		<ul aria-label="Candidates" className="flex items-stretch gap-sm p-xs overflow-x-auto">
			{items.map((candidate) => {
				const label = candidateLabel(candidate);
				const href = keepHref(
					`/${candidate.body}/sites/${encodeURIComponent(candidate.site)}`,
					{ window: candidate.window, time: null },
					live,
				);
				const selected = candidate.code === current;
				return (
					<li key={candidate.code} className="group relative flex shrink-0 border border-control">
						<a
							href={href}
							aria-current={selected ? "true" : undefined}
							aria-label={`Candidate ${label}`}
							className={classNames(
								"flex flex-col justify-center px-md",
								"text-caption uppercase tabular-nums no-underline text-default leading-standard",
								"hover:bg-neutralHover pressed:bg-neutralActive",
							)}
						>
							<span>{candidate.site}</span>
							<span className="text-secondary text-caption">{candidate.window}</span>
						</a>
						<Tooltip label={`Unlink ${label}`}>
							<Button
								size="compact"
								aria-label={`Unlink ${label} from comparison`}
								className={unlinkClass}
								onClick={() => {
									removeCandidate(candidate.code);
									onRemove?.(candidate.code);
								}}
							>
								<Xmark icon />
							</Button>
						</Tooltip>
					</li>
				);
			})}
		</ul>
	);
}

// Bottom bar of candidate boxes when there is no full reading yet (home, or sites without a pick).
export function CandidatesBar({ current }: { current?: string }) {
	const [items, refresh] = useCandidates();
	if (!items.length) return null;
	return (
		<Panel as="section" aria-label="Candidates" className="max-w-none shrink-0">
			<CandidatesStrip items={items} current={current} onRemove={refresh} />
		</Panel>
	);
}

// Panel height: a bottom strip, or the full main column when expanded.
export const readingClass = (expanded: boolean) =>
	expanded
		? "max-w-none flex-1 min-h-0 divide-y divide-divider"
		: "max-w-none shrink-0 h-[30dvh] min-h-[15rem] divide-y divide-divider";
