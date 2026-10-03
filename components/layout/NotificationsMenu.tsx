"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { hasUnread, type NotificationItem } from "@/lib/notifications";
import { notificationsClientService } from "@/services/notificationsClient.service";

function KindDot({ kind }: { kind: NotificationItem["kind"] }) {
  const color = kind === "overdue" ? "bg-red-500" : kind === "deadline" ? "bg-brand-royal" : "bg-brand-sky";
  return <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden />;
}

export function NotificationsMenu() {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fetched, setFetched] = React.useState(false);

  const close = React.useCallback(() => setOpen(false), []);
  useEscapeKey(open, close);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await notificationsClientService.listNotifications();
    if (res.success) {
      setItems(res.data ?? []);
      setFetched(true);
    } else {
      setError(res.message ?? "Couldn't load notifications.");
    }
    setLoading(false);
  }, []);

  const handleToggle = () => {
    if (!open && !fetched && !loading) {
      void load();
    }
    setOpen((o) => !o);
  };

  const unread = hasUnread(items);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative rounded-full p-2 text-gray-500 hover:bg-brand-gray"
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-sky" aria-hidden />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={close} aria-hidden />
            <motion.div
              role="dialog"
              aria-label="Notifications"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-20 mt-2 max-h-[70vh] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
                <p className="text-sm font-semibold text-brand-dark">Notifications</p>
                {items && items.length > 0 && <p className="text-xs text-gray-500">{items.length} new</p>}
              </div>

              {loading && (
                <div className="space-y-2 px-4 py-3" aria-label="Loading notifications">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-10 animate-pulse rounded-md bg-brand-gray/60" />
                  ))}
                </div>
              )}

              {error && !loading && (
                <div className="px-4 py-4 text-center">
                  <p className="text-sm text-gray-600">{error}</p>
                  <button
                    type="button"
                    onClick={() => void load()}
                    className="mt-2 rounded-md px-3 py-1.5 text-sm font-medium text-brand-royal hover:bg-brand-gray"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!loading && !error && items?.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-gray-500">You&apos;re all caught up.</p>
              )}

              {!loading && !error && !!items?.length && (
                <ul className="divide-y divide-gray-100">
                  {(items ?? []).map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={close}
                        className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-brand-gray/50"
                      >
                        <KindDot kind={item.kind} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-brand-dark">{item.title}</span>
                          {item.subtitle && (
                            <span className="block truncate text-xs text-gray-500">{item.subtitle}</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
