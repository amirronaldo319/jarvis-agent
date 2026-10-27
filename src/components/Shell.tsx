"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Check, Command, Menu, PanelLeftClose, PanelLeftOpen, PanelRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { useApp } from "./AppProvider";
import { NAV } from "./nav";
import { Palette } from "./Palette";
import { Panel } from "./ui";
import { RunList } from "./RunList";
import { useLocalStore } from "@/lib/store";
import { ThemeSwitch } from "./ThemeSwitch";

const ICON = { size: 18, strokeWidth: 1.5, strokeLinecap: "square" as const, "aria-hidden": true };

function Mark() {
  return (
    <svg className="brand__mark" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="14" cy="14" r="12" /><circle cx="14" cy="14" r="7" /><circle cx="14" cy="14" r="2" fill="currentColor" />
    </svg>
  );
}

function ConversationItem({ id, title, current, onOpen }: { id: string; title: string; current: boolean; onOpen: () => void }) {
  const { renameConversation, deleteConversation } = useApp();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(title);
  const [confirm, setConfirm] = useState(false);
  if (editing) {
    const done = () => { renameConversation(id, val); setEditing(false); };
    return (
      <div className="conv">
        <input className="input conv__rename" autoFocus aria-label="Conversation title" value={val} maxLength={80} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") done(); if (e.key === "Escape") setEditing(false); }} />
        <button className="icon-btn" style={{ opacity: 1 }} aria-label="Save title" onClick={done}><Check size={16} strokeWidth={1.5} /></button>
      </div>
    );
  }
  return (
    <div className="conv">
      <button className="conv__open" aria-current={current} onClick={onOpen} title={title}>{title}</button>
      {confirm ? (
        <>
          <button className="icon-btn" style={{ opacity: 1, color: "var(--critical)" }} aria-label={`Confirm delete ${title}`} onClick={() => deleteConversation(id)}><Trash2 size={16} strokeWidth={1.5} /></button>
          <button className="icon-btn" style={{ opacity: 1 }} aria-label="Cancel delete" onClick={() => setConfirm(false)}><X size={16} strokeWidth={1.5} /></button>
        </>
      ) : (
        <>
          <button className="icon-btn" aria-label={`Rename ${title}`} onClick={() => { setVal(title); setEditing(true); }}><Pencil size={14} strokeWidth={1.5} /></button>
          <button className="icon-btn" aria-label={`Delete ${title}`} onClick={() => setConfirm(true)}><Trash2 size={14} strokeWidth={1.5} /></button>
        </>
      )}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { conversations, active, setActiveId, tasks, live, approvals } = useApp();
  const pendingCount = approvals.filter((a) => a.status === "pending").length;
  const [prefs, setPrefs] = useLocalStore<{ collapsed: boolean; rail: boolean }>("jv.ui", UI_DEFAULT);
  const [drawerAt, setDrawerAt] = useState<string | null>(null);
  const drawer = drawerAt === pathname;
  const setDrawer = (open: boolean) => setDrawerAt(open ? pathname : null);
  const [palette, setPalette] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
      if (e.key === "Escape") setDrawerAt(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openTasks = tasks.filter((t) => !t.done).length;
  const filtered = conversations.filter((c) => c.title.toLowerCase().includes(q.trim().toLowerCase()));
  const current = NAV.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)));
  const newChat = () => { setActiveId(null); setDrawer(false); router.push("/"); };

  return (
    <div className="shell" data-collapsed={prefs.collapsed} data-drawer={drawer}>
      <aside className="sidebar" aria-label="Primary">
        <div className="brand">
          <Mark /><span className="brand__name hide-collapsed">JARVIS</span>
        </div>
        <div className="sidebar__body">
          <button className="btn btn--primary" onClick={newChat} aria-label="New chat"><Plus {...ICON} /><span className="hide-collapsed">New chat</span></button>
          <nav className="nav" aria-label="Pages">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="nav__item" aria-current={current?.href === href ? "page" : undefined} title={label}>
                <Icon {...ICON} /><span className="nav__text hide-collapsed">{label}</span>
                {href === "/activity" && pendingCount > 0 && <span className="nav__count hide-collapsed" style={{ color: "var(--warn)" }}>{pendingCount}</span>}
                {href === "/tasks" && openTasks > 0 && <span className="nav__count hide-collapsed">{openTasks}</span>}
              </Link>
            ))}
          </nav>
          <div className="convs hide-collapsed">
            <span className="label" style={{ padding: "0 12px 8px" }}>Conversations</span>
            <input className="input" style={{ marginBottom: 8 }} placeholder="Search chats" aria-label="Search conversations" value={q} onChange={(e) => setQ(e.target.value)} />
            {conversations.length === 0 && <span className="muted mono" style={{ fontSize: 12, padding: "4px 12px" }}>No conversations yet</span>}
            {conversations.length > 0 && filtered.length === 0 && <span className="muted mono" style={{ fontSize: 12, padding: "4px 12px" }}>No matches</span>}
            {filtered.map((c) => (
              <ConversationItem key={c.id} id={c.id} title={c.title} current={active?.id === c.id && pathname === "/"} onOpen={() => { setActiveId(c.id); router.push("/"); setDrawer(false); }} />
            ))}
          </div>
        </div>
      </aside>
      <div className="scrim" onClick={() => setDrawer(false)} aria-hidden />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn only-mobile" aria-label="Open navigation" aria-expanded={drawer} onClick={() => setDrawer(true)}><Menu {...ICON} /></button>
          <button className="icon-btn only-desktop" aria-label={prefs.collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setPrefs({ ...prefs, collapsed: !prefs.collapsed })}>
            {prefs.collapsed ? <PanelLeftOpen {...ICON} /> : <PanelLeftClose {...ICON} />}
          </button>
          <h1 className="topbar__title">{current?.label ?? "Jarvis"}</h1>
          <span className="topbar__spacer" />
          <ThemeSwitch />
          <button className="btn btn--sm only-desktop" onClick={() => setPalette(true)} aria-label="Open command palette"><Command size={14} strokeWidth={1.5} /> K</button>
          <button className="icon-btn only-mobile" aria-label="Open command palette" onClick={() => setPalette(true)}><Command {...ICON} /></button>
          <button className="icon-btn only-desktop" aria-label="Toggle activity panel" aria-pressed={prefs.rail} onClick={() => setPrefs({ ...prefs, rail: !prefs.rail })}><PanelRight {...ICON} /></button>
        </header>
        {children}
      </div>

      <aside className="rail" data-open={prefs.rail} aria-label="Agent activity" aria-hidden={!prefs.rail} inert={!prefs.rail}>
        <div className="rail__inner">
          <Panel title="Agent" code={live ? "RUNNING" : "IDLE"}>
            <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: "20px" }}>
              {live ? "Generating a response…" : `No active run. Pending approvals: ${pendingCount}.`}
            </p>
          </Panel>
          <Panel title="Recent runs" code="LOCAL LOG"><RunList limit={8} /></Panel>
        </div>
      </aside>

      {palette && <Palette onClose={() => setPalette(false)} />}
    </div>
  );
}

const UI_DEFAULT = { collapsed: false, rail: false };
