import Link from "next/link";

const STATS = [
  {
    label: "Educators reporting higher engagement",
    value: "94%",
    note: "Based on in-app educator feedback.",
  },
  {
    label: "Time saved weekly",
    value: "7.8 hrs",
    note: "Average reported weekly savings.",
  },
  {
    label: "Learners reporting positive impact",
    value: "80%",
    note: "Student-reported improvement.",
  },
  {
    label: "Districts onboarded",
    value: "1,200+",
    note: "Across North America and APAC.",
  },
];

const FEATURE_CARDS = [
  {
    title: "Live annotation",
    description: "Highlight, draw, and comment together in real time with a single shared canvas.",
    tone: "from-cyan-500/20 via-sky-400/10 to-transparent",
  },
  {
    title: "Voice and video",
    description: "Capture quick explanations or walkthroughs for feedback students can replay.",
    tone: "from-amber-400/25 via-orange-300/10 to-transparent",
  },
  {
    title: "AI-ready insights",
    description: "Summarize responses and flag misconceptions before they slow the class down.",
    tone: "from-emerald-400/25 via-lime-300/10 to-transparent",
  },
  {
    title: "Differentiated paths",
    description: "Assign multiple versions and supports without duplicating the workflow.",
    tone: "from-pink-400/25 via-rose-300/10 to-transparent",
  },
  {
    title: "Accessibility built-in",
    description: "Read-aloud, captions, translation, and simplified views for every learner.",
    tone: "from-indigo-400/25 via-sky-300/10 to-transparent",
  },
  {
    title: "LMS-friendly",
    description: "Launch from Classroom, Canvas, Schoology, or Teams with two clicks.",
    tone: "from-teal-400/25 via-cyan-300/10 to-transparent",
  },
];

const WORKFLOW = [
  {
    step: "01",
    title: "Import any file",
    description: "PDFs, slides, docs, or images. Drag, drop, and start immediately.",
  },
  {
    step: "02",
    title: "Layer instructions",
    description: "Add prompts, voice notes, and differentiated supports in one view.",
  },
  {
    step: "03",
    title: "Collect responses",
    description: "Students respond in real time while you monitor progress.",
  },
  {
    step: "04",
    title: "Measure impact",
    description: "Track completion, engagement, and mastery with instant analytics.",
  },
];

const INTEGRATIONS = [
  "Google Classroom",
  "Canvas",
  "Schoology",
  "Microsoft Teams",
  "Clever",
  "Google Drive",
  "OneDrive",
  "PowerSchool",
];

const TESTIMONIALS = [
  {
    quote: "My students finally engage with the text. The voice tools have been a game changer.",
    name: "Alyssa M.",
    role: "ELA Teacher, Denver",
  },
  {
    quote: "We cut feedback time in half and can see who needs support before class ends.",
    name: "Devon R.",
    role: "Instructional Coach, Austin",
  },
  {
    quote: "The accessibility features help every learner participate without extra prep.",
    name: "Priya S.",
    role: "Special Education Lead, Toronto",
  },
];

const FAQ = [
  {
    q: "Does it work with our LMS?",
    a: "Yes. Launch directly from Classroom, Canvas, Schoology, Teams, and more.",
  },
  {
    q: "Can students use it on tablets?",
    a: "Absolutely. The experience is optimized for desktop and mobile devices.",
  },
  {
    q: "How do you support accessibility?",
    a: "Read-aloud, captions, translation, and simplified views are built in.",
  },
];

const TRUSTED_BY = [
  "Northstar USD",
  "Maple Ridge ISD",
  "Brighton Academy",
  "Suncrest Charter",
  "Westbrook Prep",
  "Cedar Valley Schools",
];

