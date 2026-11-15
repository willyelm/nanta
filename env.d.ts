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

// The parts of three.js that Horizon uses (interface/horizon).
declare module "three" {
	export class BufferGeometry {
		setAttribute(name: string, attribute: BufferAttribute): void;
	}
	export class BufferAttribute {
		constructor(array: Float32Array, itemSize: number);
	}
	export class LineBasicMaterial {
		constructor(params?: { color?: string });
	}
	export class LineDashedMaterial {
		constructor(params?: { color?: string; dashSize?: number; gapSize?: number });
	}
	export class Line {
		constructor(geometry: BufferGeometry, material: LineBasicMaterial | LineDashedMaterial);
		computeLineDistances(): this;
	}
	export class Scene {
		add(object: Line): void;
	}
	export class OrthographicCamera {
		constructor(
			left: number,
			right: number,
			top: number,
			bottom: number,
			near: number,
			far: number,
		);
	}
	export class WebGLRenderer {
		constructor(params?: { canvas?: HTMLCanvasElement; antialias?: boolean; alpha?: boolean });
		setSize(width: number, height: number, updateStyle?: boolean): void;
		render(scene: Scene, camera: OrthographicCamera): void;
		dispose(): void;
	}
}
