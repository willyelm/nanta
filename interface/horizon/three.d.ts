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
	export class Line {
		constructor(geometry: BufferGeometry, material: LineBasicMaterial);
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
