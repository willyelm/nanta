import { Button } from "interface/button";
import ArrowDown from "interface/icon/arrow-down.svg";
import ArrowSeparateVertical from "interface/icon/arrow-separate-vertical.svg";
import ArrowUnionVertical from "interface/icon/arrow-union-vertical.svg";
import ArrowUp from "interface/icon/arrow-up.svg";
import NavArrowDown from "interface/icon/nav-arrow-down.svg";
import NavArrowUp from "interface/icon/nav-arrow-up.svg";
import Xmark from "interface/icon/xmark.svg";
import { Overlay } from "interface/overlay";
import { Panel } from "interface/panel";
import { compare, type State } from "interface/sites/compare";
import { type Shown, useShown } from "interface/sites/data";
import { type Candidate, removeCandidate, savedCandidates } from "interface/sites/store";
import { keepHref } from "interface/sites/url";
import { Skeleton } from "interface/skeleton";
import { Tooltip } from "interface/tooltip";
import { stamp } from "interface/windows";
import { Fragment, type ReactNode, Suspense, useRef, useState } from "react";
import { classNames, useHydrated } from "system";

// Comparison chrome for the bottom panel: candidate chips, expand, and panel height.
// The samples table is horizon/Reading — a different module.

// Compact ×: 24px, only while the box is hovered or the control is focused.
const cornerClass =
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
				className="px-0 w-control border-0"
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

// Saved candidates as boxes: body/site over window, click to open, × to remove.
export function candidateLabel(candidate: Candidate) {
	return `${candidate.body}/${candidate.site} ${candidate.window}`;
}

export function CandidatesStrip({
	items,
	current,
	against,
	onRemove,
}: {
	items: Candidate[];
	current?: string;
	against?: Shown & { at: number };
	onRemove?: (code: string) => void;
}) {
	if (!items.length) return null;
	// Keep camera pose from the live URL; drop time so a new window starts clean.
	const live =
		typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
	return (
		<ul
			aria-label="Candidates"
			// No scrollbar: it would add its height to the bar. It still scrolls sideways.
			className="flex flex-1 min-h-control items-stretch overflow-x-auto [scrollbar-width:none] divide-x divide-divider"
		>
			{items.map((candidate) => {
				const label = candidateLabel(candidate);
				const href = keepHref(
					`/${candidate.body}/sites/${encodeURIComponent(candidate.site)}`,
					{ window: candidate.window, time: null },
					live,
				);
				const selected = candidate.code === current;
				return (
					<CandidateBox
						key={candidate.code}
						candidate={candidate}
						against={selected ? undefined : against}
					>
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
							<span>
								{candidate.body}/{candidate.site}
							</span>
							<span className="text-secondary text-caption">{candidate.window}</span>
						</a>
						<Tooltip label={`Unpin ${label}`}>
							<Button
								size="compact"
								aria-label={`Unpin ${label}`}
								className={cornerClass}
								onClick={() => {
									removeCandidate(candidate.code);
									onRemove?.(candidate.code);
								}}
							>
								<Xmark icon />
							</Button>
						</Tooltip>
					</CandidateBox>
				);
			})}
		</ul>
	);
}

// One box. With a reading to compare against, hovering previews the diff in a popover and the
// compare button, always on its left, keeps it open (until Escape or a click outside), so its text can be selected and copied.
// The popover is inside the box, so moving onto it keeps the preview.
function CandidateBox({
	candidate,
	against,
	children,
}: {
	candidate: Candidate;
	against?: Shown & { at: number };
	children: ReactNode;
}) {
	const card = useRef<HTMLDivElement>(null);
	const pinned = useRef(false);
	const [loaded, setLoaded] = useState(false);
	// The card opens below, left-aligned, or flips above when there's no room; the chevron
	// points to it.
	const [below, setBelow] = useState(true);
	const label = candidateLabel(candidate);
	const timer = useRef(0);
	const isOpen = () => !!card.current?.matches(":popover-open");
	const open = () => {
		clearTimeout(timer.current);
		setLoaded(true);
		if (!isOpen()) card.current?.showPopover?.();
	};
	// A short grace, so the pointer can cross the gap onto the card.
	const close = () => {
		timer.current = window.setTimeout(() => {
			if (!pinned.current) card.current?.hidePopover?.();
		}, 200);
	};
	return (
		<li
			className="group relative flex shrink-0"
			onPointerEnter={against ? open : undefined}
			onPointerLeave={against ? close : undefined}
		>
			{against ? (
				<Overlay placement="bottom" align="start">
					<Button
						aria-label={`Compare ${label} with the reading`}
						className="self-stretch h-auto px-sm border-0"
						onClick={(event) => {
							setLoaded(true);
							// Open from the hover preview: keep it open instead of toggling it shut.
							if (isOpen() && !pinned.current) event.preventDefault();
							pinned.current = !pinned.current || !isOpen();
						}}
					>
						{below ? <NavArrowDown icon /> : <NavArrowUp icon />}
					</Button>
					<div
						ref={card}
						role="dialog"
						aria-label={`${label} against the reading`}
						// Clear of the bar, so the card reads as its own layer.
						style={{ margin: 0, marginBlock: "var(--spacing-sm)" }}
						className="p-md min-w-[22rem] max-w-[90vw] bg-neutral/80 backdrop-blur-panel border border-control text-caption select-text"
						onPointerEnter={open}
						onPointerLeave={close}
						onToggle={(event) => {
							if (event.newState === "closed") pinned.current = false;
							else
								requestAnimationFrame(() => {
									const c = card.current;
									const box = c?.parentElement;
									if (c && box)
										setBelow(c.getBoundingClientRect().top > box.getBoundingClientRect().top);
								});
						}}
					>
						{loaded ? (
							<Suspense fallback={<DiffSkeleton />}>
								<CandidateDiff against={against} candidate={candidate} />
							</Suspense>
						) : null}
					</div>
				</Overlay>
			) : null}
			{children}
		</li>
	);
}

