import { Button } from "interface/button";
import ArrowSeparateVertical from "interface/icon/arrow-separate-vertical.svg";
import ArrowUnionVertical from "interface/icon/arrow-union-vertical.svg";
import { Tooltip } from "interface/tooltip";

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

// Panel height: a bottom strip, or the full main column when expanded.
export const readingClass = (expanded: boolean) =>
	expanded
		? "max-w-none flex-1 min-h-0 divide-y divide-divider"
		: "max-w-none shrink-0 h-[30dvh] min-h-[15rem] divide-y divide-divider";
