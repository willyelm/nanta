import type { Sky } from "position";
import { useMemo } from "react";
import type { Condition } from "site";
import { conditions, samples } from "./catalog";

// The same samples as text, the reading a planner quotes: one column per condition. Row `at` is
// the one in the scene. Cell text is built once per sky so a time scrub only retargets the current
// row.
export function Reading({ list, sky, at }: { list: Condition[]; sky: Sky; at: number }) {
	const columns = useMemo(
		() => list.map((condition) => ({ condition, positions: samples(sky, condition) })),
		[list, sky],
	);
	const rows = columns[0]?.positions ?? [];
	return (
		<table className="border-collapse text-caption" aria-label="Raw samples">
			<thead>
				<tr>
					<th className="py-xs px-sm text-start text-secondary tabular-nums">Time (UTC)</th>
					{columns.map(({ condition }) => (
						<th key={condition} className="py-xs px-sm text-start text-secondary tabular-nums">
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
						{columns.map(({ condition, positions }) => {
							const sample = positions[i];
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
