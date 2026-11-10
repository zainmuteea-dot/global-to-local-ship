// Supabase Edge Function entrypoint. Gateway JWT verification remains enabled in config.toml.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createWalletTopupProofHandler, type WalletProofClient } from "./handler.ts";

const handler = createWalletTopupProofHandler({
  createClient: (url, anonKey, options) =>
    createClient(url, anonKey, options) as unknown as WalletProofClient,
  getEnv: (name) => Deno.env.get(name),
});

Deno.serve(handler);
