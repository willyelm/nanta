import type { Sky } from "position";
import type { Condition } from "site";
import { conditions, samples } from "./catalog";

// The same samples as text, the reading a planner quotes: one column per condition. Row `at` is
// the one in the scene.
export function Reading({ list, sky, at }: { list: Condition[]; sky: Sky; at: number }) {
	const rows = list.length ? samples(sky, list[0]) : [];
	return (
		<table className="border-collapse">
			<thead>
				<tr>
					<th className="py-xs px-sm text-start tabular-nums">Time (UTC)</th>
					{list.map((condition) => (
						<th key={condition} className="py-xs px-sm text-start tabular-nums">
							{conditions[condition].label}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{rows.map((point, i) => (
					<tr
						key={point.time}
						aria-current={i === at ? "true" : undefined}
						className="pressed:bg-neutralActive"
					>
						<td className="py-xs px-sm text-start tabular-nums">
							{point.time.slice(0, 16).replace("T", " ")}
						</td>
						{list.map((condition) => {
							const sample = samples(sky, condition)[i];
							return (
								<td key={condition} className="py-xs px-sm text-start tabular-nums">
									{sample ? `${sample.elevation.toFixed(1)}°` : "—"}
								</td>
							);
						})}
					</tr>
				))}
			</tbody>
		</table>
	);
}
