import { TextBox } from "interface/text";
import { type ClipboardEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";

// A latitude (N/S, 0 to 90) or longitude (0 to 360 east) as spin buttons, like the date input:
// whole degrees, thousandths, and for latitude the hemisphere. Up and down step the focused
// segment (Shift for ten), as does scrolling over it; digits type into it, left and right move
// between segments.
type Part = "degrees" | "thousandths" | "hemisphere";
type Kind = "latitude" | "longitude";

const UNIT = 1000; // thousandths of a degree, about 30 m on the Moon
const NOTCH = 50; // wheel travel, in pixels, per step
const limits: Record<Kind, { max: number; size: number }> = {
	latitude: { max: 90 * UNIT, size: 2 },
	longitude: { max: 360 * UNIT, size: 3 },
};

// Decimal degrees in pasted text, in order, each signed by a trailing N/S/E/W if present (S and
// W negative): "39.4867, -105.0274" or "89.45° S 222.3° E".
export function parseCoordinates(text: string): number[] {
	return [...text.matchAll(/([-+]?\d+(?:\.\d+)?)\s*°?\s*([NSEW])?/gi)].map(([, number, side]) =>
		/[SW]/i.test(side ?? "") ? -Math.abs(Number(number)) : Number(number),
	);
}

export function CoordinateInput({
	label,
	kind,
	value,
	onChange,
	onPair,
}: {
	label: string;
	kind: Kind;
	value: number;
	onChange: (value: number) => void;
	// A pasted pair, latitude then longitude, fills both fields.
	onPair?: (lat: number, lon: number) => void;
}) {
	const { max, size } = limits[kind];
	const parts: Part[] =
		kind === "latitude" ? ["degrees", "thousandths", "hemisphere"] : ["degrees", "thousandths"];
	// The value in thousandths: latitude signed, longitude 0 up to (not including) 360°.
	const total = Math.round(value * UNIT);
	const south = total < 0;
	const magnitude = Math.abs(total);
	const [degrees, thousandths] = [Math.floor(magnitude / UNIT), magnitude % UNIT];

	const [typing, setTyping] = useState<{ part: Part; text: string } | null>(null);
	const refs = useRef<Partial<Record<Part, HTMLSpanElement>>>({});

	// Latitude stays within ±90°; longitude goes around.
	const set = (thousandthsTotal: number) => {
		if (kind === "longitude") onChange((((thousandthsTotal % max) + max) % max) / UNIT);
		else onChange(Math.max(-max, Math.min(max, thousandthsTotal)) / UNIT);
	};
	// Typing sets the size; the hemisphere stays.
	const withSize = (next: number) => set(south ? -next : next);
	const focus = (part: Part | undefined) => part && refs.current[part]?.focus();

	// Up is north or east: latitude stops at the pole, longitude goes around.
	const step = (part: Part, by: number) => {
		if (part === "hemisphere") set(-total);
		else set(total + by * (part === "degrees" ? UNIT : 1));
	};

	// Scrolling over a segment steps it. A native listener, since React's wheel events can't
	// stop the page from scrolling; it reads the latest step through a ref.
	const latest = useRef(step);
	latest.current = step;
	useEffect(() => {
		const off = Object.entries(refs.current).map(([part, node]) => {
			// Trackpads send many small deltas: step once per notch (about 50px) of travel.
			let travel = 0;
			const wheel = (event: WheelEvent) => {
				event.preventDefault();
				travel += event.deltaY;
				const notches = Math.trunc(travel / NOTCH);
				if (!notches) return;
				travel -= notches * NOTCH;
				latest.current(part as Part, -notches * (event.shiftKey ? 10 : 1));
			};
			node.addEventListener("wheel", wheel, { passive: false });
			return () => node.removeEventListener("wheel", wheel);
		});
		return () => {
			for (const remove of off) remove();
		};
	}, []);

	function type(part: "degrees" | "thousandths", digit: string) {
		const width = part === "degrees" ? size : 3;
		const text = ((typing?.part === part ? typing.text : "") + digit).slice(0, width);
		const number = Number(text.padEnd(part === "thousandths" ? 3 : text.length, "0"));
		withSize(part === "degrees" ? number * UNIT + thousandths : degrees * UNIT + number);
		if (text.length < width) setTyping({ part, text });
		else {
			setTyping(null);
			focus(parts[parts.indexOf(part) + 1]);
		}
	}

	function onKeyDown(part: Part, event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") return pasteShortcut();
		const up = event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0;
		if (up) step(part, up * (event.shiftKey ? 10 : 1));
		else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
			focus(parts[parts.indexOf(part) + (event.key === "ArrowLeft" ? -1 : 1)]);
		} else if (part === "hemisphere" && /^[ns]$/i.test(event.key)) {
			set((event.key.toLowerCase() === "s") === south ? total : -total);
		} else if (part !== "hemisphere" && /^\d$/.test(event.key)) {
			type(part, event.key);
		} else if (part !== "hemisphere" && event.key === "Backspace") {
			withSize(part === "degrees" ? thousandths : degrees * UNIT);
		} else return;
		event.preventDefault();
		if (!/^\d$/.test(event.key)) setTyping(null);
	}

	// Paste a coordinate, or a latitude and longitude pair; copy gives the value in degrees.
	// Some browsers send no paste event to a non-editable element, so Cmd or Ctrl+V falls back
	// to reading the clipboard when none arrives.
	const pasted = useRef(false);
	function paste(text: string) {
		const numbers = parseCoordinates(text);
		if (!numbers.length) return false;
		setTyping(null);
		if (numbers.length >= 2 && onPair) onPair(numbers[0], numbers[1]);
		else set(Math.round(numbers[kind === "longitude" && numbers.length >= 2 ? 1 : 0] * UNIT));
		return true;
	}
	function onPaste(event: ClipboardEvent) {
		pasted.current = true;
		if (paste(event.clipboardData.getData("text"))) event.preventDefault();
	}
	function pasteShortcut() {
		pasted.current = false;
		setTimeout(() => {
			if (!pasted.current) navigator.clipboard?.readText().then(paste, () => {});
		});
	}
	function onCopy(event: ClipboardEvent) {
		event.preventDefault();
		event.clipboardData.setData("text/plain", String(total / UNIT));
	}

	const shown: Record<Part, string> = {
		degrees: typing?.part === "degrees" ? typing.text : String(degrees),
		thousandths:
			typing?.part === "thousandths"
				? typing.text.padEnd(3, "0")
				: String(thousandths).padStart(3, "0"),
		hemisphere: south ? "S" : "N",
	};
	const segment = (part: Part, name: string) => (
		<span
			role="spinbutton"
			aria-label={`${label} ${name}`}
			aria-valuenow={part === "hemisphere" ? undefined : part === "degrees" ? degrees : thousandths}
			aria-valuetext={shown[part]}
			tabIndex={0}
			className="px-nano tabular-nums focus:outline-2 focus:outline-focus focus:-outline-offset-2"
			ref={(node) => {
				if (node) refs.current[part] = node;
			}}
			onBlur={() => setTyping(null)}
			onKeyDown={(event) => onKeyDown(part, event)}
		>
			{shown[part]}
		</span>
	);

	return (
		<TextBox as="span" role="group" aria-label={label} onPaste={onPaste} onCopy={onCopy}>
			{segment("degrees", "degrees")}
			<span className="text-secondary" aria-hidden="true">
				.
			</span>
			{segment("thousandths", "thousandths")}
			<span className="text-secondary" aria-hidden="true">
				°
			</span>
			{kind === "latitude" ? (
				segment("hemisphere", "hemisphere")
			) : (
				<span className="text-secondary">E</span>
			)}
		</TextBox>
	);
}
