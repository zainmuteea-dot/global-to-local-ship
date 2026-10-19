import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // إعداد Nitro المضاف من Lovable موجود مسبقًا، لا تضف Plugin آخر.
  nitro: {
    preset: "netlify",
  },
  tanstackStart: {
    router: { routeFileIgnorePattern: "(test|received-summary|payment-approval)\\.ts" },
    server: { entry: "server" },
  },
});
