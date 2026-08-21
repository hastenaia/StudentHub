"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, Clock, UserCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/utils/validation";

interface ProfileCardProps {
  initialName: string;
  email: string | null;
  avatarUrl: string | null;
  initialTimezone: string;
}

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function ProfileCard({ initialName, email, avatarUrl, initialTimezone }: ProfileCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = React.useState(initialName);
  const [timezone, setTimezone] = React.useState(initialTimezone);
  const [saving, setSaving] = React.useState(false);

  const hasChanges = name.trim() !== initialName || timezone !== initialTimezone;

  const handleSave = async () => {
    if (!hasChanges) return;
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "error" });
      return;
    }
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

    // Update auth metadata for name and avatar, and profile row for name/timezone
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: name.trim() },
    });

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: name.trim(), timezone })
      .eq("id", user.id);

    setSaving(false);
    if (authError || profileError) {
      toast({ title: "Could not save profile", description: authError?.message ?? profileError?.message, variant: "error" });
    } else {
      toast({ title: "Profile updated", variant: "success" });
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-royal text-xl font-semibold text-white">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            getInitials(name || initialName)
          )}
        </div>
        <div>
          <p className="font-medium text-brand-dark">{initialName}</p>
          <p className="flex items-center gap-1.5 text-sm text-gray-500">
            <Mail className="h-3.5 w-3.5" /> {email}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-name" className="flex items-center gap-1.5">
            <UserCircle className="h-3.5 w-3.5" /> Name
          </Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-timezone" className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Timezone
          </Label>
          <Select
            id="profile-timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
          <p className="text-xs text-gray-400">Used for schedule and deadlines.</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Mail className="h-3.5 w-3.5" /> {email} <span className="text-xs text-gray-400">(email cannot be changed here)</span>
        </div>
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={!hasChanges || saving} isLoading={saving} size="sm">
            <Save className="h-4 w-4" /> Save Profile
          </Button>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-gray-400">
        <UserCircle className="h-3 w-3" /> Avatar is derived from your Google account or initials. To change it, update your Google profile.
      </p>
    </div>
  );
}
