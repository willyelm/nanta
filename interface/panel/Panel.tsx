import NavArrowLeft from "interface/icon/nav-arrow-left.svg";
import { Skeleton } from "interface/skeleton";
import { Tooltip } from "interface/tooltip";
import { type AnchorHTMLAttributes, type HTMLAttributes, type ReactNode, Suspense } from "react";
import { Catch, classNames } from "system";

// A panel over the model: translucent, with the scene blurred behind it, so every panel reads
// the same. It sizes to its content between 20rem and 40rem; a page can set its own. It takes the pointer back from the layout, which passes it to the model. `as` keeps
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
				"flex flex-col min-h-0 max-h-full overflow-auto pointer-events-auto min-w-[20rem] max-w-[40rem]",
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
// shape says what's loading, with `fallback` drawn like the content (a plain skeleton without
// one); on failure, one says what failed. Pass the panel's own classes.
export function Loader({
	label,
	error,
	className,
	fallback,
	children,
}: {
	label: string;
	error: string;
	className?: string;
	fallback?: ReactNode;
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
						{fallback ?? <Skeleton height="var(--spacing-chart)" />}
					</Panel>
				}
			>
				{children}
			</Suspense>
		</Catch>
	);
}

// A panel's top bar: a way back, the title, and an action at the end, divided like the panel.
// It's one control tall. Back is a square cell; an icon action fills the last cell the same way.
export function PanelBar({
	back,
	title,
	action,
}: {
	back?: string;
	title: ReactNode;
	action?: ReactNode;
}) {
	return (
		<div className="flex flex-row divide-x divide-divider">
			{back ? (
				<Tooltip label="Back">
					<a
						href={back}
						aria-label="Back"
						className="flex items-center justify-center w-control min-h-control hover:bg-neutralHover"
					>
						<NavArrowLeft icon />
					</a>
				</Tooltip>
			) : null}
			<h2 className="flex items-center px-md py-sm uppercase flex-1">{title}</h2>
			{action}
		</div>
	);
}

// A list of places to go, divided like the panel.
export function List({ children, ...props }: HTMLAttributes<HTMLUListElement>) {
	return (
		<ul {...props} className={classNames("flex flex-col divide-y divide-divider", props.className)}>
			{children}
		</ul>
	);
}

// One row of a List: the whole row is the link. `current` marks the one you're on. `action` is
// a control at the end of the row, beside the link, like remove.
export function ListItem({
	current = false,
	action,
	className,
	...props
}: { current?: boolean; action?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
	return (
		<li className={action ? "flex items-stretch divide-x divide-divider" : undefined}>
			<a
				{...props}
				aria-current={current ? "true" : undefined}
				className={classNames(
					"flex items-center gap-sm min-h-control p-md text-default no-underline",
					"hover:bg-neutralHover pressed:bg-neutralActive",
					action ? "flex-1" : undefined,
					className,
				)}
			/>
			{action}
		</li>
	);
}