// The comparison's shape while the candidate loads: per condition, a header and three rows of
// four columns.
function DiffSkeleton() {
	return (
		<div role="status" className="flex flex-col gap-md">
			{[1, 2].map((group) => (
				<div key={group} className="flex flex-col gap-xs">
					{[1, 2, 3, 4].map((line) => (
						<div key={line} className="flex gap-md">
							<Skeleton width="12ch" height="0.75rem" />
							<Skeleton width="12ch" height="0.75rem" />
							<Skeleton width="12ch" height="0.75rem" />
							<Skeleton width="6ch" height="0.75rem" />
						</div>
					))}
				</div>
			))}
			<span className="sr-only">Loading the comparison…</span>
		</div>
	);
}

// Up or down from the horizon as an arrow, named by its tooltip ("Sun up", "Earth down").
function Updown({ state }: { state?: State }) {
	if (!state) return null;
	const Arrow = state.up ? ArrowUp : ArrowDown;
	return (
		<Tooltip label={state.name}>
			<span role="img" aria-label={state.name} className="inline-flex align-middle">
				<Arrow icon />
			</span>
		</Tooltip>
	);
}

const trendClass = { more: "text-more", less: "text-less" };

// The reading in view against the hovered candidate, at the same hour into each window: per
// condition, the two readings side by side, the candidate with its change from the current.
function CandidateDiff({
	against,
	candidate,
}: {
	against: Shown & { at: number };
	candidate: Candidate;
}) {
	const current = useShown(against);
	const other = useShown({ code: candidate.body, site: candidate.site, window: candidate.window });
	const groups = compare({ ...current, at: against.at }, { ...other, at: against.at });
	// When each side is read: the same hour into each window, as a date and hour, so it is clear.
	const when = (first: { time: string }[]) => stamp(first[Math.min(against.at, first.length - 1)]);
	return (
		<div className="grid grid-cols-3 gap-x-md gap-y-nano whitespace-nowrap tabular-nums">
			<span className="text-secondary">UTC</span>
			<span>{when(current.first)}</span>
			<span>{when(other.first)}</span>
			<span className="col-span-3 h-sm" />
			{groups.map((group, index) => (
				<Fragment key={group.condition}>
					{index ? <span className="col-span-3 h-sm" /> : null}
					<span className="uppercase">{group.condition}</span>
					<span className="uppercase text-secondary">
						{against.code}/{against.site} {against.window}
					</span>
					<span className="uppercase text-secondary">{candidateLabel(candidate)}</span>
					{group.rows.map((row) => {
						const same =
							row.current === row.candidate && row.up?.current?.up === row.up?.candidate?.up;
						return (
							<Fragment key={row.fact}>
								<span className="text-secondary">{row.fact}</span>
								<span>
									{row.current} <Updown state={row.up?.current} />
								</span>
								{same ? (
									<span className="text-secondary">same</span>
								) : (
									<span>
										{row.candidate} <Updown state={row.up?.candidate} />
										{row.change ? (
											<span className={row.trend ? trendClass[row.trend] : undefined}>
												{" "}
												({row.change})
											</span>
										) : null}
									</span>
								)}
							</Fragment>
						);
					})}
				</Fragment>
			))}
		</div>
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

// Panel height: a bottom strip, or the full main column when expanded. Both start from 30dvh and
// only flex-grow changes, so expanding animates (a height to "the rest" can't). mt-auto keeps it
// on the bottom when the panels above leave, so it grows upward instead of jumping to the top.
export const readingClass = (expanded: boolean) =>
	[
		"max-w-none divide-y divide-divider basis-[30dvh] min-h-[15rem] shrink-0 mt-auto",
		"transition-[flex-grow] duration-(--duration-size) ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
		expanded ? "grow" : "grow-0",
	].join(" ");
