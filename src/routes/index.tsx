import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Dumbbell, Camera, LineChart, Target, Activity, Sparkles,
  ArrowRight, ShieldCheck, Brain, Repeat, Menu, X,
} from "lucide-react";
import { useState } from "react";
import heroImg from "@/assets/ai-tracking-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Your Fitness Friend — AI Form Coach & Workout Tracker" },
      {
        name: "description",
        content:
          "AI fitness coach that analyzes your form through the camera, recommends exercises by muscle group, and tracks your progress over time.",
      },
      { property: "og:title", content: "Your Fitness Friend — AI Form Coach & Workout Tracker" },
      {
        property: "og:description",
        content: "Camera-based form analysis, 150+ exercises, and progress analytics in one premium app.",
      },
      { property: "og:url", content: "https://your-fit-buddy-07.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://your-fit-buddy-07.lovable.app/" }],
  }),
  component: Landing,
});

const NAV_LINKS = [
  { to: "/#features", label: "Features", hash: "features" },
  { to: "/exercises", label: "Exercises" },
  { to: "/progress", label: "Progress" },
];

function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-neon/10 ring-1 ring-neon/30">
              <Dumbbell className="h-4 w-4 text-neon" />
            </div>
            <span className="text-base font-semibold tracking-tight">
              Your Fitness <span className="text-neon">Friend</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.to}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/auth"
              className="ml-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              className="neon-btn ml-1 rounded-md px-4 py-2 text-sm"
            >
              Get Started
            </Link>
          </nav>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md p-2 text-foreground md:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-border/60 bg-background md:hidden">
            <div className="mx-auto max-w-7xl space-y-1 px-5 py-3">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.to}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
              <Link
                to="/auth"
                onClick={() => setMenuOpen(false)}
                className="block rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                to="/auth"
                onClick={() => setMenuOpen(false)}
                className="neon-btn mt-2 block rounded-md px-3 py-2.5 text-center text-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="dumbbell-bg relative overflow-hidden">
        <div className="grid-pattern absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 md:pt-20 lg:grid-cols-2">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-neon/30 bg-neon/5 px-3 py-1 text-xs font-medium text-neon">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Form Analysis
            </span>
            <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Train smarter with an{" "}
              <span className="text-neon">AI coach</span> that watches every rep.
            </h1>
            <p className="mt-5 max-w-xl text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
              Turn on your camera, pick an exercise, and get instant form scores, live corrective cues, and a clear roadmap to better lifts — all in a single, premium app.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/auth" className="neon-btn inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/exercises"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                Browse exercises
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-neon" /> Private by default</span>
              <span className="inline-flex items-center gap-1.5"><Brain className="h-3.5 w-3.5 text-neon" /> Real-time AI</span>
              <span className="inline-flex items-center gap-1.5"><Repeat className="h-3.5 w-3.5 text-neon" /> Track every set</span>
            </div>
          </div>

          <div className="relative animate-fade-up">
            <div className="absolute -inset-6 rounded-3xl bg-neon/5 blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              <img
                src={heroImg}
                alt="AI pose detection overlay highlighting joints and form score on an athlete performing a squat"
                width={1280}
                height={1280}
                className="aspect-square w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-xl border border-border/80 bg-background/70 p-3 backdrop-blur-md">
                <div className="grid h-9 w-9 place-items-center rounded-md bg-neon/15">
                  <Camera className="h-4 w-4 text-neon" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Live Form Analysis</p>
                  <p className="text-sm font-medium">Knee tracking · Depth · Back position</p>
                </div>
                <span className="rounded-md bg-neon/15 px-2 py-1 text-xs font-semibold text-neon">92</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="relative border-t border-border/60 bg-background/60 backdrop-blur">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-6 px-5 py-8 md:grid-cols-5">
            {[
              { value: "150+", label: "Exercises" },
              { value: "AI", label: "Form Analysis" },
              { value: "12", label: "Muscle Groups" },
              { value: "100%", label: "Progress Tracking" },
              { value: "Live", label: "Workout Analytics" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{s.value}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-neon">Features</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Everything you need to train like a pro
          </h2>
          <p className="mt-4 text-muted-foreground">
            A complete training toolkit — form analysis, structured workouts, deep analytics — designed to feel effortless on phone or desktop.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Camera,
              title: "AI Form Analysis",
              desc: "Real-time corrective cues on knee tracking, depth, posture, and more — graded 0–100 every few seconds.",
            },
            {
              icon: Target,
              title: "Curated Exercise Library",
              desc: "150+ exercises across 12 muscle groups with detailed instructions, mistakes to avoid, and form tips.",
            },
            {
              icon: Activity,
              title: "Workout Logging",
              desc: "Log sets, reps, and weight in seconds. Auto-estimated calories from your bodyweight.",
            },
            {
              icon: LineChart,
              title: "Progress Analytics",
              desc: "Streaks, weekly consistency, training volume, and a muscle heatmap to balance your split.",
            },
            {
              icon: Brain,
              title: "Smart Recommendations",
              desc: "Recovery score, undertrained muscle alerts, and exercises matched to your goals.",
            },
            {
              icon: ShieldCheck,
              title: "Private & Secure",
              desc: "Your data stays yours. Sign in with email or Google — no ads, no tracking.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="card-hover group rounded-2xl border border-border bg-card p-6"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-neon/10 ring-1 ring-neon/20 transition-colors group-hover:bg-neon/15">
                <f.icon className="h-5 w-5 text-neon" />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 text-center md:p-16">
          <div className="absolute inset-0 bg-gradient-to-br from-neon/10 via-transparent to-transparent" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Ready to lift better?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Create a free account and start your first session in under 60 seconds.
            </p>
            <Link
              to="/auth"
              className="neon-btn mt-7 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm"
            >
              Get started — it's free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-neon" />
            <span>Your Fitness Friend</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/trust" className="hover:text-foreground transition-colors">
              Trust &amp; Privacy
            </Link>
            <span>© {new Date().getFullYear()} Your Fitness Friend. Train smart.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
