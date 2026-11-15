import { TextBox } from "../text/TextBox";
import { DateSegments } from "./segments";

// One UTC date. APG spin buttons: year, month, day.
export function DateInput({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<TextBox as="fieldset" aria-label={label}>
			<DateSegments name={label} value={value} onChange={onChange} />
		</TextBox>
	);
}
