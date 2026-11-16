import { Button } from "interface/button";
import { conditions } from "interface/horizon/catalog";
import EditPencil from "interface/icon/edit-pencil.svg";
import Plus from "interface/icon/plus.svg";
import Trash from "interface/icon/trash.svg";
import Xmark from "interface/icon/xmark.svg";
import { List, ListItem, Panel, PanelBar } from "interface/panel";
import { type Shown, useBody, useCatalog, useSites } from "interface/sites/data";
import { SiteCard, SiteView } from "interface/sites/SiteCard";
import { removeSite, save } from "interface/sites/store";
import { useKeep } from "interface/sites/url";
import { Skeleton } from "interface/skeleton";
import { useView } from "interface/space";
import { Toggle, ToggleGroup } from "interface/toggle";
import { Tooltip } from "interface/tooltip";
import { useState } from "react";
import type { Condition, Site } from "site";
import { navigate, useHydrated } from "system";

const field = "flex flex-col gap-xs";
const input = "min-h-control px-sm border border-input bg-neutral text-default";

// Empty to add, or filled to edit one of yours. Shows on the model as you type; a click on the
// body fills lat/lon. Saved in this browser. An edit keeps its code.
function SiteForm({
	code,
	current,
	onDone,
	onRemoved,
}: {
	code: string;
	current?: Site;
	onDone: (siteCode: string) => void;
	onRemoved?: (siteCode: string) => void;
}) {
	const items = useSites(code);
	const [form, setForm] = useState({
		code: current?.code ?? "",
		name: current?.name ?? "",
		lat: String(current?.lat ?? 0),
		lon: String(current?.lon ?? 0),
		sunlight: current?.sunlight ?? true,
		earth_visibility: current?.earth_visibility ?? true,
	});
	const lat = Number(form.lat);
	const lon = ((Number(form.lon) % 360) + 360) % 360 || 0;
	const taken = !current && items.some((s) => s.code === form.code);
	const valid =
		/^[A-Z0-9-]{1,12}$/.test(form.code) &&
		!taken &&
		lat >= -90 &&
		lat <= 90 &&
		(form.sunlight || form.earth_visibility);

	useView({
		lat,
		lon,
		site: form.code,
		sunlight: form.sunlight,
		earth_visibility: form.earth_visibility,
		// Keep the camera still on pick (scene holds while onPick is set); store full precision.
		onPick: (la, lo) => setForm((f) => ({ ...f, lat: String(la), lon: String(lo) })),
	});

	return (
		<form
			className="flex flex-col gap-md p-md"
			action={() => {
				if (!valid) return;
				save({
					code: form.code,
					name: form.name || form.code,
					body: code,
					sunlight: form.sunlight,
					earth_visibility: form.earth_visibility,
					lat,
					lon,
				});
				onDone(form.code);
			}}
		>
			<label className={field}>
				<span className="text-label text-secondary">Code name</span>
				<input
					className={input}
					value={form.code}
					onChange={(event) => setForm((f) => ({ ...f, code: event.target.value.toUpperCase() }))}
					placeholder="RIDGE-2"
					maxLength={12}
					readOnly={!!current}
					required
				/>
			</label>
			<label className={field}>
				<span className="text-label text-secondary">Description</span>
				<input
					className={input}
					value={form.name}
					onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
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
						onChange={(event) => setForm((f) => ({ ...f, lat: event.target.value }))}
					/>
				</label>
				<label className={field}>
					<span className="text-label text-secondary">Longitude °E</span>
					<input
						className={input}
						type="number"
						step="any"
						value={form.lon}
						onChange={(event) => setForm((f) => ({ ...f, lon: event.target.value }))}
					/>
				</label>
			</div>
			<p className="text-caption">
				{taken
					? `${form.code} is already a site on this body.`
					: "Or click the body in the model to pick the point."}
			</p>
			<ToggleGroup
				multiple
				label="Look for"
				value={(Object.keys(conditions) as Condition[]).filter((condition) => form[condition])}
				onChange={(next) => {
					const list = next as Condition[];
					setForm((f) => ({
						...f,
						sunlight: list.includes("sunlight"),
						earth_visibility: list.includes("earth_visibility"),
					}));
				}}
			>
				{(Object.keys(conditions) as Condition[]).map((condition) => (
					<Toggle key={condition} value={condition}>
						{conditions[condition].name}
					</Toggle>
				))}
			</ToggleGroup>

			<div className="flex gap-sm">
				<Button type="submit" variant="accent" disabled={!valid} className="flex-1">
					{current ? "Save changes" : "Add site"}
				</Button>
				{current ? (
					<Tooltip label={`Delete ${current.code}`}>
						<Button
							aria-label={`Delete ${current.code}`}
							className="px-0 aspect-square"
							onClick={() => {
								removeSite(current.code);
								onRemoved?.(current.code);
							}}
						>
							<Trash icon />
						</Button>
					</Tooltip>
				) : null}
			</div>
		</form>
	);
}

