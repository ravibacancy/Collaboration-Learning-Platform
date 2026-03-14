"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_DEBOUNCE_MS = 200;

type RealtimeRefreshProps = {
  channel: string;
  table: string;
  filter?: string;
  schema?: string;
  debounceMs?: number;
};

export default function RealtimeRefresh({ channel, table, filter, schema = "public", debounceMs = DEFAULT_DEBOUNCE_MS }: RealtimeRefreshProps) {
  const router = useRouter();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const realtimeChannel = supabase
      .channel(channel)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema,
          table,
          filter,
        },
        () => {
          if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = window.setTimeout(() => {
            router.refresh();
          }, debounceMs);
        },
      )
      .subscribe();

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      supabase.removeChannel(realtimeChannel);
    };
  }, [channel, debounceMs, filter, router, schema, table]);

  return null;
}