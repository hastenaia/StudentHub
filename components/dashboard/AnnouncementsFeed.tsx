import { Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardAnnouncement } from "@/types/academics";
import { formatRelativeDateTime } from "@/utils/date";

interface AnnouncementsFeedProps {
  announcements: DashboardAnnouncement[];
}

export function AnnouncementsFeed({ announcements }: AnnouncementsFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-brand-royal" /> Announcements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <p className="text-sm text-gray-500">No announcements yet.</p>
        ) : (
          <ul className="space-y-4">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="border-l-2 border-brand-sky pl-3">
                <p className="text-sm leading-relaxed text-brand-dark">{announcement.text}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {announcement.courseName}
                  {announcement.creatorName ? ` · ${announcement.creatorName}` : ""}
                  <span className="ml-1 text-gray-400">
                    {formatRelativeDateTime(announcement.publishTime)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}