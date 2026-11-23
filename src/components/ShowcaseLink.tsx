import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SHOWCASE_URL, hasExternalShowcase } from "@/lib/site-config";

/** Link do Showcase: externo (Vercel) quando configurado, senão a página interna. */
export function ShowcaseLink({ className, children }: { className?: string; children: ReactNode }) {
  if (hasExternalShowcase) {
    return (
      <a href={SHOWCASE_URL} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to="/showcase" className={className}>
      {children}
    </Link>
  );
}
