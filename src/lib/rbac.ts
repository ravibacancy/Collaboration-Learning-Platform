export type ClassroomRole = "owner" | "teacher" | "student";

const roleWeight: Record<ClassroomRole, number> = {
  student: 1,
  teacher: 2,
  owner: 3,
};

export function isAtLeastRole(role: ClassroomRole, minimum: ClassroomRole): boolean {
  return roleWeight[role] >= roleWeight[minimum];
}

export function canManageClassroom(role: ClassroomRole): boolean {
  return isAtLeastRole(role, "owner");
}

export function canPublishAssignments(role: ClassroomRole): boolean {
  return isAtLeastRole(role, "teacher");
}

export function canUploadDocuments(role: ClassroomRole): boolean {
  return isAtLeastRole(role, "teacher");
}