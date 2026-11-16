import type { Body } from "position";
import type { Vector3 } from "three";

export type XYZ = Vector3 | { x: number; y: number; z: number } | [number, number, number];

// The live scene: bodies already exist; callers set where they go. move eases from where a body
// is; put snaps. O(1) per call; the render loop does the easing.
export type Space = {
	move(body: Body, to: XYZ): void;
	put(body: Body, to: XYZ): void;
	scale(body: Body, s: number): void;
	show(body: Body, on: boolean): void;
};

// Set while Space is mounted.
export const slot: { current: Space | null } = { current: null };

export function read(to: XYZ, out: Vector3) {
	if (Array.isArray(to)) out.set(to[0], to[1], to[2]);
	else out.set(to.x, to.y, to.z);
	return out;
}
