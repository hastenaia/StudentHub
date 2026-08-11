"use client";

import * as React from "react";
import { Bell, LogOut, Menu, Settings, User as UserIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/utils/validation";
import { cn } from "@/utils/cn";

export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-gray-500 hover:bg-brand-gray lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-brand-dark sm:text-lg">Dashboard</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          className="relative rounded-full p-2 text-gray-500 hover:bg-brand-gray"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-sky" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-royal text-sm font-semibold text-white">
              {getInitials(user?.fullName ?? user?.email)}
            </div>
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-gray-200 bg-white p-1 shadow-lg"
                >
                  <div className="border-b border-gray-100 px-3 py-2">
                    <p className="truncate text-sm font-medium text-brand-dark">
                      {user?.fullName || "Student"}
                    </p>
                    <p className="truncate text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <a
                    href="/dashboard/settings"
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-brand-gray"
                    )}
                  >
                    <UserIcon className="h-4 w-4" /> Profile
                  </a>
                  <a
                    href="/change-password"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-brand-gray"
                  >
                    <Settings className="h-4 w-4" /> Change password
                  </a>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
