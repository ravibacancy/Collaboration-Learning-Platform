import "server-only";

type GoogleCourse = {
  id: string;
  name?: string;
  section?: string;
  room?: string;
  descriptionHeading?: string;
  description?: string;
};

type GoogleCourseWork = {
  id: string;
  title?: string;
  description?: string;
  state?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number; seconds?: number };
  maxPoints?: number;
  alternateLink?: string;
};

type GoogleSubmission = {
  id: string;
  userId?: string;
  state?: string;
  assignedGrade?: number;
  draftGrade?: number;
  late?: boolean;
  updateTime?: string;
  creationTime?: string;
};

function buildHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function buildUrl(path: string, query?: Record<string, string>) {
  const url = new URL(`https://classroom.googleapis.com/v1/${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
  }
  return url.toString();
}

export async function fetchCourse(accessToken: string, courseId: string) {
  const response = await fetch(buildUrl(`courses/${courseId}`), {
    headers: buildHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Google Classroom course ${courseId}.`);
  }

  return (await response.json()) as GoogleCourse;
}

export async function fetchCourseWork(accessToken: string, courseId: string) {
  const response = await fetch(buildUrl(`courses/${courseId}/courseWork`), {
    headers: buildHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Google Classroom coursework.");
  }

  const data = (await response.json()) as { courseWork?: GoogleCourseWork[] };
  return data.courseWork ?? [];
}

export async function fetchStudentSubmissions(accessToken: string, courseId: string, courseWorkId: string) {
  const response = await fetch(buildUrl(`courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions`), {
    headers: buildHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Google Classroom submissions.");
  }

  const data = (await response.json()) as { studentSubmissions?: GoogleSubmission[] };
  return data.studentSubmissions ?? [];
}

export function toIsoFromGoogleDueDate(
  dueDate?: { year: number; month: number; day: number },
  dueTime?: { hours?: number; minutes?: number; seconds?: number },
): string | null {
  if (!dueDate) {
    return null;
  }

  const hours = dueTime?.hours ?? 23;
  const minutes = dueTime?.minutes ?? 59;
  const seconds = dueTime?.seconds ?? 0;
  const date = new Date(Date.UTC(dueDate.year, dueDate.month - 1, dueDate.day, hours, minutes, seconds));
  return date.toISOString();
}
