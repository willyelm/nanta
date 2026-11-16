import QuestionMark from "interface/icon/question-mark.svg";
import { Tooltip } from "interface/tooltip";
import type { ReactNode } from "react";

// The site and window forms share these: a labeled field, its text input, and a ? with a tip.
export const field = "flex flex-col gap-xs";
export const input = "min-w-0 min-h-control px-sm border border-input bg-neutral text-default";

// A field's label, with an optional ? at its end whose tooltip says more.
export function Label({ children, help }: { children: ReactNode; help?: string }) {
	return (
		<span className="flex items-center justify-between text-label text-secondary">
			{children}
			{help ? (
				<Tooltip label={help}>
					<button
						type="button"
						aria-label={`Help: ${help}`}
						className="flex items-center justify-center hover:text-default"
					>
						<QuestionMark icon />
					</button>
				</Tooltip>
			) : null}
		</span>
	);
}
