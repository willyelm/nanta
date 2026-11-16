import { Panel, Panels } from "interface/panel";
import { nantaTitle } from "./title";

export function NotFoundPage() {
	return (
		<>
			<title>{nantaTitle("Not found")}</title>
			<Panels>
				<Panel as="p">Page not found.</Panel>
			</Panels>
		</>
	);
}
