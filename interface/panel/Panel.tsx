import { Skeleton } from "interface/skeleton";
import { type HTMLAttributes, type ReactNode, Suspense } from "react";
import { Catch, classNames } from "system";

// A panel over the model: translucent, with the scene blurred behind it, so every panel reads
// the same. It takes the pointer back from the layout, which passes it to the model. `as` keeps
// the right element for the content (aside, section, nav).
export function Panel({
	as: Element = "div",
	className,
	...props
}: { as?: "div" | "section" | "aside" | "nav" | "p" } & HTMLAttributes<HTMLElement>) {
	return (
		<Element
			{...props}
			className={classNames(
				"flex flex-col min-h-0 max-h-full overflow-auto pointer-events-auto",
				"bg-neutral/80 backdrop-blur-panel border border-divider",
				className,
			)}
		/>
	);
}

// The top row: the side panels, one at each end, with the model showing between them. Each panel
// is as tall as its content, up to the row, then scrolls. On narrow screens they stack below a
// gap that leaves the model in view.
export function Panels({ children }: { children: ReactNode }) {
	return (
		<div className="flex flex-col gap-md mt-scene md:mt-0 md:flex-row md:items-start md:justify-between md:flex-1 md:min-h-0 pointer-events-none">
			{children}
		</div>
	);
}

// A panel that loads: `children` suspends while its data loads. Until then a panel of the same
// shape says what's loading; on failure, one says what failed. Pass the panel's own classes.
export function Loader({
	label,
	error,
	className,
	children,
}: {
	label: string;
	error: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<Catch
			fallback={
				<Panel as="p" role="alert" className={className}>
					{error}
				</Panel>
			}
		>
			<Suspense
				fallback={
					<Panel role="status" aria-busy="true" className={className}>
						<span className="sr-only">{label}</span>
						<Skeleton height="var(--spacing-chart)" />
					</Panel>
				}
			>
				{children}
			</Suspense>
		</Catch>
	);
}
