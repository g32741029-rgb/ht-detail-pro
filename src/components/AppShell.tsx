import { Link } from "@tanstack/react-router";
import { CalendarPlus, Home, Images, Phone, SprayCan } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/Logo";
import { BUSINESS } from "@/lib/ht";

const navItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/servicos", label: "Serviços", icon: SprayCan },
  { to: "/agendar", label: "Agendar", icon: CalendarPlus, highlight: true },
  { to: "/galeria", label: "Galeria", icon: Images },
  { to: "/contato", label: "Contato", icon: Phone },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center rounded-xl bg-foreground p-1.5">
              <Logo size={30} />
            </span>
            <span className="font-display text-xl font-bold uppercase tracking-wider">
              HT <span className="text-primary">Detail</span>
            </span>
          </Link>
          <span className="hidden text-xs text-muted-foreground sm:block">📍 {BUSINESS.city}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-5">
          {navItems.map(({ to, label, icon: Icon, ...rest }) => {
            const highlight = "highlight" in rest && rest.highlight;
            return (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] text-muted-foreground transition-smooth"
                activeOptions={{ exact: to === "/" }}
                activeProps={{ className: "text-primary" }}
              >
                <span
                  className={
                    highlight
                      ? "-mt-6 inline-flex size-12 items-center justify-center rounded-full bg-[image:var(--gradient-red)] text-primary-foreground glow-red"
                      : "inline-flex size-6 items-center justify-center"
                  }
                >
                  <Icon className={highlight ? "size-6" : "size-5"} />
                </span>
                <span className={highlight ? "font-semibold uppercase" : ""}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
