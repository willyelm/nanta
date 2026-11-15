import { TextBox } from "interface/text";
import { DateSegments } from "./segments";

// A UTC window: start date, then end date.
export function DateRangeInput({
	label,
	start,
	end,
	onStartChange,
	onEndChange,
}: {
	label: string;
	start: string;
	end: string;
	onStartChange: (value: string) => void;
	onEndChange: (value: string) => void;
}) {
	return (
		<TextBox as="fieldset" aria-label={label}>
			<DateSegments name={`${label} start`} value={start} onChange={onStartChange} />
			<span className="text-secondary">to</span>
			<DateSegments name={`${label} end`} value={end} onChange={onEndChange} />
		</TextBox>
	);
}
