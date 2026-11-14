import type { Routes } from "system";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SitesPage } from "./pages/SitesPage";

export const routes: Routes = {
	"/": HomePage,
	"/sites": SitesPage,
	"*": NotFoundPage,
};
