// O pacote Lovable ja registra TanStack Start, React e Tailwind.
// Nao adicione esses plugins novamente.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Fora do sandbox Lovable, o adaptador Nitro precisa ser habilitado
// explicitamente para produzir as funcoes e os arquivos da Vercel.
const isLovableSandbox =
  process.env.LOVABLE_SANDBOX === "1" ||
  Boolean(process.env.DEV_SERVER__PROJECT_PATH);

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  ...(isLovableSandbox
    ? {}
    : {
        nitro: {
          preset: "vercel",
          output: {
            dir: ".vercel/output",
            serverDir: ".vercel/output/functions/__server.func",
            publicDir: ".vercel/output/static",
          },
        },
      }),
});
