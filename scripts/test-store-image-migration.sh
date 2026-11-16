#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_root="$(mktemp -d "${TMPDIR:-/tmp}/merchant-store-image-migration.XXXXXX")"
local_project_id="merchant-store-image-compat-test"

cleanup() {
  (cd "$test_root" && supabase stop --project-id "$local_project_id" --no-backup >/dev/null 2>&1) || true
  rm -rf -- "$test_root"
}
trap cleanup EXIT

# Keep this process local-only even when a developer has hosted-project
# credentials in their shell. This script never links or targets a hosted ref.
unset SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_DB_URL SUPABASE_PROJECT_ID \
  SUPABASE_PROJECT_REF SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY || true

mkdir -p "$test_root/supabase/migrations" "$test_root/supabase/tests/database"
cat > "$test_root/supabase/config.toml" <<TOML
project_id = "$local_project_id"
TOML

cp "$repo_root/supabase/tests/fixtures/merchant_store_pre_image_fields.sql" \
  "$test_root/supabase/migrations/20261115000000_merchant_store_pre_image_fields.sql"
cp "$repo_root/supabase/migrations/20261116020000_store_image_fields_compat.sql" \
  "$test_root/supabase/migrations/20261116020000_store_image_fields_compat.sql"
cp "$repo_root/supabase/migrations/20261116040000_merchant_store_rpc_anon_revoke.sql" \
  "$test_root/supabase/migrations/20261116040000_merchant_store_rpc_anon_revoke.sql"
# Reapplying the same migration checks its compatibility/idempotency guards.
cp "$repo_root/supabase/migrations/20261116020000_store_image_fields_compat.sql" \
  "$test_root/supabase/migrations/20261116020100_store_image_fields_compat_repeat.sql"
cp "$repo_root/supabase/migrations/20261116030000_marketplace_best_sellers.sql" \
  "$test_root/supabase/migrations/20261116030000_marketplace_best_sellers.sql"
cp "$repo_root/supabase/tests/database/merchant_store_images_compat_test.sql" \
  "$test_root/supabase/tests/database/merchant_store_images_compat_test.sql"
cp "$repo_root/supabase/tests/database/marketplace_best_sellers_test.sql" \
  "$test_root/supabase/tests/database/marketplace_best_sellers_test.sql"

cd "$test_root"
supabase start
supabase db reset --local --no-seed
supabase test db --local supabase/tests/database/merchant_store_images_compat_test.sql
supabase test db --local supabase/tests/database/marketplace_best_sellers_test.sql
