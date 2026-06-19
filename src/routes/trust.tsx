import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck, Lock, Server, Eye, Cookie, Trash2, Mail,
  Bug, FileText, ArrowLeft, Dumbbell,
} from "lucide-react";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Trust & Privacy — Your Fitness Friend" },
      {
        name: "description",
        content:
          "Learn how Your Fitness Friend handles your data, secures your account, and protects your privacy.",
      },
      { property: "og:title", content: "Trust & Privacy — Your Fitness Friend" },
      {
        property: "og:description",
        content:
          "Security, privacy, and data practices for Your Fitness Friend.",
      },
      { property: "og:url", content: "https://your-fit-buddy-07.lovable.app/trust" },
    ],
    links: [{ rel: "canonical", href: "https://your-fit-buddy-07.lovable.app/trust" }],
  }),
  component: TrustPage,
});

function TrustPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
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
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-16">
        {/* Hero */}
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-neon/10 ring-1 ring-neon/20">
            <ShieldCheck className="h-6 w-6 text-neon" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">
            Trust &amp; Privacy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This page is maintained by Your Fitness Friend to answer common security and privacy questions about the app.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            The information below describes the current controls and practices of this application. It is provided as editable project content and is not an independent certification or legal guarantee. Platform capabilities are described factually; they are not endorsed or verified by Lovable.
          </p>
        </div>

        {/* Sections */}
        <div className="mt-12 space-y-10">
          {/* Access & Auth */}
          <section>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-neon/10 ring-1 ring-neon/20">
                <Lock className="h-4.5 w-4.5 text-neon" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">Access &amp; Authentication</h2>
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                Accounts are protected with email/password or Google OAuth sign-in managed by Supabase Auth.
              </li>
              <li>
                Workout data, personal records, and templates are scoped to your account via Row-Level Security (RLS) policies. Other users cannot access your data.
              </li>
              <li>
                Session tokens are handled securely by the authentication provider. We do not store plaintext passwords.
              </li>
            </ul>
          </section>

          {/* Platform & Hosting */}
          <section>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-neon/10 ring-1 ring-neon/20">
                <Server className="h-4.5 w-4.5 text-neon" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">Platform &amp; Hosting</h2>
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                The application is built and hosted on Lovable infrastructure with a Supabase backend for data persistence and authentication.
              </li>
              <li>
                Data is stored in a managed PostgreSQL database with encrypted connections and automated backups.
              </li>
              <li>
                The builder (Your Fitness Friend) is responsible for application-level security; the platform provides infrastructure-level protections such as TLS, DDoS mitigation, and patching.
              </li>
            </ul>
          </section>

          {/* Data Collection & Use */}
          <section>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-neon/10 ring-1 ring-neon/20">
                <Eye className="h-4.5 w-4.5 text-neon" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">Data Collection &amp; Use</h2>
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                We collect the minimum data needed to run the app: account info (email, optional name), workout logs, exercise preferences, and form-analysis scores.
              </li>
              <li>
                Camera access is used only for real-time AI form analysis during active sessions. Video is processed locally in the browser when possible and is not permanently stored unless explicitly saved by the user.
              </li>
              <li>
                We do not sell personal data or use it for advertising.
              </li>
            </ul>
          </section>

          {/* Subprocessors & Integrations */}
          <section>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-neon/10 ring-1 ring-neon/20">
                <Server className="h-4.5 w-4.5 text-neon" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">Subprocessors &amp; Integrations</h2>
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong>Supabase</strong> — authentication, database, and storage.
              </li>
              <li>
                <strong>Google</strong> — optional OAuth sign-in.
              </li>
              <li>
                <strong>Lovable AI Gateway</strong> — powers AI form-analysis and coaching features.
              </li>
            </ul>
          </section>

          {/* Cookies & Analytics */}
          <section>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-neon/10 ring-1 ring-neon/20">
                <Cookie className="h-4.5 w-4.5 text-neon" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">Cookies &amp; Analytics</h2>
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                Essential cookies and local storage are used to keep you signed in and remember UI preferences (e.g., favorite exercises, recent filters).
              </li>
              <li>
                We do not use third-party analytics or tracking cookies.
              </li>
            </ul>
          </section>

          {/* Retention & Deletion */}
          <section>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-neon/10 ring-1 ring-neon/20">
                <Trash2 className="h-4.5 w-4.5 text-neon" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">Retention &amp; Deletion</h2>
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                Your workout history and personal records are retained for as long as your account is active so you can track long-term progress.
              </li>
              <li>
                You can request deletion of your account and associated data by contacting us. Data tied to your account will be removed within a reasonable timeframe, subject to any legal retention obligations.
              </li>
            </ul>
          </section>

          {/* Privacy Requests */}
          <section>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-neon/10 ring-1 ring-neon/20">
                <FileText className="h-4.5 w-4.5 text-neon" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">Privacy Requests</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              If you want to access, correct, or delete your personal data, or if you have questions about how your information is handled, please reach out using the contact method below. We will respond within a reasonable time.
            </p>
          </section>

          {/* Incident / Security Contact */}
          <section>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-neon/10 ring-1 ring-neon/20">
                <Mail className="h-4.5 w-4.5 text-neon" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">Incident &amp; Security Contact</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              To report a security concern, data incident, or suspicious activity, please email the builder directly. Include details about what you observed so we can investigate quickly.
            </p>
          </section>

          {/* Vulnerability Reporting */}
          <section>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-neon/10 ring-1 ring-neon/20">
                <Bug className="h-4.5 w-4.5 text-neon" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">Vulnerability Reporting</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              If you discover a vulnerability in the app, we appreciate responsible disclosure. Please describe the issue, steps to reproduce, and potential impact. We will review reports promptly and take appropriate action.
            </p>
          </section>
        </div>

        {/* Bottom note */}
        <div className="mt-16 border-t border-border/60 pt-8 text-center text-xs text-muted-foreground">
          <p>
            This page was last updated in June 2026 and reflects the current state of the application. Practices may evolve over time.
          </p>
        </div>
      </main>

      {/* Footer */}
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
