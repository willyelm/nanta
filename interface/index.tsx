import { HomePage } from "interface/pages/HomePage";
import { Layout } from "interface/pages/Layout";
import { NotFoundPage } from "interface/pages/NotFoundPage";
import { SitesPage } from "interface/pages/SitesPage";
import { define, type Routes, route } from "system";

export const routes: Routes = define([
	route("/", {
		index: Layout,
		notFound: NotFoundPage,
		children: [route("", { index: HomePage }), route("{code}/sites", { index: SitesPage })],
	}),
]);
