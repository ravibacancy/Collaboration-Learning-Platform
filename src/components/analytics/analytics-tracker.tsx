"use client";

import { useEffect, useRef } from "react";

type AnalyticsTrackerProps = {
  eventType: string;
  classroomId?: string;
  documentId?: string;
  eventData?: Record<string, unknown>;
};

export default function AnalyticsTracker({ eventType, classroomId, documentId, eventData }: AnalyticsTrackerProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!eventType || firedRef.current) {
      return;
    }

    firedRef.current = true;

    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        classroomId,
        documentId,
        eventData,
      }),
    }).catch(() => undefined);
  }, [eventType, classroomId, documentId, eventData]);

  return null;
}
