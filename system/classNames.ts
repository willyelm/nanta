// Joins the truthy class names with spaces; undefined when none, so React omits the attribute.
// classNames("px-md", pressed && "bg-neutralActive", className)
export function classNames(...classes: (string | false | undefined | null)[]): string | undefined {
	return classes.filter(Boolean).join(" ") || undefined;
}
