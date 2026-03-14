type DemoClassroom = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  owner_id?: string | null;
  join_code?: string;
};

type DemoDocument = {
  id: string;
  title: string;
  file_type: string;
  status: string;
  created_at: string;
  classroom_id: string;
  owner_id?: string | null;
  file_path?: string;
};

type DemoAssignment = {
  id: string;
  title: string;
  due_at: string | null;
  published_at: string;
  classroom_id: string;
  document_id: string;
};

type DemoNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  reference_type?: string | null;
  reference_id?: string | null;
  user_id?: string;
  sender_id?: string | null;
};

type DemoIntegration = {
  id: string;
  provider: "google_classroom" | "canvas" | "schoology" | "microsoft_teams";
  status: "connected" | "pending" | "error";
  display_name: string | null;
  external_class_id: string | null;
  created_at: string;
  updated_at?: string;
  classroom_id?: string;
};

type DemoProject = {
  id: string;
  name: string;
  status: string;
  description: string | null;
  created_at: string;
};

type DemoTask = {
  id: string;
  title: string;
  is_done: boolean;
  priority: number;
  due_date: string | null;
  project_id: string;
  projects?: { name: string };
};

type DemoMember = {
  id: string;
  user_id: string;
  role: "owner" | "teacher" | "student";
  created_at: string;
};

type DemoProfile = {
  id: string;
  full_name: string;
};

type DemoInvite = {
  id: string;
  classroom_id: string;
  email: string;
  role: "teacher" | "student";
  created_at: string;
};

type DemoAuditEvent = {
  id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
  actor_id: string | null;
};

type DemoAnnotation = {
  id: string;
  annotation_type: string;
  page_number: number;
  content: Record<string, unknown>;
  user_id: string;
  created_at: string;
  document_id: string;
};

type DemoComment = {
  id: string;
  body: string;
  user_id: string;
  created_at: string;
  document_id: string;
};

type DemoAnnotationHistory = {
  id: string;
  annotation_id: string;
  actor_id: string;
  action: "created" | "updated" | "deleted";
  annotation_type: string;
  page_number: number;
  content: Record<string, unknown>;
  captured_at: string;
};

type DemoSubmission = {
  id: string;
  student_id: string;
  submission_text: string;
  status: "submitted" | "reviewed" | "returned";
  submitted_at: string;
};

type DemoAnalyticsEvent = {
  id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
  classroom_id: string | null;
  document_id: string | null;
  user_id: string | null;
};

const DEMO_LIMIT = 15;
const baseDate = new Date();

function isoDaysAgo(days: number) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function demoId(prefix: string, index: number) {
  return `${prefix}-${String(index + 1).padStart(2, "0")}`;
}

const demoUsers: DemoProfile[] = Array.from({ length: 10 }, (_, index) => ({
  id: demoId("demo-user", index),
  full_name: [
    "Ava Patel",
    "Noah Singh",
    "Mia Johnson",
    "Liam Chen",
    "Zoe Carter",
    "Ethan Brooks",
    "Maya Davis",
    "Arjun Mehta",
    "Isla Perez",
    "Leo Kim",
  ][index % 10],
}));

const demoClassrooms: DemoClassroom[] = Array.from({ length: 8 }, (_, index) => ({
  id: demoId("demo-classroom", index),
  name: `BACANCY Cohort ${index + 1}`,
  description: "Live annotation studio with assignments, rubrics, and feedback loops.",
  created_at: isoDaysAgo(18 - index),
  owner_id: demoUsers[index % demoUsers.length].id,
  join_code: `DEMO${String(index + 1).padStart(4, "0")}`,
}));

const demoDocuments: DemoDocument[] = Array.from({ length: DEMO_LIMIT }, (_, index) => ({
  id: demoId("demo-doc", index),
  title: `Learning Packet ${index + 1}`,
  file_type: index % 3 === 0 ? "pdf" : index % 3 === 1 ? "docx" : "pptx",
  status: "active",
  created_at: isoDaysAgo(20 - index),
  classroom_id: demoClassrooms[index % demoClassrooms.length].id,
  owner_id: demoUsers[index % demoUsers.length].id,
  file_path: "https://example.com/demo.pdf",
}));

