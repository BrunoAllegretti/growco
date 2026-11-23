const SHOWCASE_LINK = ""; // <- COLA O LINK AQUI CELLBIT

export const SHOWCASE_URL: string = (SHOWCASE_LINK || import.meta.env.VITE_SHOWCASE_URL || "").trim();

export const hasExternalShowcase = /^https?:\/\//i.test(SHOWCASE_URL);
