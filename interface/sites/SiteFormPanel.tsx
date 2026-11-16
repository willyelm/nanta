import { Button } from "interface/button";
import { conditions } from "interface/horizon/catalog";
import { Panel, PanelBar } from "interface/panel";
import { useBody, useSites } from "interface/sites/data";
import { save } from "interface/sites/store";
import { useKeep } from "interface/sites/url";
import { useView } from "interface/space";
import { type FormEvent, useCallback, useState } from "react";
import type { Condition } from "site";
import { navigate } from "system";

const field = "flex flex-col gap-xs";
const input = "min-h-control px-sm border border-input bg-neutral text-default";

// A site's form, empty to add one or filled to edit one: a code name, where it is, and what
// it's judged on. It shows on the model as you type; clicking the body picks the point.
// Saved in this browser, then the site opens. An edited site keeps its code.
export function SiteFormPanel({ code, editing }: { code: string; editing?: string }) {
	const body = useBody(code);
	const keep = useKeep();
	const current = useSites(code).find((item) => item.code === editing);
	const [form, setForm] = useState({
		code: current?.code ?? "",
		name: current?.name ?? "",
		lat: String(current?.lat ?? 0),
		lon: String(current?.lon ?? 0),
	});
	const [flags, setFlags] = useState({
		sunlight: current?.sunlight ?? true,
		earth_visibility: current?.earth_visibility ?? code === "301",
	});
	const lat = Number(form.lat);
	const lon = ((Number(form.lon) % 360) + 360) % 360 || 0;
	const valid =
		/^[A-Z0-9-]{1,12}$/.test(form.code) &&
		lat >= -90 &&
		lat <= 90 &&
		(flags.sunlight || flags.earth_visibility);
	const onPick = useCallback((la: number, lo: number) => {
		setForm((f) => ({ ...f, lat: la.toFixed(3), lon: lo.toFixed(3) }));
	}, []);
	useView({ lat, lon, onPick });

	const set = (key: keyof typeof form) => (event: { target: { value: string } }) => {
		const value = key === "code" ? event.target.value.toUpperCase() : event.target.value;
		setForm((f) => ({ ...f, [key]: value }));
	};
	const toggle = (condition: Condition) => setFlags((f) => ({ ...f, [condition]: !f[condition] }));
	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (!valid) return;
		save({ code: form.code, name: form.name || form.code, body: code, ...flags, lat, lon });
		navigate(keep(`/${code}/sites/${form.code}`));
	};

	return (
		<Panel
			as="section"
			aria-label={editing ? `Edit ${editing}` : "New site"}
			className="divide-y divide-divider"
		>
			<PanelBar
				back={keep(editing ? `/${code}/sites/${encodeURIComponent(editing)}` : `/${code}/sites`)}
				title={editing ? `Edit ${editing}` : `New site on ${body.name}`}
			/>
			<form className="flex flex-col gap-md p-md" onSubmit={submit}>
				<label className={field}>
					<span className="text-label text-secondary">Code name</span>
					<input
						className={input}
						value={form.code}
						onChange={set("code")}
						placeholder="RIDGE-2"
						maxLength={12}
						readOnly={!!editing}
						required
					/>
				</label>
				<label className={field}>
					<span className="text-label text-secondary">Description</span>
					<input
						className={input}
						value={form.name}
						onChange={set("name")}
						placeholder="Rim near the ridge"
					/>
				</label>
				<div className="grid grid-cols-2 gap-sm">
					<label className={field}>
						<span className="text-label text-secondary">Latitude °</span>
						<input
							className={input}
							type="number"
							step="any"
							min={-90}
							max={90}
							value={form.lat}
							onChange={set("lat")}
						/>
					</label>
					<label className={field}>
						<span className="text-label text-secondary">Longitude °E</span>
						<input
							className={input}
							type="number"
							step="any"
							value={form.lon}
							onChange={set("lon")}
						/>
					</label>
				</div>
				<fieldset className="flex flex-col gap-xs">
					<legend className="text-label text-secondary">Look for</legend>
					{(Object.keys(conditions) as Condition[]).map((condition) => (
						<label key={condition} className="flex items-center gap-sm">
							<input
								type="checkbox"
								checked={flags[condition]}
								onChange={() => toggle(condition)}
							/>
							{conditions[condition].name}
						</label>
					))}
				</fieldset>
				<p className="text-caption">Or click the body in the model to pick the point.</p>
				<Button type="submit" variant="accent" disabled={!valid}>
					{editing ? "Save changes" : "Add site"}
				</Button>
			</form>
		</Panel>
	);
}
