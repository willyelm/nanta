import { useSearchParams } from "system";

// A path with the window and time kept from the URL, so they survive every move: a site,
// editing it, back, saving. `change` sets either one, or drops it with null.
export function useKeep() {
	const params = useSearchParams();
	return (path: string, change: { window?: string | null; time?: string | null } = {}) => {
		const query = new URLSearchParams();
		const window = change.window === undefined ? params.get("window") : change.window;
		const time = change.time === undefined ? params.get("time") : change.time;
		if (window) query.set("window", window);
		if (time) query.set("time", time);
		const text = query.toString();
		return text ? `${path}?${text}` : path;
	};
}

// The time in the URL, as an hour: "2027-06-01T06:00".
export const hourOf = (ms: number) => new Date(ms).toISOString().slice(0, 16);
