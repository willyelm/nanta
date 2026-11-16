const cells: (HTMLElement | null)[] = [];

export function cell(i: number) {
	return (node: HTMLElement | null) => {
		cells[i] = node;
	};
}

export function setReadout(texts: string[]) {
	if (!cells[0]) return;
	texts.forEach((text, i) => {
		const node = cells[i];
		if (node && node.textContent !== text) node.textContent = text;
	});
}

export function CameraReadout() {
	return (
		<dl aria-label="Camera" className="flex gap-md font-mono tabular-nums">
			{[0, 1, 2, 3].map((column) => (
				<div key={column} className="flex flex-col">
					<dt ref={cell(column * 2)} className="text-caption text-secondary uppercase" />
					<dd ref={cell(column * 2 + 1)} className="text-label text-default text-end" />
				</div>
			))}
		</dl>
	);
}
