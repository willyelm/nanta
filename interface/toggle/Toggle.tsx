import { type ChangeEvent, createContext, type ReactNode, use, useId } from "react";
import { classNames } from "system";

type Group = {
	multiple: boolean;
	name: string;
	value: string | readonly string[];
	onChange: (value: string | string[]) => void;
};

const ToggleContext = createContext<Group | null>(null);

// A block of equal boxes. multiple=false uses radios (one on); multiple=true uses checkboxes
// (any set). The look is the same either way: a bordered row, the on box filled.
export function ToggleGroup({
	multiple = false,
	name,
	value,
	onChange,
	label,
	children,
}: {
	multiple?: boolean;
	name?: string;
	value: string | readonly string[];
	onChange: (value: string | string[]) => void;
	label: string;
	children: ReactNode;
}) {
	const id = useId();
	return (
		<fieldset>
			{/* A legend sits outside the fieldset's layout, so gap can't space it: a margin does. */}
			<legend className="mb-xs text-label text-secondary">{label}</legend>
			<ToggleContext value={{ multiple, name: name ?? id, value, onChange }}>
				<div className="flex h-control gap-xs p-xs border border-control box-border">
					{children}
				</div>
			</ToggleContext>
		</fieldset>
	);
}

// One box in the group. The native control is visually hidden; the label is the hit target.
export function Toggle({ value, children }: { value: string; children: ReactNode }) {
	const group = use(ToggleContext);
	if (!group) throw new Error("Toggle needs a ToggleGroup");
	const { multiple, name, value: selected, onChange } = group;
	const checked = multiple ? (selected as readonly string[]).includes(value) : selected === value;

	const change = (event: ChangeEvent<HTMLInputElement>) => {
		if (multiple) {
			const list = selected as readonly string[];
			onChange(event.target.checked ? [...list, value] : list.filter((item) => item !== value));
		} else {
			onChange(value);
		}
	};

	return (
		<label
			className={classNames(
				"flex flex-1 items-center justify-center gap-xs px-sm h-full",
				"border border-control text-label text-default cursor-pointer",
				"hover:bg-neutralHover pressed:bg-neutralActive",
				"has-checked:bg-accent has-checked:text-onAccent has-checked:border-transparent",
				"has-checked:hover:bg-accent/85 has-checked:pressed:bg-accent/70",
			)}
		>
			<input
				type={multiple ? "checkbox" : "radio"}
				name={name}
				value={value}
				checked={checked}
				onChange={change}
				className="sr-only"
			/>
			{children}
		</label>
	);
}
