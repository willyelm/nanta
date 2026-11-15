import type { InputHTMLAttributes } from "react";
import { TextBox } from "./TextBox";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
	return <TextBox as="input" {...props} />;
}
