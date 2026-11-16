// Regular (default) or compact. <html data-density> drives the spacing tokens.
const KEY = "density";

export type Density = "regular" | "compact";

export function readDensity(): Density {
	if (typeof localStorage === "undefined") return "regular";
	return localStorage.getItem(KEY) === "compact" ? "compact" : "regular";
}

export function setDensity(density: Density) {
	if (density === "regular") localStorage.removeItem(KEY);
	else localStorage.setItem(KEY, density);
	document.documentElement.dataset.density = density;
	window.dispatchEvent(new Event("density"));
}

export function subscribeDensity(onChange: () => void) {
	const onStorage = (event: StorageEvent) => {
		if (event.key !== KEY && event.key !== null) return;
		document.documentElement.dataset.density = readDensity();
		onChange();
	};
	window.addEventListener("storage", onStorage);
	window.addEventListener("density", onChange);
	return () => {
		window.removeEventListener("storage", onStorage);
		window.removeEventListener("density", onChange);
	};
}

// Applies density before paint.
export const densityBoot = `(function(){var d=localStorage.getItem("${KEY}");document.documentElement.dataset.density=d==="compact"?"compact":"regular"})();`;
