import { AccountShell } from "@/components/AccountShell";

export type Section = { title: string; text?: string; bullets?: string[] };

export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: Section[] }) {
  return (
    <AccountShell title={title} back="/my-account">
      <p className="-mt-3 mb-4 text-center text-[11px] text-muted-foreground">آخر تحديث: {updated}</p>
      <div className="divide-y divide-border rounded-3xl bg-card p-5 ring-1 ring-border">
        {sections.map((s, i) => (
          <section key={s.title} className="py-4 first:pt-0 last:pb-0">
            <h2 className="font-display text-base font-black text-cocoadeep">{i + 1}. {s.title}</h2>
            {s.text && <p className="mt-2 text-sm leading-7 text-cocoa">{s.text}</p>}
            {s.bullets && (
              <ul className="mt-2 list-disc space-y-1 pr-5 text-sm leading-7 text-cocoa">
                {s.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            )}
          </section>
        ))}
      </div>
    </AccountShell>
  );
}
