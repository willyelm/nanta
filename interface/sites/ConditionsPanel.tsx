import { Button } from "interface/button";
import { Conditions } from "interface/horizon/Conditions";
import { HorizonChart } from "interface/horizon/HorizonChart";
import { Reading } from "interface/horizon/Reading";
import Pin from "interface/icon/pin.svg";
import PinSlash from "interface/icon/pin-slash.svg";
import { Panel } from "interface/panel";
import {
	CandidatesStrip,
	ExpandReading,
	ReadingContext,
	readingClass,
	useCandidates,
} from "interface/sites/CandidatesBar";
import { type Shown, useShown } from "interface/sites/data";
import { Imagery } from "interface/sites/Imagery";
import {
	candidateCode,
	removeCandidate,
	saveCandidate,
	savedCandidates,
} from "interface/sites/store";
import { useKeep, useTimeScrub } from "interface/sites/url";
import { Skeleton } from "interface/skeleton";
import { Slider } from "interface/slider";
import { useView } from "interface/space";
import { Tooltip } from "interface/tooltip";
import { stamp } from "interface/windows";
import { useState } from "react";
import { useHydrated, useLocation, useSearchParams } from "system";

// Index of the sample the URL names, or the current hour in the window, or the first.
function indexOf(first: { time: string }[], wanted: string) {
	const found = first.findIndex((sample) => sample.time.startsWith(wanted));
	const current = first.findLastIndex((sample) => Date.parse(sample.time) <= Date.now());
	return wanted && found >= 0 ? found : Math.max(current, 0);
}

// The reading across the bottom: horizon over the table, conditions with the time scrub, and
// imagery of the site. Expand
// fills the screen; while expanded, a strip keeps the site and window in view.
export function ConditionsPanel({
	expanded = false,
	onExpand,
	...shown
}: Shown & { expanded?: boolean; onExpand?: () => void }) {
	const { list, sky, first, fetched, chosen } = useShown(shown);
	const keep = useKeep();
	const params = useSearchParams();
	const { pathname } = useLocation();
	const wanted = params.get("time") ?? "";
	const { at, setTime, onDragStart, onDragEnd } = useTimeScrub(indexOf(first, wanted), (index) => {
		const sample = first[index];
		return keep(pathname, { time: sample?.time.slice(0, 16) ?? null });
	});
	const time = stamp(first[at]);
	const [candidates, refreshCandidates] = useCandidates();
	const current = candidateCode(shown.site, shown.window);
	// Look-for sight flags come from SiteForm/SiteView while placing; otherwise Space derives
	// them from which bodies are in `sky`.
	useView({
		sky,
		at,
		time: first[at] ? Date.parse(first[at].time) : undefined,
	});
	return (
		<Panel as="section" aria-label="Reading" className={readingClass(expanded)}>
			<div className="flex min-h-control items-stretch divide-x divide-divider">
				<div className="flex flex-1 min-w-0">
					{candidates.length ? (
						<CandidatesStrip
							items={candidates}
							current={current}
							against={{ ...shown, at }}
							onRemove={refreshCandidates}
						/>
					) : expanded ? (
						<ReadingContext site={shown.site} window={shown.window} />
					) : null}
				</div>
				<PinCandidate {...shown} onChange={refreshCandidates} />
				{onExpand ? <ExpandReading expanded={expanded} onToggle={onExpand} /> : null}
			</div>
			<div className="grid flex-1 min-h-0 gap-md p-md md:grid-cols-4">
				<div className="flex flex-col gap-md min-h-0 min-w-0 overflow-auto">
					<div className="aspect-square w-full shrink-0">
						<HorizonChart
							list={list}
							sky={sky}
							at={at}
							onPick={setTime}
							onDragStart={onDragStart}
							onFlush={onDragEnd}
						/>
					</div>
					{fetched ? (
						<p className="text-caption text-secondary tabular-nums">
							Last updated {fetched.slice(0, 16).replace("T", " ")} UTC, JPL Horizons
						</p>
					) : null}
					<Reading list={list} sky={sky} at={at} />
				</div>
				<div className="md:col-span-2 flex flex-col gap-md min-h-0 overflow-auto">
					<div className="flex flex-col gap-xs shrink-0 min-w-0">
						<div className="flex items-end justify-between gap-sm text-caption tabular-nums">
							<span className="text-secondary">{stamp(first[0])}</span>
							{/* The scrubbed time drives the scene: date over a larger time of day. */}
							<output htmlFor="reading-time" className="flex flex-col items-center text-default">
								<span>{time.slice(0, 10)}</span>
								<span className="text-heading">{time.slice(11)} UTC</span>
							</output>
							<span className="text-secondary">{stamp(first[first.length - 1])}</span>
						</div>
						<Slider
							id="reading-time"
							label="Time"
							min={0}
							max={Math.max(first.length - 1, 0)}
							value={at}
							valueText={`${time} UTC`}
							onChange={setTime}
							onChangeStart={onDragStart}
							onChangeEnd={onDragEnd}
						/>
					</div>
					<Conditions list={list} sky={sky} at={at} />
				</div>
				<div className="min-h-0 overflow-auto">
					{chosen ? (
						<Imagery
							code={shown.code}
							lat={chosen.lat}
							lon={chosen.lon}
							date={first[at]?.time.slice(0, 10) ?? ""}
						/>
					) : null}
				</div>
			</div>
		</Panel>
	);
}

