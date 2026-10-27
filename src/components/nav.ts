import { Activity, Boxes, LayoutDashboard, ListChecks, MessageSquare, Settings, type LucideIcon } from "lucide-react";

export interface NavEntry { href: string; label: string; icon: LucideIcon }
export const NAV: NavEntry[] = [
  { href: "/", label: "Chat", icon: MessageSquare },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/components", label: "Components", icon: Boxes },
  { href: "/settings", label: "Settings", icon: Settings },
];
