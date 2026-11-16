import { type KeyboardEvent, type PointerEvent, useRef } from "react";
import { classNames } from "system";

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function snap(value: number, min: number, step: number) {
	return min + Math.round((value - min) / step) * step;
}

// Horizontal slider (APG): the thumb is the focusable slider; the rail is the hit target for
// pointer. Arrows, Home/End, and Page move the value. `id` must be stable across SSR/hydration.
export function Slider({
	id,
	label,
	value,
	min = 0,
	max,
	step = 1,
	valueText,
	onChange,
	onChangeStart,
	onChangeEnd,
	className,
}: {
	id: string;
	label: string;
	value: number;
	min?: number;
	max: number;
	step?: number;
	valueText?: string;
	onChange: (value: number) => void;
	onChangeStart?: () => void;
	onChangeEnd?: () => void;
	className?: string;
}) {
	const rail = useRef<HTMLDivElement>(null);
	const thumb = useRef<HTMLDivElement>(null);
	const keys = useRef(false);
	const span = Math.max(max - min, 0);
	const now = clamp(snap(value, min, step), min, max);
	const pct = span === 0 ? 0 : ((now - min) / span) * 100;
	const large = Math.max(step, snap(span / 10, 0, step) || step);
	// Thumb is size-utility; inset the track so the thumb stays inside the container at 0% and 100%.
	const inset = "calc(var(--spacing-utility) / 2)";

	const setFromClientX = (clientX: number) => {
		const node = rail.current;
		if (!node || span === 0) return;
		const box = node.getBoundingClientRect();
		const pad = box.width > 0 ? Number.parseFloat(getComputedStyle(node).paddingLeft) || 0 : 0;
		const inner = Math.max(box.width - pad * 2, 0);
		const ratio = inner === 0 ? 0 : (clientX - box.left - pad) / inner;
		onChange(clamp(snap(min + ratio * span, min, step), min, max));
	};

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		let next: number | null = null;
		switch (event.key) {
			case "ArrowLeft":
			case "ArrowDown":
				next = now - step;
				break;
			case "ArrowRight":
			case "ArrowUp":
				next = now + step;
				break;
			case "PageDown":
				next = now - large;
				break;
			case "PageUp":
				next = now + large;
				break;
			case "Home":
				next = min;
				break;
			case "End":
				next = max;
				break;
			default:
				return;
		}
		event.preventDefault();
		event.stopPropagation();
		if (!keys.current) {
			keys.current = true;
			onChangeStart?.();
		}
		onChange(clamp(snap(next, min, step), min, max));
	};

	const endKeys = () => {
		if (!keys.current) return;
		keys.current = false;
		onChangeEnd?.();
	};

	const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) return;
		event.preventDefault();
		endKeys();
		rail.current?.setPointerCapture(event.pointerId);
		onChangeStart?.();
		setFromClientX(event.clientX);
		thumb.current?.focus();
	};

	const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
		if (!rail.current?.hasPointerCapture(event.pointerId)) return;
		setFromClientX(event.clientX);
	};

	const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
		if (!rail.current?.hasPointerCapture(event.pointerId)) return;
		rail.current.releasePointerCapture(event.pointerId);
		onChangeEnd?.();
	};

	return (
		<div
			ref={rail}
			className={classNames(
				"relative flex w-full min-w-0 items-center min-h-control touch-none cursor-pointer",
				className,
			)}
			style={{ paddingInline: inset }}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerUp}
		>
			{/* Track */}
			<div
				className="absolute inset-y-0 my-auto h-xs border border-control bg-neutralHover pointer-events-none"
				style={{ left: inset, right: inset }}
				aria-hidden="true"
			/>
			{/* Filled portion */}
			<div
				className="absolute inset-y-0 my-auto h-xs bg-accent pointer-events-none"
				style={{ left: inset, width: `calc((100% - var(--spacing-utility)) * ${pct / 100})` }}
				aria-hidden="true"
			/>
			{/* Thumb: accent fill circle; cochineal ring via box-shadow so overflow parents cannot clip it. */}
			<div
				ref={thumb}
				id={id}
				role="slider"
				tabIndex={0}
				aria-label={label}
				aria-valuemin={min}
				aria-valuemax={max}
				aria-valuenow={now}
				aria-valuetext={valueText}
				aria-orientation="horizontal"
				className={classNames(
					"absolute top-1/2 z-10 size-utility -translate-x-1/2 -translate-y-1/2 rounded-full",
					"bg-accent border border-transparent",
					"outline-none",
					"focus:shadow-[0_0_0_2px_var(--background-color-neutral),0_0_0_4px_var(--outline-color-focus)]",
				)}
				style={{ left: `calc(${inset} + (100% - var(--spacing-utility)) * ${pct / 100})` }}
				onKeyDown={onKeyDown}
				onBlur={endKeys}
			/>
		</div>
	);
}