const demoAssignments: DemoAssignment[] = Array.from({ length: DEMO_LIMIT }, (_, index) => ({
  id: demoId("demo-assignment", index),
  title: `Module ${index + 1} Reflection`,
  due_at: index % 2 === 0 ? isoDaysAgo(-3 - index) : null,
  published_at: isoDaysAgo(16 - index),
  classroom_id: demoDocuments[index % demoDocuments.length].classroom_id,
  document_id: demoDocuments[index % demoDocuments.length].id,
}));

const demoNotifications: DemoNotification[] = Array.from({ length: DEMO_LIMIT }, (_, index) => ({
  id: demoId("demo-notification", index),
  type: ["assignment", "comment", "mention", "invite"][index % 4],
  title: `Update ${index + 1}`,
  body: "New activity detected in your classroom workspace.",
  is_read: index % 3 === 0,
  created_at: isoDaysAgo(index),
  reference_type: index % 2 === 0 ? "assignment" : "document",
  reference_id: index % 2 === 0 ? demoAssignments[index % demoAssignments.length].id : demoDocuments[index % demoDocuments.length].id,
  user_id: demoUsers[index % demoUsers.length].id,
  sender_id: demoUsers[(index + 1) % demoUsers.length].id,
}));

const demoIntegrations: DemoIntegration[] = Array.from({ length: 6 }, (_, index) => ({
  id: demoId("demo-integration", index),
  provider: (["google_classroom", "canvas", "schoology", "microsoft_teams"] as DemoIntegration["provider"][])[index % 4],
  status: (["connected", "pending", "error"] as DemoIntegration["status"][])[index % 3],
  display_name: `LMS Sync ${index + 1}`,
  external_class_id: `EXT-${1000 + index}`,
  created_at: isoDaysAgo(12 - index),
  updated_at: isoDaysAgo(10 - index),
  classroom_id: demoClassrooms[index % demoClassrooms.length].id,
}));

const demoProjects: DemoProject[] = Array.from({ length: 6 }, (_, index) => ({
  id: demoId("demo-project", index),
  name: `Project Pulse ${index + 1}`,
  status: ["Planning", "In Progress", "Done"][index % 3],
  description: "Cross-team rollout for annotated learning modules.",
  created_at: isoDaysAgo(25 - index),
}));

const demoTasks: DemoTask[] = Array.from({ length: 10 }, (_, index) => ({
  id: demoId("demo-task", index),
  title: `Follow-up ${index + 1} for cohort readiness`,
  is_done: index % 3 === 0,
  priority: ((index % 3) + 1) as 1 | 2 | 3,
  due_date: isoDaysAgo(-1 - index).slice(0, 10),
  project_id: demoProjects[index % demoProjects.length].id,
  projects: { name: demoProjects[index % demoProjects.length].name },
}));

const demoMembers: DemoMember[] = Array.from({ length: 10 }, (_, index) => ({
  id: demoId("demo-member", index),
  user_id: demoUsers[index % demoUsers.length].id,
  role: index === 0 ? "owner" : index % 4 === 0 ? "teacher" : "student",
  created_at: isoDaysAgo(30 - index),
}));

const demoInvites: DemoInvite[] = Array.from({ length: 4 }, (_, index) => ({
  id: demoId("demo-invite", index),
  classroom_id: demoClassrooms[index % demoClassrooms.length].id,
  email: `student${index + 1}@demo.edu`,
  role: index % 2 === 0 ? "student" : "teacher",
  created_at: isoDaysAgo(4 - index),
}));

const demoAuditEvents: DemoAuditEvent[] = Array.from({ length: 8 }, (_, index) => ({
  id: demoId("demo-audit", index),
  event_type: ["member_joined", "invite_sent", "member_left", "invite_accepted"][index % 4],
  event_data: { email: `user${index + 1}@demo.edu`, role: index % 2 === 0 ? "student" : "teacher" },
  created_at: isoDaysAgo(index),
  actor_id: demoUsers[index % demoUsers.length].id,
}));

