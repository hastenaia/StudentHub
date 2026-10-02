import { DashboardShell } from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_THEME, isTheme, type Theme } from "@/lib/theme";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let theme: Theme = DEFAULT_THEME;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("theme")
      .eq("id", user.id)
      .maybeSingle();
    if (isTheme(data?.theme)) theme = data.theme;
  }

  return <DashboardShell initialTheme={theme}>{children}</DashboardShell>;
}