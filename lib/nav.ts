export interface NavRoute {
  label: string;
  href: string;
}

export const NAV_ROUTES: NavRoute[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Courses", href: "/dashboard/courses" },
  { label: "Schedule", href: "/dashboard/schedule" },
  { label: "Tasks", href: "/dashboard/tasks" },
  { label: "Study Hub", href: "/dashboard/study" },
  { label: "Focus", href: "/dashboard/focus" },
  { label: "Analytics", href: "/dashboard/analytics" },
  { label: "Wellness", href: "/dashboard/wellness" },
  { label: "Achievements", href: "/dashboard/achievements" },
  { label: "Settings", href: "/dashboard/settings" },
];

export function isNavActive(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getNavTitle(pathname: string | null | undefined): string {
  if (!pathname) return "Dashboard";
  const match = [...NAV_ROUTES].sort((a, b) => b.href.length - a.href.length).find((route) => isNavActive(pathname, route.href));
  return match?.label ?? "Dashboard";
}
