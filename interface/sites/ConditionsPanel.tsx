import { Button } from "interface/button";
import { Conditions, Curve } from "interface/horizon/Conditions";
import { conditions, samples } from "interface/horizon/catalog";
import { HorizonChart, summarize } from "interface/horizon/HorizonChart";
import { Reading } from "interface/horizon/Reading";
import Bookmark from "interface/icon/bookmark.svg";
import Check from "interface/icon/check.svg";
import { Panel } from "interface/panel";
import { type Shown, useShown } from "interface/sites/data";
import {
	candidateCode,
	removeCandidate,
	saveCandidate,
	savedCandidates,
} from "interface/sites/store";
import { useKeep } from "interface/sites/url";
import { useView } from "interface/space";
import { Tooltip } from "interface/tooltip";
import { stamp } from "interface/windows";
import { useState } from "react";
import { replace, useHydrated, useSearchParams } from "system";

// The conditions, across the bottom: the time slider as its bar, then the horizon from the site,
// each condition with its curve, and the table. It also puts the samples on the model; picking on
// the chart or the slider moves the time everywhere.
export function ConditionsPanel(shown: Shown) {
	const { list, sky, first } = useShown(shown);
	const keep = useKeep();
	const params = useSearchParams();
	// The sample comes from the URL (?time=); without one, the current hour if it's in the window
	// (as in NOW), else the window's first.
	const wanted = params.get("time") ?? "";
	const found = first.findIndex((sample) => sample.time.startsWith(wanted));
	const current = first.findLastIndex((sample) => Date.parse(sample.time) <= Date.now());
	const at = wanted && found >= 0 ? found : Math.max(current, 0);
	const setAt = (index: number) => {
		const sample = first[index];
		if (sample) replace(keep(location.pathname, { time: sample.time.slice(0, 16) }));
	};
	const time = stamp(first[at]);
	// The bodies move to the chosen sample's moment, in space and around the site.
	useView({
		sky,
		at,
		time: first[at] ? Date.parse(first[at].time) : undefined,
		caption: summarize(list, sky, at),
	});
	return (
		// A fixed share of the screen, 30% but never under 15rem (240px): each column scrolls.
		<Panel
			as="section"
			aria-label="Conditions"
			className="max-w-none shrink-0 h-[30dvh] min-h-[15rem] divide-y divide-divider"
		>
			{/* The time across the window, start to end, as the panel's bar; then save. */}
			<div className="flex items-center divide-x divide-divider">
				<label className="flex flex-1 items-center gap-sm px-md min-h-control text-caption tabular-nums">
					<span className="sr-only">Time</span>
					<span className="text-secondary">{stamp(first[0])}</span>
					<input
						type="range"
						className="flex-1"
						min={0}
						max={Math.max(first.length - 1, 0)}
						value={at}
						onChange={(event) => setAt(Number(event.target.value))}
					/>
					<span className="text-secondary">{stamp(first[first.length - 1])}</span>
					<output className="text-default">{time} UTC</output>
				</label>
				<SaveCandidate {...shown} />
			</div>
			{/* The sky, then the reading: the chart, conditions and curves, the table. Side by side
			    on wide screens, stacked on narrow ones. */}
			<div className="grid flex-1 min-h-0 gap-lg p-md md:grid-cols-3">
				{/* The compass: square, as tall as the panel allows. */}
				<div className="flex min-h-0 justify-center">
					<HorizonChart list={list} sky={sky} at={at} onPick={setAt} />
				</div>
				<div className="flex flex-col gap-md min-h-0 overflow-auto">
					<Conditions list={list} sky={sky} at={at} />
					{list.map((condition) => (
						<figure key={condition} className="flex flex-col gap-xs">
							<figcaption className="text-label">
								{conditions[condition].label} elevation
							</figcaption>
							<Curve
								positions={samples(sky, condition)}
								at={at}
								color={conditions[condition].color}
								dashed={conditions[condition].dashed}
							/>
						</figure>
					))}
				</div>
				<div className="min-h-0 overflow-auto">
					<Reading list={list} sky={sky} at={at} />
				</div>
			</div>
		</Panel>
	);
}

// Saves the site and window on screen as a candidate, a plan to compare later. Once saved, it
// says so; pressing again removes it.
export function SaveCandidate({ code, site, window }: Shown) {
	const id = candidateCode(site, window);
	const hydrated = useHydrated();
	const [saved, setSaved] = useState<boolean | null>(null);
	const isSaved = saved ?? (hydrated && savedCandidates().some((c) => c.code === id));
	const label = isSaved ? `Remove candidate ${id}` : `Save candidate ${id}`;
	const toggle = () => {
		if (isSaved) removeCandidate(id);
		else saveCandidate({ code: id, body: code, site, window });
		setSaved(!isSaved);
	};
	return (
		<Tooltip label={isSaved ? "Saved candidate" : "Save candidate"}>
			<Button
				variant={isSaved ? "neutral" : "accent"}
				aria-label={label}
				aria-pressed={isSaved}
				className="px-0 aspect-square border-0"
				onClick={toggle}
			>
				{isSaved ? <Check icon /> : <Bookmark icon />}
			</Button>
		</Tooltip>
	);
}
