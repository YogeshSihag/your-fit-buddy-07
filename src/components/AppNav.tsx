import { Link, useRouter } from "@tanstack/react-router";
import {
  Dumbbell, LayoutDashboard, Activity, Camera, LineChart, BarChart3, BookOpen, Trophy, Apple, LogOut, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/workouts", label: "Workouts", icon: Activity },
  { to: "/nutrition", label: "Nutrition", icon: Apple },
  { to: "/exercises", label: "Exercises", icon: BookOpen },
  { to: "/records", label: "Records", icon: Trophy },
  { to: "/analyze", label: "Coach", icon: Camera },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/progress", label: "Progress", icon: LineChart },
];

// Bottom nav: 5 most-used
const mobileLinks = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/workouts", label: "Workouts", icon: Activity },
  { to: "/analyze", label: "Coach", icon: Camera },
  { to: "/nutrition", label: "Food", icon: Apple },
  { to: "/records", label: "PRs", icon: Trophy },
];

export function AppNav() {
  const router = useRouter();
  const path = router.state.location.pathname;
  const [menuOpen, setMenuOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-neon/10 ring-1 ring-neon/30">
              <Dumbbell className="h-4 w-4 text-neon" />
            </div>
            <span className="text-base font-semibold tracking-tight">
              Your Fitness <span className="text-neon">Friend</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((l) => {
              const active = path.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-secondary text-neon" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1">
            <button
              onClick={signOut}
              className="hidden rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:inline-flex"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-md p-2 text-foreground lg:hidden"
              aria-label="Menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-border/60 bg-background lg:hidden">
            <div className="mx-auto max-w-7xl space-y-1 px-5 py-3">
              {links.map((l) => {
                const active = path.startsWith(l.to);
                const Icon = l.icon;
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                      active ? "bg-secondary text-neon" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {l.label}
                  </Link>
                );
              })}
              <button
                onClick={() => { setMenuOpen(false); signOut(); }}
                className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border/60 bg-background/95 backdrop-blur md:hidden">
        {mobileLinks.map((l) => {
          const active = path.startsWith(l.to);
          const Icon = l.icon;
          return (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
                active ? "text-neon" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {l.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
