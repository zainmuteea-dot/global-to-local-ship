const SUPABASE_URL = 'https://wviryamctttjppbodqaal.supabase.co';
const SUPABASE_ANON_KEY = 'ضع_هنا_مفتاح_anon_الحقيقي';

async function sb(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) return { data: null, error: { message: JSON.stringify(data) } };
  return { data, error: null };
}

export const supabase = {
  from: (table: string) => ({
    select: (_cols = '*') => ({
      eq: (col: string, val: string) => sb(`${table}?select=*&${col}=eq.${val}`),
      order: (col: string, opts: any = {}) => {
        const dir = opts.ascending === false ? 'desc' : 'asc';
        return sb(`${table}?select=*&order=${col}.${dir}`);
      },
    }),
    insert: (rows: any) => sb(table, { method: 'POST', body: JSON.stringify(rows) }),
  }),
};
