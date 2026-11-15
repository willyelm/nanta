import Nanta from "interface/icon/nanta.svg";
import { SchemeSwitch } from "interface/scheme/switch";
import type { ReactNode } from "react";

// The shared page frame. The matched child is `children`.
export function Layout({ children }: { children?: ReactNode }) {
	return (
		<>
			<header className="flex gap-lg p-md justify-between">
				<div className="flex items-center flex-row gap-sm">
					<Nanta height={40} />
					<h1>NANTA</h1>
				</div>
				<SchemeSwitch />
			</header>
			<main className="p-lg">{children}</main>
		</>
	);
}
