"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldHalf, X } from "lucide-react";
import { navGroups } from "@/config/navigation";
import { useSidebarStore } from "@/lib/store/sidebar";
import { cn } from "@/lib/utils";
import { UserMenu, type SessionUser } from "@/components/layout/user-menu";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-6 px-3 py-4 overflow-y-auto scrollbar-thin">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 ring-1 ring-accent/30">
          <ShieldHalf className="h-5 w-5 text-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-foreground">
            CrimeIntel
          </p>
          <p className="text-[10px] text-muted">Indian CID Intelligence</p>
        </div>
      </div>

      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted/70">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors",
                      active
                        ? "bg-accent/12 text-accent"
                        : "text-muted hover:bg-surface-raised hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                    {active ? (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="px-2 pt-2">
        <p className="text-[10px] leading-relaxed text-muted/70">
          Classified prototype. All data fictional. Outcomes are investigative
          leads, not determinations of guilt.
        </p>
      </div>
    </nav>
  );
}

function SidebarInner({
  user,
  onNavigate,
}: {
  user: SessionUser;
  onNavigate?: () => void;
}) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-surface">
      <NavLinks onNavigate={onNavigate} />
      <div className="border-t border-border p-3">
        <UserMenu user={user} variant="sidebar" />
      </div>
    </aside>
  );
}

export function Sidebar({ user }: { user: SessionUser }) {
  const { mobileOpen, closeMobile } = useSidebarStore();

  return (
    <>
      {/* Desktop */}
      <div className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-width)] lg:block">
        <SidebarInner user={user} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeMobile}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-surface shadow-2xl">
            <button
              onClick={closeMobile}
              className="absolute right-3 top-4 text-muted hover:text-foreground"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarInner user={user} onNavigate={closeMobile} />
          </div>
        </div>
      ) : null}
    </>
  );
}
