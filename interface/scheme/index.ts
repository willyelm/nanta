// Stored choice is light or dark. With nothing stored, the head script and
// readScheme follow the system preference once, before paint.

const KEY = "scheme";

export type Scheme = "light" | "dark";

export function readScheme(): Scheme {
	if (typeof localStorage === "undefined") return "light";
	const stored = localStorage.getItem(KEY);
	if (stored === "light" || stored === "dark") return stored;
	if (typeof matchMedia === "undefined") return "light";
	return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setScheme(scheme: Scheme) {
	localStorage.setItem(KEY, scheme);
	document.documentElement.dataset.scheme = scheme;
	window.dispatchEvent(new Event("scheme"));
}

export function subscribeScheme(onChange: () => void) {
	const onStorage = (event: StorageEvent) => {
		if (event.key === KEY || event.key === null) onChange();
	};
	window.addEventListener("storage", onStorage);
	window.addEventListener("scheme", onChange);
	return () => {
		window.removeEventListener("storage", onStorage);
		window.removeEventListener("scheme", onChange);
	};
}

export const schemeBoot = `(function(){var s=localStorage.getItem("${KEY}");document.documentElement.dataset.scheme=s==="light"||s==="dark"?s:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"})();`;
