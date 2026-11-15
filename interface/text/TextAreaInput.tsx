import type { TextareaHTMLAttributes } from "react";
import { TextBox } from "./TextBox";

export function TextAreaInput(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return <TextBox as="textarea" {...props} />;
}