const demoAnnotations: DemoAnnotation[] = Array.from({ length: 12 }, (_, index) => ({
  id: demoId("demo-annotation", index),
  annotation_type: ["highlight", "underline", "strikethrough", "text"][index % 4],
  page_number: (index % 4) + 1,
  content: {
    x: 12 + index,
    y: 18 + index,
    width: 20,
    height: 6,
    text: index % 3 === 0 ? "Key insight" : "",
    color: ["#fde047", "#86efac", "#fca5a5", "#93c5fd"][index % 4],
  },
  user_id: demoUsers[index % demoUsers.length].id,
  created_at: isoDaysAgo(index),
  document_id: demoDocuments[index % demoDocuments.length].id,
}));

const demoComments: DemoComment[] = Array.from({ length: 8 }, (_, index) => ({
  id: demoId("demo-comment", index),
  body: "Great highlight. Consider adding a summary note here.",
  user_id: demoUsers[index % demoUsers.length].id,
  created_at: isoDaysAgo(index),
  document_id: demoDocuments[index % demoDocuments.length].id,
}));

const demoAnnotationHistory: DemoAnnotationHistory[] = Array.from({ length: 8 }, (_, index) => ({
  id: demoId("demo-history", index),
  annotation_id: demoAnnotations[index % demoAnnotations.length].id,
  actor_id: demoUsers[index % demoUsers.length].id,
  action: (["created", "updated", "deleted"] as DemoAnnotationHistory["action"][])[index % 3],
  annotation_type: demoAnnotations[index % demoAnnotations.length].annotation_type,
  page_number: demoAnnotations[index % demoAnnotations.length].page_number,
  content: { text: "Adjusted highlight", color: "#94a3b8" },
  captured_at: isoDaysAgo(index),
}));

const demoSubmissions: DemoSubmission[] = Array.from({ length: 10 }, (_, index) => ({
  id: demoId("demo-submission", index),
  student_id: demoUsers[index % demoUsers.length].id,
  submission_text: "Submitted notes with reflections and annotations.",
  status: (["submitted", "reviewed", "returned"] as DemoSubmission["status"][])[index % 3],
  submitted_at: isoDaysAgo(index),
}));

const demoAnalyticsEvents: DemoAnalyticsEvent[] = Array.from({ length: DEMO_LIMIT }, (_, index) => ({
  id: demoId("demo-analytics", index),
  event_type: ["document_viewed", "annotation_created", "comment_created", "assignment_published"][index % 4],
  event_data: { source: "demo" },
  created_at: isoDaysAgo(index),
  classroom_id: demoClassrooms[index % demoClassrooms.length].id,
  document_id: demoDocuments[index % demoDocuments.length].id,
  user_id: demoUsers[index % demoUsers.length].id,
}));

export function withDemo<T>(real: T[] | null | undefined, demo: T[]) {
  const items = real && real.length > 0 ? real : demo;
  return { items, isDemo: !real || real.length === 0 };
}

export const demoData = {
  users: demoUsers,
  classrooms: demoClassrooms,
  documents: demoDocuments,
  assignments: demoAssignments,
  notifications: demoNotifications,
  integrations: demoIntegrations,
  projects: demoProjects,
  tasks: demoTasks,
  members: demoMembers,
  invites: demoInvites,
  auditEvents: demoAuditEvents,
  annotations: demoAnnotations,
  comments: demoComments,
  annotationHistory: demoAnnotationHistory,
  submissions: demoSubmissions,
  analyticsEvents: demoAnalyticsEvents,
};

export type {
  DemoAssignment,
  DemoAuditEvent,
  DemoClassroom,
  DemoComment,
  DemoDocument,
  DemoIntegration,
  DemoMember,
  DemoNotification,
  DemoProfile,
  DemoTask,
  DemoProject,
  DemoSubmission,
};