// The navigator: back, the body, add, and its sites. + and the pencil open the form inline so
// windows stay up. Changing the site keeps the window and time.
export function SitesPanel({ code, site }: Shown) {
	const body = useBody(code);
	const keep = useKeep();
	const items = useSites(code).sort((a, b) => Number(b.code === "SCR") - Number(a.code === "SCR"));
	const selected = items.find((item) => item.code === site);
	const [open, setOpen] = useState<string | null>(null);
	const href = (next: string) => keep(`/${code}/sites/${encodeURIComponent(next)}`);
	const catalog = useCatalog(code).items;
	const hydrated = useHydrated();
	const adding = open === "new";

	return (
		<Panel as="nav" aria-label="Sites" className="divide-y divide-divider">
			{selected && !open ? <SiteView site={selected} /> : null}
			<PanelBar
				back={keep("/")}
				title={`${body.name} ${body.code}`}
				action={
					<Tooltip label={adding ? "Close" : "Add a site"}>
						<Button
							variant={adding ? "neutral" : "accent"}
							aria-label={adding ? "Close" : "Add a site"}
							aria-expanded={adding}
							className="px-0 aspect-square border-0"
							onClick={() => setOpen(adding ? null : "new")}
						>
							{adding ? <Xmark icon /> : <Plus icon />}
						</Button>
					</Tooltip>
				}
			/>
			{adding ? (
				<SiteForm
					code={code}
					onDone={(next) => {
						setOpen(null);
						navigate(href(next));
					}}
				/>
			) : null}
			<List aria-label="Sites">
				{items.map((item) =>
					open === item.code ? (
						<li key={item.code} className="flex flex-col divide-y divide-divider">
							<div className="flex justify-end">
								<Tooltip label="Cancel">
									<button
										type="button"
										aria-label="Cancel"
										className="flex items-center justify-center aspect-square min-h-control hover:bg-neutralHover"
										onClick={() => setOpen(null)}
									>
										<Xmark icon />
									</button>
								</Tooltip>
							</div>
							<SiteForm
								code={code}
								current={item}
								onDone={(next) => {
									setOpen(null);
									navigate(href(next));
								}}
								onRemoved={(gone) => {
									setOpen(null);
									navigate(
										gone === site
											? keep(`/${code}/sites`)
											: keep(`/${code}/sites${site ? `/${encodeURIComponent(site)}` : ""}`),
									);
								}}
							/>
						</li>
					) : (
						<ListItem
							key={item.code}
							href={href(item.code)}
							current={item.code === selected?.code}
							action={
								!hydrated || catalog.some((c) => c.code === item.code) ? undefined : (
									<Tooltip label={`Edit ${item.code}`}>
										<button
											type="button"
											aria-label={`Edit ${item.code}`}
											className="flex items-center justify-center aspect-square min-h-control hover:bg-neutralHover"
											onClick={() => setOpen(item.code)}
										>
											<EditPencil icon />
										</button>
									</Tooltip>
								)
							}
						>
							<SiteCard site={item} />
						</ListItem>
					),
				)}
			</List>
			{site && !selected ? (
				<p role="alert" className="p-md">
					No site {site} on this body.
				</p>
			) : null}
		</Panel>
	);
}

// Matches SitesPanel: bar, then rows with code + lat/lon and a description under them (ListItem p-md).
export function SitesSkeleton() {
	return (
		<div aria-hidden="true" className="flex flex-col divide-y divide-divider">
			<Skeleton height="var(--spacing-control)" />
			{[1, 2, 3, 4].map((row) => (
				<div key={row} className="flex flex-col gap-xs p-md min-h-control">
					<div className="flex items-center gap-md">
						<Skeleton className="flex-1" height="1rem" />
						<Skeleton width="8ch" height="0.75rem" />
						<Skeleton width="9ch" height="0.75rem" />
					</div>
					<Skeleton className="w-3/4" height="0.75rem" />
				</div>
			))}
		</div>
	);
}
