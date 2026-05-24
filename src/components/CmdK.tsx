"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ROBOTS, JOBS } from "@/lib/mock-data";
import {
  RobotIcon,
  AgentIcon,
  OperatorIcon,
  ReceiptIcon,
  PinIcon,
  WalletIcon,
  SpecIcon,
} from "@/components/Icons";
import { Kbd } from "@/components/Primitives";

/* ROVA · Cmd+K — global search palette.
   Type to filter. Up/Down to navigate. Enter to go.
   ⌘K to open · Esc to close. Listens for `rova:cmdk:open` custom event. */

type CmdItem = {
  id: string;
  label: string;
  hint: string;
  group: "Surface" | "Robot" | "Job" | "Action";
  href: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

export default function CmdK() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Build flat catalog
  const items = useMemo<CmdItem[]>(() => {
    const surfaces: CmdItem[] = [
      { id: "s-home", label: "Home", hint: "Landing", group: "Surface", href: "/", Icon: SpecIcon },
      { id: "s-sim", label: "Simulator", hint: "Playable warehouse", group: "Surface", href: "/simulator", Icon: SpecIcon },
      { id: "s-dash", label: "Operator Dashboard", hint: "Fleet console", group: "Surface", href: "/dashboard", Icon: OperatorIcon },
      { id: "s-agent", label: "Agent Surface", hint: "Post jobs", group: "Surface", href: "/agent", Icon: AgentIcon },
      { id: "s-robot", label: "Robot Surface", hint: "First-person POV", group: "Surface", href: "/robot", Icon: RobotIcon },
      { id: "s-onboard", label: "Onboard", hint: "Get started", group: "Surface", href: "/onboard", Icon: WalletIcon },
      { id: "s-apply", label: "Apply for pilot", hint: "Lab application", group: "Surface", href: "/apply", Icon: SpecIcon },
    ];

    const robots: CmdItem[] = ROBOTS.map((r) => ({
      id: `r-${r.id}`,
      label: r.name,
      hint: `${r.model} · ${r.status} · ${r.location}`,
      group: "Robot",
      href: `/robot?id=${r.id}`,
      Icon: RobotIcon,
    }));

    const jobs: CmdItem[] = JOBS.slice(0, 12).map((j) => ({
      id: `j-${j.id}`,
      label: j.id,
      hint: `${j.taskType} · ${j.from} → ${j.to} · ${j.status}`,
      group: "Job",
      href: `/job/${encodeURIComponent(j.id)}`,
      Icon: ReceiptIcon,
    }));

    const actions: CmdItem[] = [
      { id: "a-post", label: "Post a new job", hint: "Go to Agent → composer", group: "Action", href: "/agent", Icon: AgentIcon },
      { id: "a-pause", label: "Pause fleet", hint: "Open dashboard → Emergency", group: "Action", href: "/dashboard?tab=emergency", Icon: OperatorIcon },
      { id: "a-basescan", label: "Open Basescan", hint: "Sepolia explorer", group: "Action", href: "https://sepolia.basescan.org/", Icon: SpecIcon },
    ];

    return [...surfaces, ...actions, ...robots, ...jobs];
  }, []);

  // Filtered + grouped
  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const needle = q.toLowerCase();
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(needle) ||
        i.hint.toLowerCase().includes(needle) ||
        i.group.toLowerCase().includes(needle)
    );
  }, [items, q]);

  const grouped = useMemo(() => {
    const out: Record<string, CmdItem[]> = {};
    filtered.forEach((i) => {
      (out[i.group] = out[i.group] || []).push(i);
    });
    return out;
  }, [filtered]);

  // Keyboard: ⌘K to open, Esc to close, ↑↓ to move, Enter to select
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      if (cmd && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      } else if (open) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setIdx((i) => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setIdx((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
          e.preventDefault();
          const sel = filtered[idx];
          if (sel) {
            setOpen(false);
            if (sel.href.startsWith("http")) {
              window.open(sel.href, "_blank");
            } else {
              router.push(sel.href);
            }
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, idx, filtered, router]);

  // External trigger (top bar Search button dispatches this)
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("rova:cmdk:open", onOpen as EventListener);
    return () =>
      window.removeEventListener("rova:cmdk:open", onOpen as EventListener);
  }, []);

  // Focus input + reset selection when opening
  useEffect(() => {
    if (open) {
      setIdx(0);
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-24"
      role="dialog"
      aria-modal="true"
      onClick={() => setOpen(false)}
    >
      {/* Scrim */}
      <div className="absolute inset-0 bg-bean/40 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-[640px] bg-paper border border-line shadow-[0_24px_48px_-12px_rgba(39,9,3,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center border-b border-line-soft">
          <span className="pl-5 pr-3 font-mono text-[11px] uppercase tracking-[0.16em] text-slate">
            ROVA
          </span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            placeholder="Search robots, jobs, agents, surfaces…"
            className="flex-1 py-4 pr-5 bg-transparent outline-none font-sans text-[15px] text-bean placeholder:text-slate"
          />
          <div className="pr-4">
            <Kbd>esc</Kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[460px] overflow-y-auto">
          {Object.keys(grouped).length === 0 ? (
            <div className="px-5 py-10 text-center font-mono text-[12px] uppercase tracking-[0.14em] text-slate">
              No match · try a robot name, job ID, or surface
            </div>
          ) : (
            (Object.keys(grouped) as Array<keyof typeof grouped>).map(
              (group) => (
                <div key={group as string}>
                  <div className="px-5 py-2 border-b border-line-soft bg-cream-soft font-mono text-[10px] uppercase tracking-[0.16em] text-slate">
                    {group as string}
                  </div>
                  {grouped[group].map((it) => {
                    const itemIdx = filtered.indexOf(it);
                    const active = itemIdx === idx;
                    return (
                      <button
                        key={it.id}
                        onMouseEnter={() => setIdx(itemIdx)}
                        onClick={() => {
                          setOpen(false);
                          if (it.href.startsWith("http")) {
                            window.open(it.href, "_blank");
                          } else {
                            router.push(it.href);
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                          active
                            ? "bg-cream text-bean"
                            : "hover:bg-cream-soft text-bean"
                        }`}
                      >
                        <it.Icon
                          size={16}
                          className={active ? "text-amber" : "text-slate"}
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block font-sans text-[13.5px] text-bean truncate">
                            {it.label}
                          </span>
                          <span className="block font-mono text-[11px] text-slate truncate">
                            {it.hint}
                          </span>
                        </span>
                        {active && (
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber">
                            ↵
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line-soft bg-cream-soft px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> navigate
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>↵</Kbd> open
            </span>
          </div>
          <span>{filtered.length} results</span>
        </div>
      </div>
    </div>
  );
}
