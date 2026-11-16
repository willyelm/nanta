import { Button } from "interface/button";
import { DateRangeInput, MAX_DAYS } from "interface/date";
import EditPencil from "interface/icon/edit-pencil.svg";
import Plus from "interface/icon/plus.svg";
import Trash from "interface/icon/trash.svg";
import Xmark from "interface/icon/xmark.svg";
import { List, ListItem, Panel, PanelBar } from "interface/panel";
import { removeWindow, savedWindows, saveWindow } from "interface/sites/store";
import { useKeep } from "interface/sites/url";
import { useView } from "interface/space";
import { Tooltip } from "interface/tooltip";
import { useState } from "react";
import { type Api, json, navigate, resumable, useHydrated } from "system";
import type { Window } from "window";

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

// Empty to add, or filled to edit one of yours: a code and two dates, up to 31 days (Horizons'
// limit). An edit keeps its code. Saved in this browser.
function WindowForm({
	current,
	onDone,
	onRemoved,
}: {
	current?: Window;
	onDone: (code: string) => void;
	onRemoved?: (code: string) => void;
}) {
	const [form, setForm] = useState(() => {
		const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
		const from = current?.from ?? day(Date.now());
		return {
			code: current?.code ?? "",
			from,
			to: current?.to ?? day(Date.parse(`${from}T00:00:00Z`) + MAX_DAYS * DAY),
		};
	});
	const catalog = useWindowCatalog();
	const taken = !current && catalog.some((w) => w.code === form.code);
	const days = (Date.parse(form.to) - Date.parse(form.from)) / DAY;
	const valid =
		/^[A-Z0-9-]{1,12}$/.test(form.code) &&
		!taken &&
		date.test(form.from) &&
		date.test(form.to) &&
		days >= 1 &&
		days <= MAX_DAYS;
	return (
		<form
			className="flex flex-col gap-md p-md"
			action={() => {
				if (!valid) return;
				saveWindow({ ...form, label: `${form.from} – ${form.to}` });
				onDone(form.code);
			}}
		>
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
				{taken
					? `${form.code} is a predefined window.`
					: `End is at most ${MAX_DAYS} days after start (Horizons).`}
			</p>
			<div className="flex gap-sm">
				<Button type="submit" variant="accent" disabled={!valid} className="flex-1">
					{current ? "Save changes" : "Add window"}
				</Button>
				{current ? (
					<Tooltip label={`Delete ${current.code}`}>
						<Button
							aria-label={`Delete ${current.code}`}
							className="px-0 aspect-square"
							onClick={() => {
								removeWindow(current.code);
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

// The windows to read the site in, the current one marked. The + adds one; each row's pencil
// turns that row into its form. Changing the window keeps the site.
// `model`: with no site open, the model shows the bodies at the chosen window's start (TODAY is
// now). With a site, the Reading sets the time instead.
export function WindowsPanel({
	here,
	window,
	model = false,
}: {
	here: string;
	window: string;
	model?: boolean;
}) {
	const items = useWindows();
	const chosen = items.find((w) => w.code === window);
	useView({
		time:
			model && chosen && chosen.code !== "TODAY" ? Date.parse(`${chosen.from}T00:00Z`) : undefined,
	});
	// The form open: "new", a window's code, or none.
	const [open, setOpen] = useState<string | null>(null);
	// A window keeps the place you're on; a new window drops the time, which may not be in it.
	const keep = useKeep();
	const href = (next: string) =>
		keep(here, { window: next, time: next === window ? undefined : null });
	const catalog = useWindowCatalog();
	const adding = open === "new";
	const done = (next: string) => {
		setOpen(null);
		navigate(href(next));
	};
	// After a delete the site stays, and the window too unless it was the one deleted.
	const removed = (gone: string) => {
		setOpen(null);
		navigate(gone !== window ? keep(here) : keep(here, { window: null, time: null }));
	};

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
			{adding ? <WindowForm onDone={done} /> : null}
			<List>
				{items.map((w) =>
					open === w.code ? (
						<li key={w.code} className="flex flex-col divide-y divide-divider">
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
							<WindowForm current={w} onDone={done} onRemoved={removed} />
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
							className="justify-between"
						>
							<span className="text-label uppercase">{w.code}</span>
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

// A sample's time as "2027-06-01 18:00", or nothing without one.
export const stamp = (sample?: { time: string }) =>
	sample?.time.slice(0, 16).replace("T", " ") ?? "";
