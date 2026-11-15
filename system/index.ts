// The runtime: system plus React, built once and shared by browser and server. The build points
// "react", "react-dom", and "system" here, so there is one React. Extensions are explicit because
// router.ts and Router.tsx differ only by case.

import * as React from "react";
import * as ReactDOM from "react-dom";

export {
	Children,
	Component,
	cloneElement,
	createContext,
	createElement,
	isValidElement,
	lazy,
	memo,
	Suspense,
	startTransition,
	use,
	useActionState,
	useCallback,
	useContext,
	useDeferredValue,
	useEffect,
	useEffectEvent,
	useId,
	useLayoutEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
	useSyncExternalStore,
	useTransition,
} from "react";
export { Fragment, jsx, jsxs } from "react/jsx-runtime";
export { createPortal, useFormStatus } from "react-dom";
export { createRoot, hydrateRoot } from "react-dom/client";
export * from "./classNames.ts";
export * from "./log.ts";
export * from "./Router.tsx";
export * from "./resumable.tsx";
export * from "./router.ts";
// Whole modules, for the server build's require shim: react-dom/server requires these.
export { React, ReactDOM };
