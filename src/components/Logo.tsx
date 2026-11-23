/**
 * Logo em texto (não depende de arquivo de imagem hospedado externamente).
 * A cor vem de `className` (ex.: text-primary, text-white).
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      aria-label="growCo."
      className={`inline-block select-none font-bold leading-none tracking-[-0.04em] ${className}`}
    >
      growCo.
    </span>
  );
}
