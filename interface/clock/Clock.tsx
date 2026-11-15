import { useEffect, useState } from "react";
import { useHydrated } from "system";

const format = (date: Date) => `${date.toISOString().slice(0, 19).replace("T", " ")} UTC`;

// The current time in UTC, to the second. Rendered in the browser only, so the server's time
// never mismatches; no live region, so it doesn't announce every tick.
export function Clock() {
	const hydrated = useHydrated();
	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(id);
	}, []);
	return (
		<time dateTime={hydrated ? now.toISOString() : undefined} className="font-mono tabular-nums">
			{hydrated ? format(now) : " "}
		</time>
	);
}
