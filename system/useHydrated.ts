import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// False on the server and while hydrating, true after: render browser-only parts (positions,
// measurements, ids that differ between trees) behind it without a hydration mismatch.
export const useHydrated = () =>
	useSyncExternalStore(
		subscribe,
		() => true,
		() => false,
	);
