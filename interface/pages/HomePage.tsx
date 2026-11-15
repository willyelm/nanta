const bodies = [
	{
		code: "301",
		name: "Moon",
		latin: "Luna",
		air: "None. The horizon is airless.",
		day: "29.5 Earth days",
		radius: "1,737 km",
	},
	{
		code: "499",
		name: "Mars",
		latin: "",
		air: "Thin. The horizon uses refraction.",
		day: "24 h 40 min",
		radius: "3,390 km",
	},
	{
		code: "399",
		name: "Earth",
		latin: "Terra",
		air: "Yes. The horizon uses refraction.",
		day: "24 h",
		radius: "6,371 km",
	},
];

export function HomePage() {
	return (
		<div className="flex flex-col gap-lg">
			<h2>Body</h2>
			<nav className="flex flex-col flex-wrap gap-md" aria-label="Body">
				{bodies.map((body) => (
					<a
						key={body.code}
						className="flex flex-col gap-md flex-[1_1_16rem] min-h-control p-lg border border-control bg-neutral text-default no-underline hover:bg-neutralHover pressed:bg-neutralActive"
						href={`/${body.code}/sites`}
					>
						<span className="text-heading">{body.name}</span>
						<dl className="grid grid-cols-[6.5rem_1fr] gap-x-md gap-y-xs">
							{body.latin ? (
								<>
									<dt className="text-secondary">Latin</dt>
									<dd>{body.latin}</dd>
								</>
							) : null}
							<dt className="text-secondary">Horizons</dt>
							<dd>{body.code}</dd>
							<dt className="text-secondary">Air</dt>
							<dd>{body.air}</dd>
							<dt className="text-secondary">Solar day</dt>
							<dd>{body.day}</dd>
							<dt className="text-secondary">Radius</dt>
							<dd>{body.radius}</dd>
						</dl>
					</a>
				))}
			</nav>
		</div>
	);
}
