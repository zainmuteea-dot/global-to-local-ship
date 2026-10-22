import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/customers")({
  component: CustomersPage,
});

interface Customer {
  id: string;
  created_at: string;
  name: string;
  phone: string | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

interface CustomerBatch {
  customers: Customer[];
  nextOffset: number;
  hasMore: boolean;
}

const PAGE_SIZE = 50;

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "\u2014";
  }

  return date.toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function getStaffIdsForAdmin(): Promise<Set<string>> {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) throw authError;

  if (!authData.user) {
    throw new Error("\u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u062d\u0633\u0627\u0628 \u0625\u062f\u0627\u0631\u064a \u0644\u0639\u0631\u0636 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621.");
  }

  const { data: isAdmin, error: roleCheckError } = await supabase.rpc("has_role", {
    _user_id: authData.user.id,
    _role: "admin",
  });

  if (roleCheckError) throw roleCheckError;

  if (!isAdmin) {
    throw new Error("\u0647\u0630\u0627 \u0627\u0644\u062d\u0633\u0627\u0628 \u0644\u0627 \u064a\u0645\u0644\u0643 \u0635\u0644\u0627\u062d\u064a\u0629 \u0639\u0631\u0636 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621.");
  }

  const { data: roleRows, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id, role");

  if (rolesError) throw rolesError;

  return new Set(
    (roleRows ?? [])
      .filter((row) => row.role === "admin" || row.role === "staff")
      .map((row) => row.user_id),
  );
}

function toCustomers(profiles: ProfileRow[], staffIds: Set<string>): Customer[] {
  return profiles
    .filter((profile) => !staffIds.has(profile.id))
    .map((profile) => ({
      id: profile.id,
      name: profile.full_name?.trim() || "\u0639\u0645\u064a\u0644 \u0628\u062f\u0648\u0646 \u0627\u0633\u0645",
      phone: profile.phone,
      created_at: profile.created_at,
    }));
}

/**
 * \u064a\u0642\u0631\u0623 \u0635\u0641\u062d\u0627\u062a \u0645\u062d\u062f\u0648\u062f\u0629 \u0645\u0646 profiles \u0648\u064a\u0648\u0627\u0635\u0644 \u062a\u062c\u0627\u0648\u0632 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u0628\u0639\u062f\u0629
 * \u062d\u062a\u0649 \u064a\u062c\u0645\u0639 \u062f\u0641\u0639\u0629 \u0639\u0645\u0644\u0627\u0621 \u0643\u0627\u0645\u0644\u0629\u060c \u0623\u0648 \u064a\u0635\u0644 \u0625\u0644\u0649 \u0646\u0647\u0627\u064a\u0629 \u0627\u0644\u0646\u062a\u0627\u0626\u062c.
 */
async function fetchCustomerBatch(
  startOffset: number,
  staffIds: Set<string>,
): Promise<CustomerBatch> {
  const customers: Customer[] = [];
  let offset = startOffset;

  while (customers.length < PAGE_SIZE) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    const profiles = (data ?? []) as ProfileRow[];
    customers.push(...toCustomers(profiles, staffIds));
    offset += profiles.length;

    // \u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0623\u0642\u0635\u0631 \u0645\u0646 \u0627\u0644\u062d\u062c\u0645 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u062a\u0639\u0646\u064a \u0639\u062f\u0645 \u0648\u062c\u0648\u062f \u0635\u0641\u062d\u0629 \u0623\u062e\u0631\u0649.
    if (profiles.length < PAGE_SIZE) {
      return {
        customers,
        nextOffset: offset,
        hasMore: false,
      };
    }
  }

  return {
    customers,
    nextOffset: offset,
    hasMore: true,
  };
}

// \u0645\u0633\u0627\u0639\u062f\u0627\u062a \u0639\u0631\u0636 \u0628\u062d\u062a\u0629 (\u0623\u0641\u0627\u062a\u0627\u0631 \u0628\u0627\u0644\u0623\u062d\u0631\u0641 \u0627\u0644\u0623\u0648\u0644\u0649) \u2014 \u0644\u0627 \u062a\u0624\u062b\u0631 \u0639\u0644\u0649 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a.
const AVATAR_COLORS = [
  "#0F4C81",
  "#2E7D32",
  "#F97316",
  "#5E35B1",
  "#0891B2",
  "#DB2777",
];

