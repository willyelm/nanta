import { Button } from "interface/button";
import { DateRangeInput } from "interface/date";
import EditPencil from "interface/icon/edit-pencil.svg";
import Plus from "interface/icon/plus.svg";
import Trash from "interface/icon/trash.svg";
import Xmark from "interface/icon/xmark.svg";
import { List, ListItem, Panel, PanelBar } from "interface/panel";
import { removeWindow, savedWindows, saveWindow } from "interface/sites/store";
import { hourOf, useKeep } from "interface/sites/url";
import { useView } from "interface/space";
import { Tooltip } from "interface/tooltip";
import { type FormEvent, useState } from "react";
import { type Api, json, navigate, replace, resumable, useHydrated, useSearchParams } from "system";
import type { Window } from "windows";

const field = "flex flex-col gap-xs";
const input = "min-h-control px-sm border border-input bg-neutral text-default";

export const [, useWindowCatalog] = resumable(async (api: Api) =>
	json<Window[]>(api("/api/windows")),
);

// The windows: the predefined ones from the server, then the ones added in this browser.
export function useWindows(): Window[] {
	const catalog = useWindowCatalog();
	const mine = useHydrated() ? savedWindows() : [];
	return [...catalog.filter((w) => !mine.some((m) => m.code === w.code)), ...mine];
}

const DAY = 86_400_000;
const date = /^\d{4}-\d{2}-\d{2}$/;

// A window's form, empty to add one or filled to edit one of yours: a code and two dates, up to
// 31 days apart (Horizons' limit). An edited window keeps its code. Saved in this browser.
function WindowForm({
	current,
	onSaved,
	onRemoved,
}: {
	current?: Window;
	onSaved: (code: string) => void;
	onRemoved?: (code: string) => void;
}) {
	// A new window starts today and ends tomorrow, in UTC.
	const [form, setForm] = useState(() => {
		const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
		return {
			code: current?.code ?? "",
			from: current?.from ?? day(Date.now()),
			to: current?.to ?? day(Date.now() + DAY),
		};
	});
	// Predefined windows are read-only, so a new window can't take one of their codes.
	const catalog = useWindowCatalog();
	const taken = !current && catalog.some((w) => w.code === form.code);
	const days = (Date.parse(form.to) - Date.parse(form.from)) / DAY;
	const valid =
		/^[A-Z0-9-]{1,12}$/.test(form.code) &&
		!taken &&
		date.test(form.from) &&
		date.test(form.to) &&
		days >= 1 &&
		days <= 31;
	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (!valid) return;
		saveWindow({ ...form, label: `${form.from} – ${form.to}` });
		onSaved(form.code);
	};
	return (
		<form className="flex flex-col gap-md p-md" onSubmit={submit}>
			<label className={field}>
				<span className="text-label text-secondary">Code name</span>
				<input
					className={input}
					value={form.code}
					onChange={(event) => setForm((f) => ({ ...f, code: event.target.value.toUpperCase() }))}
					placeholder="JUL27"
					maxLength={12}
					readOnly={!!current}
					required
				/>
			</label>
			<div className={field}>
				<span className="text-label text-secondary">Dates (UTC)</span>
				<DateRangeInput
					label={`Window ${form.code}`}
					start={form.from}
					end={form.to}
					onStartChange={(from) => setForm((f) => ({ ...f, from }))}
					onEndChange={(to) => setForm((f) => ({ ...f, to }))}
				/>
			</div>
			<p className="text-caption">
				{taken ? `${form.code} is a predefined window.` : "From 1 to 31 days, Horizons' limit."}
			</p>
			<div className="flex gap-sm">
				<Button type="submit" variant="accent" disabled={!valid} className="flex-1">
					{current ? "Save changes" : "Add window"}
				</Button>
				{current ? (
					<Button
						onClick={() => {
							removeWindow(current.code);
							onRemoved?.(current.code);
						}}
					>
						<Trash icon />
						Delete window
					</Button>
				) : null}
			</div>
		</form>
	);
}

