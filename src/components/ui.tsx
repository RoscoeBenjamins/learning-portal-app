import Link from "next/link";
import type { ReactNode } from "react";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <p className="muted animate-pulse py-10 text-[15px]">{label}</p>;
}
export function ErrorBox({ message }: { message: string }) {
  return <div className="card text-[15px] text-[#C4221A] dark:text-[#FF453A]">Something went wrong: {message}</div>;
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="muted mt-1 text-sm">{children}</div>}
    </div>
  );
}
export function PageHeader({ title, subtitle, back }: { title: string; subtitle?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8">
      {back && <Link href={back.href} className="inline-flex min-h-[44px] items-center gap-1 text-[15px] text-brand-600 dark:text-[#2997FF]"><span aria-hidden>‹</span> {back.label}</Link>}
      <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] sm:text-[34px]">{title}</h1>
      {subtitle && <div className="muted mt-1.5 text-[15px]">{subtitle}</div>}
    </div>
  );
}
export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`pill tone-${tone}`}>{children}</span>;
}
export const NOT_YET = "Nothing here yet. It will appear after lecture materials are uploaded to this course's Drive folder and the portal is updated.";