// The reading's shape while it loads: the bar, then compass over table, conditions, and imagery,
// so nothing jumps when it arrives.
export function ReadingSkeleton() {
	return (
		<>
			<div aria-hidden="true" className="flex items-center justify-end gap-sm min-h-control px-xs">
				<Skeleton width="var(--spacing-control)" height="var(--spacing-control)" />
			</div>
			<div aria-hidden="true" className="grid flex-1 min-h-0 gap-md p-md md:grid-cols-4">
				<div className="flex flex-col gap-md min-h-0 overflow-hidden">
					<Skeleton className="aspect-square" height="auto" />
					<Skeleton width="70%" height="0.75rem" />
					{[1, 2, 3, 4].map((row) => (
						<Skeleton key={row} height="0.75rem" />
					))}
				</div>
				<div className="md:col-span-2 flex flex-col gap-md min-h-0 overflow-hidden">
					<div className="flex items-end justify-between gap-sm">
						<Skeleton width="10ch" height="0.75rem" />
						<div className="flex flex-col items-center gap-xs">
							<Skeleton width="10ch" height="0.75rem" />
							<Skeleton width="9ch" height="1.25rem" />
						</div>
						<Skeleton width="10ch" height="0.75rem" />
					</div>
					<Skeleton height="var(--spacing-control)" />
					<Skeleton width="80%" height="0.75rem" />
					{[1, 2].map((group) => (
						<div key={group} className="flex flex-col gap-sm">
							<Skeleton width="12ch" height="0.75rem" />
							<Skeleton width="50%" height="1.25rem" />
							<Skeleton width="70%" height="0.75rem" />
							<Skeleton height="var(--spacing-chart)" />
						</div>
					))}
				</div>
				<div className="flex flex-col gap-xs min-h-0 overflow-hidden">
					<Skeleton className="aspect-square" height="auto" />
					<Skeleton width="80%" height="0.75rem" />
				</div>
			</div>
		</>
	);
}

// Pin this site and window to the candidates bar, or unpin it.
export function PinCandidate({ code, site, window, onChange }: Shown & { onChange?: () => void }) {
	const id = candidateCode(site, window);
	const hydrated = useHydrated();
	// Bump after toggle so the button re-reads storage for this site/window.
	const [, setTick] = useState(0);
	const pinned = hydrated && savedCandidates().some((candidate) => candidate.code === id);
	const label = pinned ? `Unpin ${id}` : `Pin ${id}`;
	const toggle = () => {
		if (pinned) removeCandidate(id);
		else saveCandidate({ code: id, body: code, site, window });
		setTick((tick) => tick + 1);
		onChange?.();
	};
	return (
		<Tooltip label={pinned ? "Unpin" : "Pin"}>
			<Button
				variant={pinned ? "neutral" : "accent"}
				aria-label={label}
				aria-pressed={pinned}
				className="px-0 w-control border-0"
				onClick={toggle}
			>
				{pinned ? <PinSlash icon /> : <Pin icon />}
			</Button>
		</Tooltip>
	);
}
