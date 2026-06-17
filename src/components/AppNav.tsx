import { Link, useRouter } from "@tanstack/react-router";
import { Dumbbell, LayoutDashboard, Activity, Camera, LineChart, BarChart3, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/workouts", label: "Workouts", icon: Activity },
  { to: "/analyze", label: "Coach", icon: Camera },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/progress", label: "Progress", icon: LineChart },
];

export function AppNav() {
  const router = useRouter();
  const path = router.state.location.pathname;

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-neon" />
          <span className="font-display text-xl tracking-wider">
            YOUR FITNESS <span className="neon-text">FRIEND</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
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
        <button
          onClick={signOut}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
      {/* mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border/60 bg-background/95 backdrop-blur md:hidden">
        {links.map((l) => {
          const active = path.startsWith(l.to);
          const Icon = l.icon;
          return (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[11px]",
                active ? "text-neon" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
