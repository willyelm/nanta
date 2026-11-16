import { Button } from "interface/button";
import NavArrowDown from "interface/icon/nav-arrow-down.svg";
import { Menu, MenuItem, MenuTrigger } from "interface/menu";
import { useSyncExternalStore } from "react";
import { type Density, readDensity, setDensity, subscribeDensity } from "./density";
import { readScheme, type Scheme, setScheme, subscribeScheme } from "./index";

const serverScheme = () => "auto" as const;
const serverDensity = () => "regular" as const;

// Fixed swatch backgrounds so each choice reads the same in either scheme.
const LIGHT_BG = "oklch(100% 0 0)";
const DARK_BG = "oklch(15% 0.002 286)";

const schemes: { value: Scheme; code: string; label: string; fill: string }[] = [
	{
		value: "light",
		code: "L",
		label: "Light",
		fill: `linear-gradient(135deg, var(--chart-color-select) 50%, ${LIGHT_BG} 50%)`,
	},
	{
		value: "dark",
		code: "D",
		label: "Dark",
		fill: `linear-gradient(135deg, var(--chart-color-select) 50%, ${DARK_BG} 50%)`,
	},
	{
		value: "auto",
		code: "S",
		label: "System",
		fill: `linear-gradient(135deg, var(--chart-color-select) 50%, ${LIGHT_BG} 50%, ${LIGHT_BG} 75%, ${DARK_BG} 75%)`,
	},
];

const densities: { value: Density; code: string; label: string }[] = [
	{ value: "regular", code: "R", label: "Regular" },
	{ value: "compact", code: "C", label: "Compact" },
];

const schemeByValue = Object.fromEntries(schemes.map((choice) => [choice.value, choice])) as Record<
	Scheme,
	(typeof schemes)[number]
>;
const densityByValue = Object.fromEntries(
	densities.map((choice) => [choice.value, choice]),
) as Record<Density, (typeof densities)[number]>;

// Accent | scheme background, like OX's theme chip.
function SchemeSwatch({ fill }: { fill: string }) {
	return (
		<span
			aria-hidden="true"
			className="inline-block size-utility shrink-0 rounded-full border border-control"
			style={{ background: fill }}
		/>
	);
}

// Appearance menu: scheme and density, same pattern as OX but only what Nanta needs.
// Trigger shows a short code: S/L/D for scheme, R/C for density (e.g. S/R, D/C).
export function SchemeSwitch() {
	const scheme = useSyncExternalStore(subscribeScheme, readScheme, serverScheme);
	const density = useSyncExternalStore(subscribeDensity, readDensity, serverDensity);
	const { code: schemeCode, fill } = schemeByValue[scheme];
	const { code: densityCode } = densityByValue[density];
	const code = `${schemeCode}/${densityCode}`;
	return (
		<MenuTrigger align="end">
			<Button aria-label={`Appearance: ${code}`} className="gap-sm border-0">
				<SchemeSwatch fill={fill} />
				{code}
				<NavArrowDown icon className="text-secondary" />
			</Button>
			<Menu label="Appearance">
				<p className="px-md py-xs text-caption text-secondary">Schemes</p>
				{schemes.map(({ value, label, fill }) => (
					<MenuItem key={value} checked={scheme === value} onAction={() => setScheme(value)}>
						<SchemeSwatch fill={fill} />
						{label}
					</MenuItem>
				))}
				<p className="px-md py-xs text-caption text-secondary">Density</p>
				{densities.map(({ value, label }) => (
					<MenuItem key={value} checked={density === value} onAction={() => setDensity(value)}>
						{label}
					</MenuItem>
				))}
			</Menu>
		</MenuTrigger>
	);
}
