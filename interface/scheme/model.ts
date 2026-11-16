// 3D model settings, each on or off: guides (orbits, body grids, spin axes, star names,
// and the compass at a site) and motion (camera glides and fades). <html data-guides
// data-motion> reflect them. Motion follows the system's reduced motion until chosen.
export type Setting = "guides" | "motion";

const reduced = () =>
	typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function readSetting(name: Setting): boolean {
	if (typeof localStorage === "undefined") return true;
	const stored = localStorage.getItem(name);
	if (stored) return stored === "on";
	return name === "motion" ? !reduced() : true;
}

export function setSetting(name: Setting, on: boolean) {
	localStorage.setItem(name, on ? "on" : "off");
	document.documentElement.dataset[name] = on ? "on" : "off";
	window.dispatchEvent(new Event("model"));
}

export function subscribeSettings(onChange: () => void) {
	const onStorage = (event: StorageEvent) => {
		if (event.key !== "guides" && event.key !== "motion" && event.key !== null) return;
		for (const name of ["guides", "motion"] as const)
			document.documentElement.dataset[name] = readSetting(name) ? "on" : "off";
		onChange();
	};
	window.addEventListener("storage", onStorage);
	window.addEventListener("model", onChange);
	return () => {
		window.removeEventListener("storage", onStorage);
		window.removeEventListener("model", onChange);
	};
}

// Applies both before paint.
export const settingsBoot = `(function(){var r=document.documentElement.dataset,g=localStorage.getItem("guides"),m=localStorage.getItem("motion");r.guides=g==="off"?"off":"on";r.motion=m?m:matchMedia("(prefers-reduced-motion: reduce)").matches?"off":"on"})();`;
