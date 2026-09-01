"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { useSidebarStore } from "@/lib/store/sidebar";
import { allNavItems } from "@/config/navigation";
import { UserMenu, type SessionUser } from "@/components/layout/user-menu";
import { GlobalSearch } from "@/components/search/global-search";

function getBreadcrumb(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const item = allNavItems.find((n) =>
    pathname === n.href || pathname.startsWith(n.href + "/")
  );
  const title = item?.title ?? (segments[0] ? "Dashboard" : "Home");
  return { segments, title };
}

export function Topbar({ user }: { user: SessionUser }) {
  const { openMobile } = useSidebarStore();
  const pathname = usePathname();
  const { title } = getBreadcrumb(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <button
        onClick={openMobile}
        className="rounded-lg p-2 text-muted hover:bg-surface-raised hover:text-foreground lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted">
        <span className="text-foreground font-medium">CrimeIntel</span>
        <span className="text-border">/</span>
        <span>{title}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <GlobalSearch />

        <button className="relative rounded-lg p-2 text-muted hover:bg-surface-raised hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
        </button>

        <div className="ml-1 border-l border-border">
          <UserMenu user={user} variant="topbar" />
        </div>
      </div>
    </header>
  );
}
