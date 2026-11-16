import { BodiesPage } from "interface/pages/BodiesPage";
import { CandidatesPage } from "interface/pages/CandidatesPage";
import { Layout } from "interface/pages/Layout";
import { NotFoundPage } from "interface/pages/NotFoundPage";
import { EditSitePage, NewSitePage, SitePage, SitesPage } from "interface/pages/SitesPage";
import { define, type Routes, route } from "system";

export const routes: Routes = define([
	route("/", {
		index: Layout,
		notFound: NotFoundPage,
		children: [
			route("", { index: BodiesPage }),
			route("candidates", { index: CandidatesPage }),
			route("{code}/sites", { index: SitesPage }),
			route("{code}/sites/new", { index: NewSitePage }),
			route("{code}/sites/{site}", { index: SitePage }),
			route("{code}/sites/{site}/edit", { index: EditSitePage }),
		],
	}),
]);
