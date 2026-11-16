import { bodies } from "body";

// Document titles: "Nanta - …". Pages render a React 19 <title>; React hoists it into <head>.

export function nantaTitle(detail: string) {
	return `Nanta - ${detail}`;
}

export function bodyLabel(code: string) {
	const body = bodies.find((entry) => entry.code === code);
	return body ? `${body.name} ${body.code}` : code;
}

// Body sites: "Moon 301". With a site: "KSC". With a named window: "KSC/JUN27".
export function sitesDetail(code: string, site: string, window: string) {
	if (!site) return bodyLabel(code);
	if (!window || window === "TODAY") return site;
	return `${site}/${window}`;
}
