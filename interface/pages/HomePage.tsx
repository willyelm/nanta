import styles from "./HomePage.module.css";

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
		<div className={styles.page}>
			<h2>Body</h2>
			<nav className={styles.choices} aria-label="Body">
				{bodies.map((body) => (
					<a key={body.code} className={styles.choice} href={`/${body.code}/sites`}>
						<span className={styles.name}>{body.name}</span>
						<dl>
							{body.latin ? (
								<>
									<dt>Latin</dt>
									<dd>{body.latin}</dd>
								</>
							) : null}
							<dt>Horizons</dt>
							<dd>{body.code}</dd>
							<dt>Air</dt>
							<dd>{body.air}</dd>
							<dt>Solar day</dt>
							<dd>{body.day}</dd>
							<dt>Radius</dt>
							<dd>{body.radius}</dd>
						</dl>
					</a>
				))}
			</nav>
		</div>
	);
}
