import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceRole);

const projects = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    owner_id: null,
    name: "Marketing Website Refresh",
    description: "Revamp landing pages and optimize conversion flow.",
    status: "In Progress",
    is_public: true,
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    owner_id: null,
    name: "Customer Onboarding Kit",
    description: "Create templates and docs for faster trial-to-paid conversion.",
    status: "Planning",
    is_public: true,
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    owner_id: null,
    name: "Q2 Product Launch",
    description: "Coordinate launch messaging, analytics, and go-live checklists.",
    status: "Done",
    is_public: true,
  },
];

const tasks = [
  {
    project_id: "11111111-1111-1111-1111-111111111111",
    title: "Finalize homepage hero copy",
    priority: 2,
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().slice(0, 10),
    is_done: false,
  },
  {
    project_id: "11111111-1111-1111-1111-111111111111",
    title: "Review mobile breakpoints",
    priority: 1,
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString().slice(0, 10),
    is_done: true,
  },
  {
    project_id: "22222222-2222-2222-2222-222222222222",
    title: "Draft welcome email sequence",
    priority: 2,
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
    is_done: false,
  },
  {
    project_id: "22222222-2222-2222-2222-222222222222",
    title: "Record setup walkthrough video",
    priority: 3,
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString().slice(0, 10),
    is_done: false,
  },
  {
    project_id: "33333333-3333-3333-3333-333333333333",
    title: "Publish launch retrospective",
    priority: 1,
    due_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString().slice(0, 10),
    is_done: true,
  },
];

const run = async () => {
  const projectsResult = await supabase.from("projects").upsert(projects, { onConflict: "id" });
  if (projectsResult.error) {
    throw projectsResult.error;
  }

  for (const task of tasks) {
    const existing = await supabase
      .from("tasks")
      .select("id")
      .eq("project_id", task.project_id)
      .eq("title", task.title)
      .limit(1)
      .maybeSingle();

    if (existing.error) {
      throw existing.error;
    }

    if (!existing.data) {
      const inserted = await supabase.from("tasks").insert(task);
      if (inserted.error) {
        throw inserted.error;
      }
    }
  }

  console.log("Seed completed");
};

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});