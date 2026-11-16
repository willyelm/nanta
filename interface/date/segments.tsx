import { Fragment, type KeyboardEvent, useRef, useState } from "react";

type Part = "year" | "month" | "day";

const order: Part[] = ["year", "month", "day"];

const limits: Record<
	Part,
	{ min: number; max: number; size: number; label: string; placeholder: string }
> = {
	year: { min: 1969, max: 2100, size: 4, label: "Year", placeholder: "YYYY" },
	month: { min: 1, max: 12, size: 2, label: "Month", placeholder: "MM" },
	day: { min: 1, max: 31, size: 2, label: "Day", placeholder: "DD" },
};

type Parts = Record<Part, number | null>;

const empty: Parts = { year: null, month: null, day: null };

function daysInMonth(year: number, month: number) {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function readDate(value: string): Parts {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return empty;
	return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function writeDate(parts: Parts): string {
	if (parts.year == null || parts.month == null || parts.day == null) return "";
	const day = Math.min(parts.day, daysInMonth(parts.year, parts.month));
	return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Today in UTC, as parts: where an empty part starts.
function today(): Record<Part, number> {
	const now = new Date();
	return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() };
}

function maxFor(part: Part, parts: Parts) {
	if (part === "day" && parts.year != null && parts.month != null)
		return daysInMonth(parts.year, parts.month);
	return limits[part].max;
}

function clamp(part: Part, value: number, parts: Parts) {
	const max = maxFor(part, parts);
	const min = limits[part].min;
	if (value < min) return part === "year" ? min : max;
	if (value > max) return part === "year" ? max : min;
	return value;
}

function show(part: Part, value: number | null) {
	if (value == null) return limits[part].placeholder;
	return part === "year" ? String(value) : String(value).padStart(2, "0");
}

// One ISO date as three spin buttons: year, month, day.
export function DateSegments({
	value,
	onChange,
	name,
}: {
	value: string;
	onChange: (value: string) => void;
	name: string;
}) {
	const [parts, setParts] = useState(() => readDate(value));
	const [source, setSource] = useState(value);
	const [focus, setFocus] = useState<Part>("year");
	if (value !== source) {
		setSource(value);
		setParts(readDate(value));
	}
	const buffer = useRef("");
	const refs = useRef<Partial<Record<Part, HTMLSpanElement>>>({});

	// Every change keeps the day real for its month and year (31 never shows in February).
	function commit(next: Parts) {
		const fixed =
			next.day != null && next.year != null && next.month != null
				? { ...next, day: Math.min(next.day, daysInMonth(next.year, next.month)) }
				: next;
		setParts(fixed);
		onChange(writeDate(fixed));
	}

	function focusPart(part: Part) {
		buffer.current = "";
		setFocus(part);
		refs.current[part]?.focus();
	}

	// Past the first or last part, focus moves to the neighboring date in the same field, so a
	// range reads as one: the start's day, then the end's year.
	function focusBeyond(from: HTMLElement, delta: 1 | -1) {
		const field = from.closest("fieldset") ?? from.parentElement;
		const all = [...(field?.querySelectorAll<HTMLElement>('[role="spinbutton"]') ?? [])];
		all[all.indexOf(from) + delta]?.focus();
	}

	// An empty part starts at today's value; a filled one steps.
	function step(part: Part, delta: number) {
		const current = parts[part];
		if (current == null) {
			commit({ ...parts, [part]: today()[part] });
			return;
		}
		commit({ ...parts, [part]: clamp(part, current + delta, parts) });
	}

	function typeDigit(part: Part, digit: string) {
		const { size } = limits[part];
		const text = (buffer.current + digit).slice(-size);
		buffer.current = text;
		const number = Number(text);
		if (part !== "year" && text.length === 1 && number > Math.floor(limits[part].max / 10)) {
			commit({ ...parts, [part]: number });
			const index = order.indexOf(part);
			if (order[index + 1]) focusPart(order[index + 1]);
			return;
		}
		if (text.length < size) {
			setParts({ ...parts, [part]: number });
			return;
		}
		const next = { ...parts, [part]: clamp(part, number, parts) };
		commit(next);
		const index = order.indexOf(part);
		if (order[index + 1]) focusPart(order[index + 1]);
	}

	function onKeyDown(part: Part, event: KeyboardEvent<HTMLSpanElement>) {
		if (event.key === "ArrowUp") {
			event.preventDefault();
			buffer.current = "";
			step(part, 1);
		} else if (event.key === "ArrowDown") {
			event.preventDefault();
			buffer.current = "";
			step(part, -1);
		} else if (event.key === "ArrowRight") {
			event.preventDefault();
			const index = order.indexOf(part);
			if (order[index + 1]) focusPart(order[index + 1]);
			else focusBeyond(event.currentTarget, 1);
		} else if (event.key === "ArrowLeft") {
			event.preventDefault();
			const index = order.indexOf(part);
			if (order[index - 1]) focusPart(order[index - 1]);
			else focusBeyond(event.currentTarget, -1);
		} else if (event.key === "Home") {
			event.preventDefault();
			buffer.current = "";
			commit({ ...parts, [part]: limits[part].min });
		} else if (event.key === "End") {
			event.preventDefault();
			buffer.current = "";
			commit({ ...parts, [part]: maxFor(part, parts) });
		} else if (event.key === "Backspace") {
			event.preventDefault();
			buffer.current = "";
			commit({ ...parts, [part]: null });
		} else if (/^\d$/.test(event.key)) {
			event.preventDefault();
			typeDigit(part, event.key);
		}
	}

	return (
		<>
			{order.map((part, index) => {
				const valueNow = parts[part];
				const max =
					part === "day" && parts.year != null && parts.month != null
						? daysInMonth(parts.year, parts.month)
						: limits[part].max;
				return (
					<Fragment key={part}>
						{index > 0 ? (
							<span className="text-secondary" aria-hidden="true">
								-
							</span>
						) : null}
						<span
							role="spinbutton"
							aria-label={`${name} ${limits[part].label}`}
							aria-valuemin={limits[part].min}
							aria-valuemax={max}
							aria-valuenow={valueNow ?? undefined}
							aria-valuetext={show(part, valueNow)}
							tabIndex={focus === part ? 0 : -1}
							data-empty={valueNow == null}
							className="px-xs tabular-nums focus:bg-neutralActive focus:outline-none data-[empty=true]:text-secondary"
							ref={(node) => {
								if (node) refs.current[part] = node;
							}}
							onFocus={() => {
								buffer.current = "";
								setFocus(part);
							}}
							onKeyDown={(event) => onKeyDown(part, event)}
						>
							{show(part, valueNow)}
						</span>
					</Fragment>
				);
			})}
		</>
	);
}
