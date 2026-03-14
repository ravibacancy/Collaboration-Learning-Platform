# Kami Platform Development Plan

This project is now moving in phases based on the `kami_blueprint_20260311_002318.pdf`.

## Phase 1 (Complete) - Foundation

Goals:
- Classroom-first domain model and RBAC baseline.
- Core schema for classroom, membership, document, assignment, annotation, and comment entities.
- Protected Classroom workspace route for authenticated users.

Delivered:
- `supabase/phase1_foundation.sql` with RLS policies and triggers.
- `src/lib/rbac.ts` permission helpers.
- `src/app/classrooms/*` classroom creation/listing and document workspace entry.

## Phase 2 (Complete) - Annotation Core

Goals:
- PDF/document viewer integration.
- Annotation primitives (highlight, underline, text, drawing).
- Save/load/update/delete annotation engine.

Delivered:
- Classroom-level document catalog and document creation flow.
- PDF viewer based on `react-pdf` page rendering.
- On-document overlay annotation rendering by page.
- Click-to-place annotation creation with persisted geometry and metadata.
- Annotation update (move/resize/edit) and delete controls.

## Phase 3 (Complete) - Collaboration + Classroom Workflow

Goals:
- Real-time collaboration and presence.
- Assignment publish and submission flow.
- Comments/mentions notifications baseline.

Delivered:
- `supabase/phase3_collaboration.sql` migration for `assignment_submissions` and `notifications`.
- Assignment publish flow from classroom workspace.
- Assignment detail page with submission workflow.
- Realtime collaboration presence + live refresh on annotation/comment changes.
- Comment posting with optional mention target and notification creation.
- Notification center with read/unread actions.
- Teacher review workflow for submissions (reviewed/returned) with notifications.
- Notification deep-links to assignments/documents with open actions.
- Realtime refresh for notifications, submissions, and document comments.
- Notifications UX polish (unread count, mark all read, filters).
- Submission status badges, stats summary, and submit button state.

Run order for database:
1. `supabase/schema.sql`
2. `supabase/phase1_foundation.sql`
3. `supabase/phase3_collaboration.sql`
4. `supabase/phase4_reliability.sql`
5. `supabase/phase4_integrations.sql`
6. `supabase/phase4_google_classroom.sql`
7. `supabase/phase5_membership.sql`
8. `supabase/phase6_invite_email.sql`
9. `supabase/phase7_platform.sql`
10. `supabase/seed.sql` (optional legacy seed)

## Phase 4 (In Progress) - Reliability and Integrations
- Version history.
- Search.
- Cloud file and first LMS integration.

Delivered in Phase 4 so far:
- Annotation version history (database + viewer timeline).
- Global search across classrooms, documents, assignments, and comments.
- LMS + cloud document source scaffolding (database + UI).
- Google Classroom OAuth + sync scaffolding (courses/coursework/submissions into LMS tables).

Pending in Phase 4:
- Cloud file ingestion (actual file picker/auth + storage sync for Drive/OneDrive/etc.).
- Google Classroom: map LMS coursework/submissions into in-app assignments + grades.

## Phase 5 - Beta + Monetization
- Analytics instrumentation.
- Entitlements and pricing tiers.
- Hardening and release readiness.
