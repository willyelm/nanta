import type { CSSProperties, HTMLAttributes } from "react";
import { classNames } from "system";

type Props = {
	width?: CSSProperties["width"];
	height?: CSSProperties["height"];
	shimmer?: boolean;
} & HTMLAttributes<HTMLSpanElement>;

// A decorative loading placeholder. The loading region keeps its own status text.
//
//   <Skeleton width="60%" height={44} />
export function Skeleton({
	width = "100%",
	height = 16,
	shimmer = true,
	className,
	style,
	...props
}: Props) {
	return (
		<span
			{...props}
			aria-hidden="true"
			className={classNames(
				"block rounded-sm bg-neutralHover",
				shimmer && "shimmer motion-reduce:animate-none",
				className,
			)}
			style={{ width, height, ...style }}
		/>
	);
}
