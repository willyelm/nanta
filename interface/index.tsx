import { define, type Routes, route } from "system";
import { HomePage } from "./pages/HomePage";
import { Layout } from "./pages/Layout";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SitesPage } from "./pages/SitesPage";

export const routes: Routes = define([
	route("/", {
		index: Layout,
		notFound: NotFoundPage,
		children: [route("", { index: HomePage }), route("{code}/sites", { index: SitesPage })],
	}),
]);
