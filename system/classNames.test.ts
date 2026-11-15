import assert from "node:assert/strict";
import { test } from "node:test";
import { classNames } from "./classNames.ts";

test("joins the truthy class names", () => {
	assert.equal(classNames("a", false, "b", undefined, null, "", "c"), "a b c");
});

test("is undefined when there are none", () => {
	assert.equal(classNames(), undefined);
	assert.equal(classNames(false, null, undefined, ""), undefined);
});
