import type { InputHTMLAttributes, ReactNode } from "react";
import { Info } from "./Info";

export { Info };

export function PageHeader({
  title,
  description,
  info,
}: {
  title: string;
  description?: string;
  info?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <h1 className="flex items-center text-2xl font-bold tracking-tight text-text">
        {title}
        {info && <Info>{info}</Info>}
      </h1>
      {description && <p className="mt-1.5 max-w-2xl text-sm text-text-soft">{description}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-6 ${className}`}>{children}</div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-mute">{children}</p>
  );
}

export function CardTitle({ children, info }: { children: ReactNode; info?: ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center text-sm font-semibold capitalize text-text">
      {children}
      {info && <Info>{info}</Info>}
    </h2>
  );
}

/** A plain <table> styled to read cleanly, like a rendered markdown table — clear header row,
 * generous row padding, hairline dividers instead of a dense grid. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[480px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="bg-surface-2">{children}</thead>;
}

export function Th({ children, info }: { children?: ReactNode; info?: ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-mute">
      <span className="inline-flex items-center">
        {children}
        {info && <Info>{info}</Info>}
      </span>
    </th>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`border-t border-border px-4 py-3 text-text-soft ${className}`}>{children}</td>;
}

export function TdStrong({ children, info }: { children: ReactNode; info?: ReactNode }) {
  return (
    <Td className="font-medium text-text">
      <span className="inline-flex items-center">
        {children}
        {info && <Info>{info}</Info>}
      </span>
    </Td>
  );
}

export function TdNum({ children }: { children: ReactNode }) {
  return <Td className="font-mono tabular-nums text-text">{children}</Td>;
}

type PillTone = "good" | "warn" | "danger" | "neutral";

const pillTone: Record<PillTone, string> = {
  good: "bg-success-soft text-success",
  warn: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-2 text-text-soft",
};

export function Pill({ tone = "neutral", children }: { tone?: PillTone; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${pillTone[tone]}`}>
      {children}
    </span>
  );
}

export function Field({
  label,
  info,
  children,
}: {
  label: string;
  info?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="inline-flex items-center font-medium text-text-soft">
        {label}
        {info && <Info>{info}</Info>}
      </span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent ${props.className ?? ""}`}
    />
  );
}

export function TableInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-border bg-surface-2 px-2 py-1.5 text-sm text-text outline-none transition-colors focus:border-accent ${props.className ?? ""}`}
    />
  );
}

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const base = "rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer";
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:bg-accent-deep"
      : "bg-transparent text-text-soft hover:text-text";
  return (
    <button {...props} className={`${base} ${styles} ${props.className ?? ""}`}>
      {children}
    </button>
  );
}
