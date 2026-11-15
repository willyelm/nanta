import { Button } from "interface/button";
import AppWindow from "interface/icon/app-window.svg";
import HalfMoon from "interface/icon/half-moon.svg";
import SunLight from "interface/icon/sun-light.svg";
import { Menu, MenuItem, MenuTrigger } from "interface/menu";
import { useSyncExternalStore } from "react";
import { readScheme, type Scheme, setScheme, subscribeScheme } from "./index";

const serverScheme = () => "auto" as const;
// Auto follows the system, so it shows a window.
const choices: Record<Scheme, [string, typeof AppWindow]> = {
	auto: ["Auto", AppWindow],
	light: ["Light", SunLight],
	dark: ["Dark", HalfMoon],
};

// A menu button: the trigger shows the current scheme, the menu checks one of the three.
export function SchemeSwitch() {
	const scheme = useSyncExternalStore(subscribeScheme, readScheme, serverScheme);
	const [label, Icon] = choices[scheme];
	return (
		<MenuTrigger align="end">
			<Button aria-label={`Color scheme: ${label}`}>
				<Icon icon />
				{label}
			</Button>
			<Menu label="Color scheme">
				{Object.entries(choices).map(([value, [label, Icon]]) => (
					<MenuItem
						key={value}
						checked={scheme === value}
						onAction={() => setScheme(value as Scheme)}
					>
						<Icon icon />
						{label}
					</MenuItem>
				))}
			</Menu>
		</MenuTrigger>
	);
}
