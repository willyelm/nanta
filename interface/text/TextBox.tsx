import type { ComponentPropsWithoutRef, ElementType } from "react";
import styles from "./TextBox.module.css";

type TextBoxProps<T extends ElementType> = {
	as?: T;
	className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

// Shared field styling. `as` is the element: span for a group, input, or textarea.
export function TextBox<T extends ElementType = "span">({
	as,
	className,
	...props
}: TextBoxProps<T>) {
	const Tag = (as ?? "span") as ElementType;
	return (
		<Tag className={className ? `${styles.TextBox} ${className}` : styles.TextBox} {...props} />
	);
}
