insert into public.projects (id, owner_id, name, description, status, is_public)
values
  ('11111111-1111-1111-1111-111111111111', null, 'Marketing Website Refresh', 'Revamp landing pages and optimize conversion flow.', 'In Progress', true),
  ('22222222-2222-2222-2222-222222222222', null, 'Customer Onboarding Kit', 'Create templates and docs for faster trial-to-paid conversion.', 'Planning', true),
  ('33333333-3333-3333-3333-333333333333', null, 'Q2 Product Launch', 'Coordinate launch messaging, analytics, and go-live checklists.', 'Done', true)
on conflict (id) do nothing;

insert into public.tasks (project_id, title, priority, due_date, is_done)
values
  ('11111111-1111-1111-1111-111111111111', 'Finalize homepage hero copy', 2, current_date + 3, false),
  ('11111111-1111-1111-1111-111111111111', 'Review mobile breakpoints', 1, current_date + 5, true),
  ('22222222-2222-2222-2222-222222222222', 'Draft welcome email sequence', 2, current_date + 7, false),
  ('22222222-2222-2222-2222-222222222222', 'Record setup walkthrough video', 3, current_date + 10, false),
  ('33333333-3333-3333-3333-333333333333', 'Publish launch retrospective', 1, current_date - 2, true)
on conflict do nothing;