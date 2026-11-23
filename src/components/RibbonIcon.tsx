import type { SVGProps } from "react";

/**
 * Ícone ribbon-outline da biblioteca Ionicons, usado também no app growCo.
 * Copyright (c) Ionic Team. Licença MIT (veja LICENSE-IONICONS.txt).
 */
export function RibbonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 512 512"
      fill="none"
      stroke="currentColor"
      strokeWidth="32"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="256" cy="160" r="128" />
      <path d="M143.65 227.82L48 400l86.86-.42a16 16 0 0 1 13.82 7.8L192 480l88.33-194.32" />
      <path d="M366.54 224L464 400l-86.86-.42a16 16 0 0 0-13.82 7.8L320 480l-64-140.8" />
      <circle cx="256" cy="160" r="64" />
    </svg>
  );
}
