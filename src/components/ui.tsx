import Link from "next/link";
import type { ReactNode } from "react";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <p className="muted py-8 text-sm">{label}</p>;
}
export function ErrorBox({ message }: { message: string }) {
  return <div className="card border-rose-300 text-sm text-rose-700 dark:text-rose-300">Something went wrong: {message}</div>;
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="muted mt-1 text-sm">{children}</div>}
    </div>
  );
}
export function PageHeader({ title, subtitle, back }: { title: string; subtitle?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6">
      {back && <Link href={back.href} className="muted text-sm hover:underline">← {back.label}</Link>}
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <div className="muted mt-1 text-sm">{subtitle}</div>}
    </div>
  );
}
export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`pill tone-${tone}`}>{children}</span>;
}
export const NOT_YET = "Nothing here yet. It will appear after lecture materials are uploaded to this course's Drive folder and the portal is updated.";
