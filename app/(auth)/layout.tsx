import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-royal p-12 text-white lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-royal via-brand-royal to-brand-royal-dark" />
        <div
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-sky/20 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-32 left-0 h-96 w-96 rounded-full bg-brand-sky/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold">StudentHub</span>
        </div>

        <div className="relative max-w-md space-y-4">
          <h2 className="text-3xl font-semibold leading-tight">
            Everything for your academic life, in one place.
          </h2>
          <p className="text-brand-sky/90">
            Courses, schedules, and campus life — organized, accessible, and always in sync.
          </p>
        </div>

        <p className="relative text-sm text-white/60">
          &copy; {new Date().getFullYear()} StudentHub. All rights reserved.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col items-center justify-center bg-white px-6 py-12 lg:w-1/2">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-royal text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold text-brand-dark">StudentHub</span>
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
