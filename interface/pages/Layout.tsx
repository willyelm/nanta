import type { ReactNode } from "react";

// The shared page frame: header and <main>. Pages wrap themselves in it.
export function Layout({ children }: { children: ReactNode }) {
	return (
		<>
			<header>
				<h1>Nanta</h1>
				<p>Plan locations against changing conditions.</p>
			</header>
			<main>{children}</main>
		</>
	);
}
