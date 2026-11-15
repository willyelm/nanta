import type { ReactNode } from "react";
import { SchemeSwitch } from "../scheme/switch";
import styles from "./Layout.module.css";

// The shared page frame. The matched child is `children`.
export function Layout({ children }: { children?: ReactNode }) {
	return (
		<>
			<header className={styles.header}>
				<div className={styles.title}>
					<h1>nanta</h1>
					<p>Plan locations against changing conditions.</p>
				</div>
				<SchemeSwitch />
			</header>
			<main>{children}</main>
		</>
	);
}
