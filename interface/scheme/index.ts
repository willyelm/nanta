// The choice is auto, light, or dark; auto is stored as no value and follows the system.
// <html data-scheme> always holds the resolved light or dark, set by the head script before paint.

const KEY = "scheme";
const DARK = "(prefers-color-scheme: dark)";

export type Scheme = "auto" | "light" | "dark";

export function readScheme(): Scheme {
	if (typeof localStorage === "undefined") return "auto";
	const stored = localStorage.getItem(KEY);
	return stored === "light" || stored === "dark" ? stored : "auto";
}

function resolve(scheme: Scheme) {
	if (scheme !== "auto") return scheme;
	return matchMedia(DARK).matches ? "dark" : "light";
}

export function setScheme(scheme: Scheme) {
	if (scheme === "auto") localStorage.removeItem(KEY);
	else localStorage.setItem(KEY, scheme);
	document.documentElement.dataset.scheme = resolve(scheme);
	window.dispatchEvent(new Event("scheme"));
}

export function subscribeScheme(onChange: () => void) {
	const onStorage = (event: StorageEvent) => {
		if (event.key !== KEY && event.key !== null) return;
		document.documentElement.dataset.scheme = resolve(readScheme());
		onChange();
	};
	window.addEventListener("storage", onStorage);
	window.addEventListener("scheme", onChange);
	return () => {
		window.removeEventListener("storage", onStorage);
		window.removeEventListener("scheme", onChange);
	};
}

// Applies the scheme before paint, and keeps auto in step with the system while the page is open.
export const schemeBoot = `(function(){var m=matchMedia("${DARK}");function a(){var s=localStorage.getItem("${KEY}");document.documentElement.dataset.scheme=s==="light"||s==="dark"?s:m.matches?"dark":"light"}a();m.addEventListener("change",a)})();`;