export default function Home() {
  return (
    <main className="min-h-screen text-slate-900">
      <section className="relative overflow-hidden bg-[#f7f7ff]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-[120px]" />
          <div className="absolute right-0 top-32 h-96 w-96 rounded-full bg-amber-300/30 blur-[140px]" />
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-rose-300/25 blur-[160px]" />
        </div>

        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 pb-16 pt-8 md:px-10">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/70 bg-white/70 p-4 shadow-lg backdrop-blur md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold text-white">
                K
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">BACANCY</p>
                <p className="text-lg font-semibold text-slate-900">Learning Studio</p>
              </div>
            </div>

            <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
              <a href="#product" className="hover:text-slate-900">
                Product
              </a>
              <a href="#workflow" className="hover:text-slate-900">
                Workflow
              </a>
              <a href="#integrations" className="hover:text-slate-900">
                Integrations
              </a>
              <a href="#impact" className="hover:text-slate-900">
                Impact
              </a>
              <a href="#faq" className="hover:text-slate-900">
                FAQ
              </a>
            </nav>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
              >
                User login
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Create account
              </Link>
              <Link
                href="/admin-login"
                className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-800 hover:border-cyan-300"
              >
                Admin login
              </Link>
            </div>
          </header>

          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl backdrop-blur">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-700">Instructional momentum</p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900 md:text-6xl">
                Turn any document into a collaborative learning moment.
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-slate-600">
                BACANCY Learning Studio layers feedback, multimedia, and accessibility tools on top of your existing content. Build
                momentum, see engagement in real time, and reach every learner.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/signup" className="rounded-xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-600">
                  Start free
                </Link>
                <Link
                  href="/classrooms"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
                >
                  Explore demo classroom
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-cyan-700">Annotate</span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">Listen</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">Collaborate</span>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">Support</span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-8 text-white shadow-2xl">
              <div className="absolute -top-16 right-0 h-40 w-40 rounded-full bg-cyan-500/30 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-amber-500/30 blur-3xl" />
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Live classroom</p>
              <h2 className="mt-4 text-2xl font-semibold">Annotation studio</h2>
              <p className="mt-3 text-sm text-slate-200">
                Layer feedback, voice notes, and highlights on top of any PDF while students respond in real time.
              </p>
              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Teacher view</p>
                  <p className="mt-2 text-sm text-white">"Annotate the key idea and leave a question."</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Student response</p>
                  <p className="mt-2 text-sm text-white">"What evidence supports the author's claim?"</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Progress</p>
                  <p className="mt-2 text-sm text-white">18 of 24 students completed the prompt.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-16 md:px-10">
          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Trusted by schools</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">Built for districts, loved by teachers</h2>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              {TRUSTED_BY.map((name) => (
                <span key={name} className="rounded-full border border-slate-200 bg-white px-4 py-2">
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div id="impact" className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <article key={stat.label} className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                <p className="mt-3 text-4xl font-semibold text-slate-900">{stat.value}</p>
                <p className="mt-2 text-sm text-slate-500">{stat.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="bg-gradient-to-br from-cyan-50 via-white to-amber-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-16 md:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Product pillars</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">Everything you need to power learner-centered instruction</h2>
              <p className="mt-2 max-w-2xl text-slate-600">
                Combine annotation, multimedia feedback, and collaboration so every learner can access content and show understanding.
              </p>
            </div>
            <Link
              href="/signup"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              See educator toolkit
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURE_CARDS.map((feature) => (
              <article
                key={feature.title}
                className={`rounded-3xl border border-slate-200 bg-gradient-to-br ${feature.tone} p-6 shadow-sm`}
              >
                <p className="text-sm font-semibold text-slate-900">{feature.title}</p>
                <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-emerald-50/70">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-16 md:px-10">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Workflow</p>
              <h2 className="mt-4 text-3xl font-semibold text-slate-900">Plan, teach, and assess in one continuous flow</h2>
              <p className="mt-3 text-slate-600">
                Keep instruction moving without jumping across tools. Set up in minutes and reuse your best lessons.
              </p>
              <div className="mt-6 grid gap-4">
                {WORKFLOW.map((item) => (
                  <div key={item.step} className="flex gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-emerald-600">{item.step}</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-500/10 via-white to-amber-400/10 p-8 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-700">Learning modes</p>
              <h3 className="mt-4 text-2xl font-semibold text-slate-900">Designed for every classroom role</h3>
              <p className="mt-3 text-sm text-slate-600">
                Give teachers, students, and administrators tools tailored to their work, all in one place.
              </p>
              <div className="mt-6 space-y-3 text-sm text-slate-600">
                <p className="rounded-2xl border border-amber-200/60 bg-white px-4 py-3">
                  Teacher dashboards with live response monitoring.
                </p>
                <p className="rounded-2xl border border-emerald-200/60 bg-white px-4 py-3">
                  Student workspaces with low-friction collaboration.
                </p>
                <p className="rounded-2xl border border-cyan-200/60 bg-white px-4 py-3">
                  Admin insights for usage, privacy, and rollout planning.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="integrations" className="bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-16 md:px-10">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Integrations</p>
                <h2 className="mt-3 text-3xl font-semibold text-slate-900">Works with the tools you already use</h2>
                <p className="mt-2 text-slate-600">Launch from your LMS, sync assignments, and keep your workflow streamlined.</p>
              </div>
              <Link
                href="/admin/integrations"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Manage integrations
              </Link>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {INTEGRATIONS.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-16 md:px-10">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-3xl border border-slate-200 bg-slate-900 p-8 text-white shadow-2xl">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Impact</p>
              <h2 className="mt-4 text-3xl font-semibold">Proven outcomes at scale</h2>
              <p className="mt-3 text-sm text-slate-200">
                Bring more students into the conversation with feedback loops that work in real time.
              </p>
              <div className="mt-6 space-y-3 text-sm text-slate-200">
                <p className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">Faster grading and feedback cycles.</p>
                <p className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">Multi-modal assessment in one place.</p>
                <p className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">Equity-centered accessibility options.</p>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Get started</p>
              <h2 className="mt-4 text-3xl font-semibold text-slate-900">Bring every learner into the conversation</h2>
              <p className="mt-3 text-slate-600">
                Create a classroom, add a document, and start collaborating in minutes.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-600">
                Create account
              </Link>
                <Link
                  href="/admin"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
                >
                  Open admin console
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-16 md:px-10">
          <div className="grid gap-6 lg:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <article key={item.name} className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
                <p className="text-sm text-slate-600">"{item.quote}"</p>
                <p className="mt-4 text-sm font-semibold text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-500">{item.role}</p>
              </article>
            ))}
          </div>

          <div id="faq" className="grid gap-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-500/10 via-white to-amber-500/10 p-8 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">FAQ</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">Questions from educators</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {FAQ.map((item) => (
                <article key={item.q} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-slate-900">{item.q}</p>
                  <p className="mt-2 text-sm text-slate-600">{item.a}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-900">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-16 md:px-10">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-10 text-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Ready to launch</p>
                <h2 className="mt-3 text-3xl font-semibold">Bring the learning layer to your school</h2>
                <p className="mt-2 text-sm text-slate-200">
                  Start with a single class or roll out district-wide. We will help you onboard quickly.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                >
                  Start free trial
                </Link>
                <Link
                  href="/admin"
                  className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20"
                >
                  Talk to an admin
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col px-6 pb-10 pt-6 md:px-10">
          <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500">
            <p>Built for modern instruction workflows.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/classrooms" className="hover:text-slate-700">
                Classrooms
              </Link>
              <Link href="/admin" className="hover:text-slate-700">
                Admin
              </Link>
            <Link href="/login" className="hover:text-slate-700">
              Login
            </Link>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}