function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const joined = parts.map((p) => p[0] ?? "").join("");
  return joined || "\u0639";
}

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setCustomers([]);
    setNextOffset(0);
    setHasMore(true);

    try {
      const staffIds = await getStaffIdsForAdmin();
      const batch = await fetchCustomerBatch(0, staffIds);

      setCustomers(batch.customers);
      setNextOffset(batch.nextOffset);
      setHasMore(batch.hasMore);
    } catch (error) {
      console.error("\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621:", error);
      setCustomers([]);
      setHasMore(false);
      setLoadError(
        error instanceof Error ? error.message : "\u062d\u062f\u062b \u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u062a\u0648\u0642\u0639 \u0623\u062b\u0646\u0627\u0621 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u0621.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData, reloadKey]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;

    setLoadingMore(true);
    setLoadError(null);

    try {
      const staffIds = await getStaffIdsForAdmin();
      const batch = await fetchCustomerBatch(nextOffset, staffIds);

      setCustomers((current) => [...current, ...batch.customers]);
      setNextOffset(batch.nextOffset);
      setHasMore(batch.hasMore);
    } catch (error) {
      console.error("\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u062f\u0641\u0639\u0629 \u0623\u062e\u0631\u0649 \u0645\u0646 \u0627\u0644\u0639\u0645\u0644\u0627\u0621:", error);
      setLoadError(error instanceof Error ? error.message : "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u0632\u064a\u062f \u0645\u0646 \u0627\u0644\u0639\u0645\u0644\u0627\u0621.");
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, nextOffset]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        (customer.phone ?? "").toLowerCase().includes(query),
    );
  }, [customers, search]);

  const fontStack = { fontFamily: "Cairo, Tajawal, system-ui, sans-serif" };

  return (
    <main
      dir="rtl"
      style={fontStack}
      className="min-h-screen bg-[#F4F6FB] px-4 py-6 text-slate-800 sm:px-6"
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">\u0643\u0634\u0641 \u0627\u0644\u0639\u0645\u0644\u0627\u0621</h1>
            <p className="mt-1 text-sm text-slate-500">
              \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0645\u0633\u062c\u0644\u0629\u060c \u0645\u0639 \u0627\u0633\u062a\u0628\u0639\u0627\u062f \u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0625\u062f\u0627\u0631\u0629 \u0648\u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            disabled={loading || loadingMore}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0F4C81] px-5 py-3 text-sm font-black text-white shadow-md shadow-blue-500/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0642\u0627\u0626\u0645\u0629
          </button>
        </header>

        <section className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-sky-50 text-[#2196F3]">
              <Users className="size-5" />
            </span>

            <div>
              <p className="text-xs font-bold text-slate-500">\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u062d\u0645\u0651\u0644\u0648\u0646</p>
              <p className="text-3xl font-black leading-none text-slate-800">
                {loading ? "\u2014" : customers.length}
              </p>
            </div>
          </div>

          <label className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="\u0627\u0628\u062d\u062b \u0628\u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641"
              aria-label="\u0627\u0644\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u062d\u0645\u0651\u0644\u064a\u0646 \u0628\u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0627\u0644\u0647\u0627\u062a\u0641"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-3 text-sm outline-none transition focus:border-[#2196F3] focus:bg-white focus:ring-2 focus:ring-sky-100"
            />
          </label>
        </section>

        {loadError && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800"
          >
            {loadError}
            <p className="mt-2 font-normal leading-relaxed text-red-700">
              \u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u062e\u0637\u0623 \u0645\u062a\u0639\u0644\u0642\u064b\u0627 \u0628\u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a\u060c \u0641\u062a\u062d\u0642\u0642 \u0645\u0646 \u0645\u0646\u062d \u0627\u0644\u0645\u0634\u0631\u0641 \u0635\u0644\u0627\u062d\u064a\u0629 \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0635\u0641\u0648\u0641 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0641\u064a
              RLS \u0639\u0644\u0649 \u062c\u062f\u0648\u0644\u064a <code dir="ltr" className="rounded bg-red-100 px-1 font-mono">profiles</code> \u0648 <code dir="ltr" className="rounded bg-red-100 px-1 font-mono">user_roles</code>.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
            <RefreshCw className="size-6 animate-spin text-[#0F4C81]" />
            <p className="text-sm font-bold text-slate-500">\u062c\u0627\u0631\u064d \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u0621...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
            <span className="grid size-14 place-items-center rounded-full bg-slate-100 text-slate-400">
              <Users className="size-6" />
            </span>
            <p className="text-sm font-bold text-slate-500">
              {search.trim()
                ? hasMore
                  ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u0636\u0645\u0646 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u062d\u0645\u0651\u0644\u064a\u0646. \u062d\u0645\u0651\u0644 \u0627\u0644\u0645\u0632\u064a\u062f \u0644\u0644\u0628\u062d\u062b \u0641\u064a \u062f\u0641\u0639\u0627\u062a \u0623\u062e\u0631\u0649."
                  : "\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0644\u0628\u062d\u062b."
                : hasMore
                  ? "\u0644\u0627 \u064a\u0648\u062c\u062f \u0639\u0645\u0644\u0627\u0621 \u0641\u064a \u0627\u0644\u062f\u0641\u0639\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629. \u062d\u0645\u0651\u0644 \u0627\u0644\u0645\u0632\u064a\u062f \u0644\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0628\u0642\u064a\u0629 \u0627\u0644\u0642\u0627\u0626\u0645\u0629."
                  : "\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u0633\u0627\u0628\u0627\u062a \u0639\u0645\u0644\u0627\u0621 \u0644\u0639\u0631\u0636\u0647\u0627."}
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-right text-sm">
                <thead className="bg-slate-50 text-xs font-black text-slate-500">
                  <tr>
                    <th className="px-4 py-3">\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064a\u0644</th>
                    <th className="px-4 py-3">\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641</th>
                    <th className="px-4 py-3">\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062a\u0633\u062c\u064a\u0644</th>
                    <th className="px-4 py-3">\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u062d\u0633\u0627\u0628</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="bg-white transition hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-black text-white"
                            style={{ backgroundColor: avatarColor(customer.id) }}
                          >
                            {avatarInitials(customer.name)}
                          </span>
                          <span className="font-bold text-slate-800">{customer.name}</span>
                        </div>
                      </td>
                      <td dir="ltr" className="px-4 py-3 text-right font-mono text-xs text-slate-600">
                        {customer.phone || "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDate(customer.created_at)}
                      </td>
                      <td
                        dir="ltr"
                        className="px-4 py-3 text-right"
                      >
                        <span className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-500">
                          {customer.id}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!loading && hasMore && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-[#0F4C81] shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore && <RefreshCw className="size-4 animate-spin" />}
              {loadingMore ? "\u062c\u0627\u0631\u064d \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u0632\u064a\u062f..." : "\u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u0632\u064a\u062f"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
