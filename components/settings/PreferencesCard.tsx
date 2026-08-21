"use client";

import * as React from "react";
import { Moon, Sun, Monitor, CalendarDays, LayoutGrid, Bell, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { createClient } from "@/lib/supabase/client";

type Theme = "light" | "dark" | "system";
type CalendarView = "month" | "week" | "day" | "agenda";
type TaskView = "kanban" | "list";

interface PreferencesCardProps {
  initialTheme: Theme;
  initialCalendarView: CalendarView;
  initialTaskView: TaskView;
  initialNotifications: boolean;
}

export function PreferencesCard({
  initialTheme,
  initialCalendarView,
  initialTaskView,
  initialNotifications,
}: PreferencesCardProps) {
  const { toast } = useToast();
  const [theme, setTheme] = React.useState<Theme>(initialTheme);
  const [calendarView, setCalendarView] = React.useState<CalendarView>(initialCalendarView);
  const [taskView, setTaskView] = React.useState<TaskView>(initialTaskView);
  const [notifications, setNotifications] = React.useState(initialNotifications);
  const [saving, setSaving] = React.useState(false);

  const hasChanges =
    theme !== initialTheme ||
    calendarView !== initialCalendarView ||
    taskView !== initialTaskView ||
    notifications !== initialNotifications;

  // Apply theme immediately for preview
  React.useEffect(() => {
    const root = document.documentElement;
    const apply = (t: Theme) => {
      root.classList.remove("light", "dark");
      if (t === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.add(prefersDark ? "dark" : "light");
      } else {
        root.classList.add(t);
      }
    };
    apply(theme);
    localStorage.setItem("studenthub:theme", theme);
  }, [theme]);

  // Persist other prefs to localStorage for immediate UI use
  React.useEffect(() => {
    localStorage.setItem("studenthub:default_calendar_view", calendarView);
  }, [calendarView]);

  React.useEffect(() => {
    localStorage.setItem("studenthub:default_task_view", taskView);
  }, [taskView]);

  React.useEffect(() => {
    localStorage.setItem("studenthub:notifications_enabled", String(notifications));
  }, [notifications]);

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Not signed in", variant: "error" });
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        theme,
        default_calendar_view: calendarView,
        default_task_view: taskView,
        notifications_enabled: notifications,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      toast({ title: "Could not save preferences", description: error.message, variant: "error" });
    } else {
      toast({ title: "Preferences saved", variant: "success" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pref-theme" className="flex items-center gap-1.5">
            {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : theme === "light" ? <Sun className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />} Theme
          </Label>
          <Select
            id="pref-theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
          <p className="text-xs text-gray-400">Applies immediately and is saved to your profile.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pref-notifications" className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Notifications
          </Label>
          <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2">
            <input
              id="pref-notifications"
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-royal focus:ring-brand-royal"
            />
            <span className="text-sm text-gray-700">Enable notifications</span>
          </label>
          <p className="text-xs text-gray-400">For deadlines and focus reminders (local only for now).</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pref-calendar" className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Default calendar view
          </Label>
          <Select
            id="pref-calendar"
            value={calendarView}
            onChange={(e) => setCalendarView(e.target.value as CalendarView)}
          >
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
            <option value="agenda">Agenda</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pref-task" className="flex items-center gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" /> Default task view
          </Label>
          <Select
            id="pref-task"
            value={taskView}
            onChange={(e) => setTaskView(e.target.value as TaskView)}
          >
            <option value="kanban">Kanban</option>
            <option value="list">List</option>
          </Select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || saving} isLoading={saving} size="sm">
          <Save className="h-4 w-4" /> Save Preferences
        </Button>
      </div>
    </div>
  );
}
