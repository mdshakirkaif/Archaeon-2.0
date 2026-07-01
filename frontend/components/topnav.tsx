"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Consent Flow", href: "/consent" },
  { label: "Confirmation", href: "/confirm" },
  { label: "Interview", href: "/interview" },
  { label: "Engineer Chat", href: "/chat" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Connections", href: "/connections" },
  { label: "Profile", href: "/profile" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-7xl items-center px-6">
        <Link href="/consent" className="mr-10 flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="size-4 text-primary"
            >
              <path
                d="M8 1L14.5 5V11L8 15L1.5 11V5L8 1Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="8" cy="8" r="2" fill="currentColor" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Archaeon
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/consent" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-3 py-1.5 text-sm transition-colors rounded-md",
                  isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-3 -bottom-[13px] h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1">
            <div className="size-1.5 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground font-mono">
              v0.1.0
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
