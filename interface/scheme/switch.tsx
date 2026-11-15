import { useSyncExternalStore } from "react";
import { Button } from "../button";
import { readScheme, type Scheme, setScheme, subscribeScheme } from "./index";

const serverScheme = () => "auto" as const;
const choices: [Scheme, string][] = [
	["auto", "Auto"],
	["light", "Light"],
	["dark", "Dark"],
];

export function SchemeSwitch() {
	const scheme = useSyncExternalStore(subscribeScheme, readScheme, serverScheme);
	return (
		<fieldset className="flex items-center gap-xs border-0" aria-label="Color scheme">
			{choices.map(([value, label]) => (
				<Button key={value} aria-pressed={scheme === value} onClick={() => setScheme(value)}>
					{label}
				</Button>
			))}
		</fieldset>
	);
}
