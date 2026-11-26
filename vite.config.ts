import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  server: {
    port: 8080,
    strictPort: true,
  },
  // يستخدم Vercel preset عند البناء على Vercel،
  // وNetlify preset في بيئة Lovable.
  nitro: {
    preset: process.env["VERCEL"] ? "vercel" : "netlify",
  },
  tanstackStart: {
    router: { routeFileIgnorePattern: "(test|received-summary|payment-approval)\\.ts" },
    client: { entry: "client" },
    server: { entry: "server" },
  },
});
