// The name, version, command, and mode, printed once at the start of build, dev, test, and server.
// Run directly as `node scripts/splash.ts <command> <mode>`, or import splash().
import pkg from "../package.json" with { type: "json" };

export type Mode = "prod" | "dev";

export function splash(command: string, mode: Mode) {
	const dim = (text: string) => `\x1b[2m${text}\x1b[0m`;
	const bold = (text: string) => `\x1b[1m${text}\x1b[0m`;
	console.log(`\n⠀ ⢠⣶⣿⣿⣶⡄⠀
 ⠀⢸⣿⣿⣿⣿⡷⠀
 ⣧⠈⠻⠿⠿⠟⠁⣼   ${bold(pkg.name)}
 ⣿⡇⠀⠀⣤⡄⢸⣿   ${dim(`v${pkg.version}`)} ${command}/${mode}
 ⣿⡇⠀⠀⠘⣿⣼⣿   ${dim(pkg.description)}
 ⣿⡇⠀⠀⠀⠘⣿⣿\n`);
}

if (import.meta.main) splash(process.argv[2] ?? "", process.argv[3] === "prod" ? "prod" : "dev");
