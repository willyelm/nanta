// Built file URLs from esbuild's metafile, defined in the server build (scripts/build.ts).
declare const MANIFEST: { runtime: string; interface: string; style: string };

// An .svg file is a React component (scripts/svg.ts): props go on the <svg>. `icon` sizes it to
// the text around it.
declare module "*.svg" {
	const Icon: (
		props: import("react").SVGProps<SVGSVGElement> & { icon?: boolean },
	) => import("react").ReactElement;
	export default Icon;
}

// The parts of three.js that the scene uses (interface/horizon).
declare module "three" {
	export class Vector3 {
		x: number;
		y: number;
		z: number;
		set(x: number, y: number, z: number): this;
		copy(vector: Vector3): this;
		clone(): Vector3;
		lerp(vector: Vector3, alpha: number): this;
		distanceTo(vector: Vector3): number;
		project(camera: PerspectiveCamera): this;
		unproject(camera: PerspectiveCamera): this;
		normalize(): this;
		add(vector: Vector3): this;
		sub(vector: Vector3): this;
		crossVectors(a: Vector3, b: Vector3): this;
		applyQuaternion(quaternion: Quaternion): this;
		multiplyScalar(scalar: number): this;
		length(): number;
		dot(vector: Vector3): number;
	}
	export class Quaternion {
		copy(quaternion: Quaternion): this;
		setFromAxisAngle(axis: Vector3, angle: number): this;
	}
	export class Object3D {
		position: Vector3;
		up: Vector3;
		scale: Vector3;
		quaternion: Quaternion;
		visible: boolean;
		add(...objects: Object3D[]): this;
		remove(...objects: Object3D[]): this;
		lookAt(vector: Vector3): void;
	}
	export class Scene extends Object3D {}
	export class BufferGeometry {
		setAttribute(name: string, attribute: BufferAttribute): this;
		getAttribute(name: string): BufferAttribute;
		dispose(): void;
	}
	export class BufferAttribute {
		constructor(array: Float32Array, itemSize: number);
		array: Float32Array;
		needsUpdate: boolean;
	}
	export class SphereGeometry extends BufferGeometry {
		constructor(radius: number, widthSegments?: number, heightSegments?: number);
	}
	export class RingGeometry extends BufferGeometry {
		constructor(innerRadius: number, outerRadius: number, segments?: number);
	}
	export class CircleGeometry extends BufferGeometry {
		constructor(radius: number, segments?: number);
		rotateX(angle: number): this;
	}
	type MaterialParams = {
		color?: string;
		transparent?: boolean;
		opacity?: number;
		dashSize?: number;
		gapSize?: number;
		wireframe?: boolean;
		vertexColors?: boolean;
	};
	export class Material {
		constructor(params?: MaterialParams);
		color: { set(color: string): void };
		dispose(): void;
	}
	export class LineBasicMaterial extends Material {}
	export class LineDashedMaterial extends Material {}
	export class MeshBasicMaterial extends Material {}
	export class MeshStandardMaterial extends Material {}
	export class Line extends Object3D {
		constructor(geometry: BufferGeometry, material: Material);
		geometry: BufferGeometry;
		computeLineDistances(): this;
	}
	export class Points extends Object3D {
		constructor(geometry: BufferGeometry, material: Material);
	}
	export class PointsMaterial extends Material {
		constructor(params?: { color?: string; size?: number; sizeAttenuation?: boolean });
	}
	export class LineSegments extends Object3D {
		constructor(geometry: BufferGeometry, material: Material);
	}
	export class Mesh extends Object3D {
		constructor(geometry: BufferGeometry, material: Material);
		material: Material;
	}
	export class DirectionalLight extends Object3D {
		constructor(color?: string, intensity?: number);
	}
	export class PointLight extends Object3D {
		constructor(color?: string, intensity?: number, distance?: number, decay?: number);
	}
	export class AmbientLight extends Object3D {
		constructor(color?: string, intensity?: number);
	}
	export class PerspectiveCamera extends Object3D {
		constructor(fov: number, aspect: number, near: number, far: number);
		aspect: number;
		updateProjectionMatrix(): void;
	}
	export class WebGLRenderer {
		constructor(params?: { canvas?: HTMLCanvasElement; antialias?: boolean; alpha?: boolean });
		setPixelRatio(ratio: number): void;
		setSize(width: number, height: number, updateStyle?: boolean): void;
		render(scene: Scene, camera: PerspectiveCamera): void;
		dispose(): void;
	}
}
