import { useSyncExternalStore } from "react";
import { Button } from "../button";
import { readScheme, setScheme, subscribeScheme } from "./index";
import styles from "./switch.module.css";

const serverScheme = () => "light" as const;

export function SchemeSwitch() {
	const scheme = useSyncExternalStore(subscribeScheme, readScheme, serverScheme);
	return (
		<fieldset className={styles.SchemeSwitch} aria-label="Color scheme">
			<Button aria-pressed={scheme === "light"} onClick={() => setScheme("light")}>
				Light
			</Button>
			<Button aria-pressed={scheme === "dark"} onClick={() => setScheme("dark")}>
				Dark
			</Button>
		</fieldset>
	);
}
