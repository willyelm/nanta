import type { ReactNode } from "react";
import { SchemeSwitch } from "../scheme/switch";

// The shared page frame. The matched child is `children`.
export function Layout({ children }: { children?: ReactNode }) {
	return (
		<>
			<header className="flex items-center gap-lg p-md">
				<div className="flex flex-col gap-sm">
					<svg height={32} viewBox="0 0 400 590" aria-hidden="true">
						<path
							fill="currentColor"
							d="M68.07,290.13 L68.07,589.58 L0,589.58 L0,152.86 C3.74,207.47 29.32,256.12 68.07,290.13 Z M400,165.2 L400,589.58 L305.88,589.58 L191.88,339.86 C194.77,339.98 197.69,340.04 200.61,340.04 C221.01,340.04 240.7,337 259.25,331.34 L328.57,482.66 L331.93,482.66 L331.93,291.2 C368.4,259.7 393.45,215.35 400,165.2 Z M200.61,0.42 C277.07,0.42 339.15,62.5 339.15,138.95 C339.15,215.41 277.07,277.49 200.61,277.49 C124.16,277.49 62.08,215.41 62.08,138.95 C62.08,62.5 124.16,0.42 200.61,0.42 Z"
						/>
					</svg>

					<h1>nanta</h1>
					<p>Plan locations against changing conditions.</p>
				</div>
				<SchemeSwitch />
			</header>
			<main>{children}</main>
		</>
	);
}
