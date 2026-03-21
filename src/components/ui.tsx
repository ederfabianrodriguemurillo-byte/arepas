"use client";

import clsx from "clsx";
import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({
  children,
  className,
  busy,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        {
          "bg-amber-500 text-stone-950 hover:bg-amber-400": variant === "primary",
          "bg-stone-800 text-stone-100 hover:bg-stone-700": variant === "secondary",
          "border border-stone-700 bg-transparent text-stone-200 hover:bg-stone-900": variant === "ghost",
          "bg-rose-500 text-white hover:bg-rose-400": variant === "danger",
        },
        className,
      )}
      disabled={busy || props.disabled}
      {...props}
    >
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-2xl border border-stone-700 bg-stone-950/70 px-4 py-3 text-sm text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-amber-400",
        props.className,
      )}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "w-full rounded-2xl border border-stone-700 bg-stone-950/70 px-4 py-3 text-sm text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-amber-400",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full rounded-2xl border border-stone-700 bg-stone-950/70 px-4 py-3 text-sm text-stone-100 outline-none transition focus:border-amber-400",
        props.className,
      )}
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("rounded-3xl border border-stone-800 bg-stone-900/70 p-5 shadow-2xl shadow-black/10", className)}>{children}</div>;
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-2xl font-black text-stone-50">{title}</h2>
        {subtitle ? <p className="text-sm text-stone-400">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Banner({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: ReactNode;
}) {
  return (
    <div
      className={clsx("rounded-2xl border px-4 py-3 text-sm", {
        "border-sky-800 bg-sky-950/50 text-sky-100": tone === "info",
        "border-rose-800 bg-rose-950/50 text-rose-100": tone === "error",
        "border-emerald-800 bg-emerald-950/50 text-emerald-100": tone === "success",
      })}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex min-h-52 flex-col items-center justify-center gap-3 border-dashed text-center">
      <h3 className="text-xl font-semibold text-stone-100">{title}</h3>
      <p className="max-w-md text-sm text-stone-400">{description}</p>
      {action}
    </Card>
  );
}

export function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <Card className="space-y-1">
      <p className="text-sm text-stone-400">{label}</p>
      <p className="text-3xl font-black text-stone-50">{value}</p>
      {helper ? <p className="text-xs text-stone-500">{helper}</p> : null}
    </Card>
  );
}
