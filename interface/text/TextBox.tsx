import type { ComponentPropsWithoutRef, ElementType } from "react";
import { classNames } from "system";

type TextBoxProps<T extends ElementType> = {
	as?: T;
	className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

// Shared field styling. `as` is the element: span for a group, input, or textarea. The input
// border is the cue for entering data; a group outlines as a whole, inside its edge like every
// focus ring, when a part inside has focus.
const base =
	"font-mono text-body leading-standard text-default bg-neutral border border-input " +
	"min-h-control py-sm px-md placeholder:text-secondary " +
	"focus-within:outline-2 focus-within:outline-focus focus-within:-outline-offset-2";

const layout: Record<string, string> = {
	input: "block w-full",
	textarea: "block w-full min-h-[6rem] resize-y",
};

export function TextBox<T extends ElementType = "span">({
	as,
	className,
	...props
}: TextBoxProps<T>) {
	const Tag = (as ?? "span") as ElementType;
	const shape = layout[String(Tag)] ?? "inline-flex items-center gap-nano";
	return <Tag className={classNames(base, shape, className)} {...props} />;
}
