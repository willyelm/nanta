import { Clock } from "interface/clock";
import Nanta from "interface/icon/nanta.svg";
import { SchemeSwitch } from "interface/scheme/switch";
import { CameraReadout, Space } from "interface/space";
import type { ReactNode } from "react";

// The shared page frame. The matched child is `children`.
export function Layout({ children }: { children?: ReactNode }) {
	return (
		<div className="flex flex-col h-dvh isolate p-md gap-md">
			{/* Space fills the screen behind everything and stays mounted across pages. */}
			<Space />
			{/* Three equal columns, so the camera readout sits at the center of the screen. */}
			<header className="grid grid-cols-3 items-center gap-lg ">
				<div className="flex items-center flex-row gap-sm">
					<Nanta height={40} />
				</div>
				<div className="justify-self-center">
					<CameraReadout />
				</div>
				<div className="flex items-center gap-md justify-self-end">
					<Clock />
					<SchemeSwitch />
				</div>
			</header>
			{/* Over the model: a row of side panels, then the panel across the bottom. Empty space
			    passes the pointer to the model. */}
			<main className="flex flex-col flex-1 min-h-0 gap-md overflow-auto pointer-events-none">
				{children}
			</main>
		</div>
	);
}
