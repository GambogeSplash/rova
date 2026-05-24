"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AgentIcon, RobotIcon, OperatorIcon } from "@/components/Icons";
import { Dot } from "@/components/Primitives";

/* ROVA · Multi-account switcher — top-right dropdown.
   Toggle between agent / robot / operator perspectives.
   Stores preference in localStorage. Default route per role. */

const ROLE_DEFAULTS = {
  agent: { route: "/agent", label: "@labor-agent", Icon: AgentIcon, tone: "amber" as const },
  robot: { route: "/robot", label: "G1-ALPHA", Icon: RobotIcon, tone: "live" as const },
  operator: { route: "/dashboard", label: "depot.lagos.eth", Icon: OperatorIcon, tone: "ok" as const },
};

type Role = keyof typeof ROLE_DEFAULTS;

export default function AccountSwitcher() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("agent");
  const router = useRouter();
  const pathname = usePathname();

  // Infer role from current pathname
  useEffect(() => {
    if (pathname?.startsWith("/dashboard")) setRole("operator");
    else if (pathname?.startsWith("/robot")) setRole("robot");
    else if (pathname?.startsWith("/agent")) setRole("agent");
  }, [pathname]);

  const Current = ROLE_DEFAULTS[role];

  const switchTo = (r: Role) => {
    setRole(r);
    setOpen(false);
    router.push(ROLE_DEFAULTS[r].route);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 border border-line-soft bg-paper px-3 py-1.5 hover:border-bean transition-colors btn-press"
      >
        <Current.Icon
          size={14}
          className={`${
            Current.tone === "amber"
              ? "text-amber"
              : Current.tone === "live"
              ? "text-teal"
              : "text-bean"
          }`}
        />
        <span className="font-mono text-[12px] text-bean">{Current.label}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-slate"
        >
          <path d="M3 6 L8 11 L13 6" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full mt-2 w-[240px] border border-line bg-paper z-50">
            <div className="px-4 py-3 border-b border-line-soft">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
                Switch perspective
              </div>
            </div>
            {(Object.keys(ROLE_DEFAULTS) as Role[]).map((r) => {
              const def = ROLE_DEFAULTS[r];
              const active = role === r;
              const Icon = def.Icon;
              return (
                <button
                  key={r}
                  onClick={() => switchTo(r)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-line-soft last:border-b-0 ${
                    active ? "bg-cream-soft" : "hover:bg-cream-soft"
                  }`}
                >
                  <Icon
                    size={16}
                    className={
                      def.tone === "amber"
                        ? "text-amber"
                        : def.tone === "live"
                        ? "text-teal"
                        : "text-bean"
                    }
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block font-sans text-[13px] text-bean">
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </span>
                    <span className="block font-mono text-[11px] text-slate truncate">
                      {def.label}
                    </span>
                  </span>
                  {active && <Dot tone="ok" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
