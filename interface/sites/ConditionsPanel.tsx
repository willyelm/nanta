import { Button } from "interface/button";
import { Conditions } from "interface/horizon/Conditions";
import { HorizonChart } from "interface/horizon/HorizonChart";
import { Reading } from "interface/horizon/Reading";
import Link from "interface/icon/link.svg";
import LinkSlash from "interface/icon/link-slash.svg";
import { Panel } from "interface/panel";
import {
	CandidatesStrip,
	ExpandReading,
	ReadingContext,
	readingClass,
	useCandidates,
} from "interface/sites/CandidatesBar";
import { type Shown, useShown } from "interface/sites/data";
import {
	candidateCode,
	removeCandidate,
	saveCandidate,
	savedCandidates,
} from "interface/sites/store";
import { useKeep, useTimeScrub } from "interface/sites/url";
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

// The reading across the bottom: horizon, conditions with the time scrub, and the table. Expand
// fills the screen; while expanded, a strip keeps the site and window in view.
export function ConditionsPanel({
	expanded = false,
	onExpand,
	...shown
}: Shown & { expanded?: boolean; onExpand?: () => void }) {
	const { list, sky, first } = useShown(shown);
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
			<div className="flex items-center divide-x divide-divider">
				<div className="flex-1 min-w-0">
					{candidates.length ? (
						<CandidatesStrip items={candidates} current={current} onRemove={refreshCandidates} />
					) : expanded ? (
						<ReadingContext site={shown.site} window={shown.window} />
					) : null}
				</div>
				<CompareCandidate {...shown} onChange={refreshCandidates} />
				{onExpand ? <ExpandReading expanded={expanded} onToggle={onExpand} /> : null}
			</div>
			<div className="grid flex-1 min-h-0 gap-md p-md md:grid-cols-4">
				<div
					className="flex h-full min-h-0 min-w-0 w-full items-center justify-center"
					style={{ containerType: "size" }}
				>
					{/* Square: as wide as the column, or as tall as the cell, whichever is smaller. */}
					<div className="aspect-square w-[min(100%,100cqh)] max-w-full">
						<HorizonChart
							list={list}
							sky={sky}
							at={at}
							onPick={setTime}
							onDragStart={onDragStart}
							onFlush={onDragEnd}
						/>
					</div>
				</div>
				<div className="md:col-span-2 flex flex-col gap-md min-h-0 overflow-auto">
					<div className="flex flex-col gap-xs shrink-0 min-w-0">
						<div className="flex items-baseline justify-between gap-sm text-caption tabular-nums">
							<span className="text-secondary">{stamp(first[0])}</span>
							<output className="text-default">{time} UTC</output>
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
					<Reading list={list} sky={sky} at={at} />
				</div>
			</div>
		</Panel>
	);
}

// Pair this site and window into the comparison bar, or unlink it.
export function CompareCandidate({
	code,
	site,
	window,
	onChange,
}: Shown & { onChange?: () => void }) {
	const id = candidateCode(site, window);
	const hydrated = useHydrated();
	// Bump after toggle so the button re-reads storage for this site/window.
	const [, setTick] = useState(0);
	const linked = hydrated && savedCandidates().some((candidate) => candidate.code === id);
	const label = linked ? `Unlink ${id} from comparison` : `Compare ${id}`;
	const toggle = () => {
		if (linked) removeCandidate(id);
		else saveCandidate({ code: id, body: code, site, window });
		setTick((tick) => tick + 1);
		onChange?.();
	};
	return (
		<Tooltip label={linked ? "Comparing" : "Compare"}>
			<Button
				variant={linked ? "neutral" : "accent"}
				aria-label={label}
				aria-pressed={linked}
				className="px-0 aspect-square border-0"
				onClick={toggle}
			>
				{linked ? <LinkSlash icon /> : <Link icon />}
			</Button>
		</Tooltip>
	);
}
