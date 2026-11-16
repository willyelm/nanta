import assert from "node:assert/strict";
import { test } from "node:test";
import { Vector3 } from "three";
import { read, slot, useSpace } from "./api.ts";

test("read copies array, object, or Vector3 into the out vector", () => {
	const out = new Vector3();
	assert.equal(read([1, 2, 3], out), out);
	assert.deepEqual({ x: out.x, y: out.y, z: out.z }, { x: 1, y: 2, z: 3 });
	read({ x: 4, y: 5, z: 6 }, out);
	assert.deepEqual({ x: out.x, y: out.y, z: out.z }, { x: 4, y: 5, z: 6 });
	const other = new Vector3();
	other.set(7, 8, 9);
	read(other, out);
	assert.deepEqual({ x: out.x, y: out.y, z: out.z }, { x: 7, y: 8, z: 9 });
});

test("useSpace returns the mounted handle", () => {
	const handle = {
		move() {},
		put() {},
		scale() {},
		show() {},
	};
	slot.current = handle;
	assert.equal(useSpace(), handle);
	slot.current = null;
});
