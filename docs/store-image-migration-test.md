# Store image migration test

This automated database test applies the merged compatibility migration to a new, disposable local Supabase project, applies it twice to verify idempotency, then checks the image fields, constraints, column grants, own-store RPC, store-owner update access, and active-store image read policy. Test users and storage objects are synthetic, created inside a transaction, and rolled back.

## Run locally

Prerequisites: Docker-compatible container runtime and the Supabase CLI.

```bash
bash scripts/test-store-image-migration.sh
```

The script creates a temporary directory with its own unlinked `supabase/config.toml`, copies only a synthetic pre-migration schema and the compatibility migration into that test project, starts the local stack, runs `supabase test db`, and removes the stack and directory afterward. It clears hosted Supabase credentials from its process and does not run `supabase link`, `supabase db push`, or any remote command. Never change this script to point at a hosted project.

GitHub Actions runs the same script on pull requests and pushes to `main` that change Supabase migrations or this test. The workflow uses no Supabase secrets and grants only repository read access.
