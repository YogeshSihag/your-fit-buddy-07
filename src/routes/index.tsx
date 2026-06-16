import { createFileRoute, Link } from "@tanstack/react-router";
import { Dumbbell, Camera, LineChart, Target } from "lucide-react";
import heroImg from "@/assets/gym-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Your Fitness Friend — AI Form Coach & Workout Tracker" },
      {
        name: "description",
        content:
          "AI-powered fitness coach. Analyze your form with your camera, get personalized workouts, and track progress.",
      },
      { property: "og:title", content: "Your Fitness Friend" },
      {
        property: "og:description",
        content: "AI form analysis, workouts by muscle group, and progress tracking.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="dumbbell-bg min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-neon" />
          <span className="font-display text-xl tracking-wider">
            YOUR FITNESS <span className="neon-text">FRIEND</span>
          </span>
        </div>
        <Link
          to="/auth"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          Sign in
        </Link>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 pt-12 pb-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <p className="mb-4 inline-block rounded-full border border-neon/40 bg-neon/5 px-3 py-1 text-xs uppercase tracking-widest text-neon">
              AI Form Coach
            </p>
            <h1 className="font-display text-5xl leading-none tracking-wide md:text-7xl">
              TRAIN SMART.
              <br />
              <span className="neon-text">LIFT BETTER.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">
              Point your camera at your set. Get an instant form score and personalized
              coaching — then track every rep, every week.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="neon-btn rounded-md px-6 py-3 font-display text-lg tracking-wider"
              >
                START FREE
              </Link>
              <Link
                to="/auth"
                className="rounded-md border border-border px-6 py-3 font-display tracking-wider hover:bg-secondary"
              >
                SIGN IN
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-neon/10 blur-3xl" />
            <img
              src={heroImg}
              alt="Dark gym with dumbbell rack and barbell, neon green accent lighting"
              width={1920}
              height={1080}
              className="relative rounded-2xl border border-border/60 shadow-2xl"
            />
          </div>
        </div>

        <div className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            { icon: Camera, title: "AI Form Analysis", desc: "Snap a frame mid-set. Get a 0–100 form score and tips." },
            { icon: Target, title: "Muscle-Group Workouts", desc: "Curated exercises with sets, reps, and cues." },
            { icon: LineChart, title: "Progress Tracking", desc: "Watch your level rise from Beginner to Advanced." },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-neon/40"
            >
              <f.icon className="mb-4 h-8 w-8 text-neon" />
              <h3 className="mb-2 text-xl">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
