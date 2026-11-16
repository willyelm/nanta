import { BodiesPage } from "interface/pages/BodiesPage";
import { CandidatesPage } from "interface/pages/CandidatesPage";
import { Layout } from "interface/pages/Layout";
import { NotFoundPage } from "interface/pages/NotFoundPage";
import { SitesPage } from "interface/pages/SitesPage";
import { define, type Routes, route } from "system";

export const routes: Routes = define([
	route("/", {
		index: Layout,
		notFound: NotFoundPage,
		children: [
			route("", { index: BodiesPage }),
			route("candidates", { index: CandidatesPage }),
			route("{code}/sites", { index: SitesPage }),
			route("{code}/sites/{site}", { index: SitesPage }),
		],
	}),
]);