// The windows to read the site in, the current one marked. The + adds one; each row's pencil
// turns that row into its form. Changing the window keeps the site.
export function WindowsPanel({ here, window }: { here: string; window: string }) {
	const items = useWindows();
	// The form open: "new", a window's code, or none.
	const [open, setOpen] = useState<string | null>(null);
	// A window keeps the place you're on; a new window drops the time, which may not be in it.
	const keep = useKeep();
	const href = (next: string) =>
		keep(here, { window: next, time: next === window ? undefined : null });
	const saved = (next: string) => {
		setOpen(null);
		navigate(href(next));
	};
	// After a delete the site stays, and the window too unless it was the one deleted.
	const catalog = useWindowCatalog();
	const removed = (gone: string) => {
		setOpen(null);
		navigate(gone !== window ? keep(here) : keep(here, { window: null, time: null }));
	};
	const adding = open === "new";

	return (
		<Panel as="section" aria-label="Windows" className="divide-y divide-divider">
			<PanelBar
				title="Windows"
				action={
					<Tooltip label={adding ? "Close" : "Add a window"}>
						<Button
							variant={adding ? "neutral" : "accent"}
							aria-label={adding ? "Close" : "Add a window"}
							aria-expanded={adding}
							className="px-0 aspect-square border-0"
							onClick={() => setOpen(adding ? null : "new")}
						>
							{adding ? <Xmark icon /> : <Plus icon />}
						</Button>
					</Tooltip>
				}
			/>
			{adding ? <WindowForm onSaved={saved} /> : null}
			<List>
				{items.map((w) =>
					open === w.code ? (
						<li key={w.code} className="flex flex-col">
							<div className="flex items-stretch divide-x divide-divider">
								<span className="flex-1 flex items-center px-md text-heading uppercase">
									{w.code}
								</span>
								<Tooltip label="Close">
									<button
										type="button"
										aria-label={`Close editing ${w.code}`}
										className="flex items-center justify-center aspect-square min-h-control hover:bg-neutralHover"
										onClick={() => setOpen(null)}
									>
										<Xmark icon />
									</button>
								</Tooltip>
							</div>
							<WindowForm current={w} onSaved={saved} onRemoved={removed} />
						</li>
					) : (
						<ListItem
							key={w.code}
							href={href(w.code)}
							current={w.code === window}
							// Predefined windows are read-only; only the ones you added can be edited.
							action={
								catalog.some((c) => c.code === w.code) ? undefined : (
									<Tooltip label={`Edit ${w.code}`}>
										<button
											type="button"
											aria-label={`Edit ${w.code}`}
											className="flex items-center justify-center aspect-square min-h-control hover:bg-neutralHover"
											onClick={() => setOpen(w.code)}
										>
											<EditPencil icon />
										</button>
									</Tooltip>
								)
							}
						>
							<span className="text-heading uppercase">{w.code}</span>
							<span className="text-caption text-secondary tabular-nums">
								{w.from} – {w.to}
							</span>
						</ListItem>
					),
				)}
			</List>
			{window ? null : <p className="p-md">Choose a window.</p>}
		</Panel>
	);
}

const HOUR = 3_600_000;

// A window's time without a site: hour by hour from the first to the last. There is no place to
// read conditions for, so the slider moves the bodies in space and nothing else.
export function TimePanel({ window }: { window: string }) {
	const span = useWindows().find((w) => w.code === window);
	const keep = useKeep();
	const params = useSearchParams();
	const start = span ? Date.parse(`${span.from}T00:00:00Z`) : 0;
	const end = span ? Date.parse(`${span.to}T00:00:00Z`) : 0;
	const hours = Math.max(Math.round((end - start) / HOUR), 0);
	// The hour comes from the URL (?time=); without one, the current hour if it's in the window
	// (as in NOW), else the window's first.
	const chosen = Date.parse(`${params.get("time") ?? ""}:00Z`);
	const from = Number.isFinite(chosen) ? chosen : Date.now();
	const at = Math.min(Math.max(Math.floor((from - start) / HOUR), 0), hours);
	const time = start + at * HOUR;
	useView({ time: span ? time : undefined });
	if (!span) return null;
	const hour = (ms: number) => stamp({ time: new Date(ms).toISOString() });
	return (
		<Panel as="section" aria-label="Time" className="max-w-none">
			<label className="flex items-center gap-sm px-md min-h-control text-caption tabular-nums">
				<span className="sr-only">Time</span>
				<span className="text-secondary">{hour(start)}</span>
				<input
					type="range"
					className="flex-1"
					min={0}
					max={hours}
					value={at}
					onChange={(event) =>
						replace(
							keep(location.pathname, { time: hourOf(start + Number(event.target.value) * HOUR) }),
						)
					}
				/>
				<span className="text-secondary">{hour(end)}</span>
				<output className="text-default">{hour(time)} UTC</output>
			</label>
		</Panel>
	);
}

// A sample's time as "2027-06-01 18:00", or nothing without one.
export const stamp = (sample?: { time: string }) =>
	sample?.time.slice(0, 16).replace("T", " ") ?? "";
