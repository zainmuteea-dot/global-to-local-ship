import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

type AccountShellProps = {
  title: string;
  back?: string;
  children: ReactNode;
  wide?: boolean;
};

export function AccountShell({
  title,
  back = "/my-account",
  children,
  wide = false,
}: AccountShellProps) {
  const navigate = useNavigate();

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background px-4 py-6 font-body">
      <div className={`mx-auto w-full max-w-md ${wide ? "lg:max-w-6xl" : ""}`}>
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate({ to: back })}
            className="flex items-center gap-1 rounded-full bg-card px-4 py-2 text-xs font-bold text-cocoa ring-1 ring-border"
          >
            <ArrowRight className="size-4" />
            رجوع
          </button>

          <h1 className="font-display text-lg font-black text-cocoadeep">{title}</h1>

          <span className="w-16" aria-hidden="true" />
        </div>

        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-clay">
        {icon}
      </span>

      <p className="font-display text-sm font-black text-cocoadeep">{title}</p>

      {text && <p className="text-xs text-muted-foreground">{text}</p>}
    </div>
  );
}
