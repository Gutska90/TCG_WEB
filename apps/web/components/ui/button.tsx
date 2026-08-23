"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { buttonClassName, type ButtonVariant } from "./button-styles";

export type { ButtonVariant };

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; children: ReactNode }) {
  return (
    <button type="button" className={buttonClassName(variant, className)} {...props}>
      {children}
    </button>
  );
}
