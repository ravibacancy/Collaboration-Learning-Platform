"use client";

import { useEffect, useMemo, useState, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";
import { createClient } from "@/lib/supabase/client";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

type AnnotationItem = {
  id: string;
  annotation_type: string;
  page_number: number;
  text: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: string;
  points?: Array<{ x: number; y: number }>;
};

type Action = (formData: FormData) => void | Promise<void>;

type Props = {
  classroomId: string;
  documentId: string;
  filePath: string;
  title: string;
  annotations: AnnotationItem[];
  currentUser: {
    id: string;
    email?: string;
  };
  createAction: Action;
  updateAction: Action;
  deleteAction: Action;
};

type PresenceUser = {
  userId: string;
  email: string;
};

function boxClass(type: string): string {
  if (type === "highlight") return "opacity-35";
  if (type === "underline") return "border-b-4 border-l-0 border-r-0 border-t-0 bg-transparent";
  if (type === "strikethrough") return "border-0 bg-transparent";
  if (type === "drawing") return "bg-transparent";
  if (type === "shape") return "bg-transparent";
  if (type === "freehand") return "border-0 bg-transparent";
  return "opacity-90";
}

function safeNum(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function PdfAnnotationStudio({
  classroomId,
  documentId,
  filePath,
  title,
  annotations,
  currentUser,
  createAction,
  updateAction,
  deleteAction,
}: Props) {
  const router = useRouter();
  const [numPages, setNumPages] = useState(1);
  const [activePage, setActivePage] = useState(1);
  const [tool, setTool] = useState("highlight");
  const [color, setColor] = useState("#fde047");
  const [text, setText] = useState("");
  const [shape, setShape] = useState("rectangle");
  const [size, setSize] = useState({ width: 18, height: 6 });
  const [point, setPoint] = useState({ x: 10, y: 10 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [freehandPoints, setFreehandPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  const currentPageAnnotations = useMemo(
    () => annotations.filter((annotation) => annotation.page_number === activePage),
    [annotations, activePage],
  );

  const currentFreehandPoints = freehandPoints.length >= 2 ? freehandPoints : [];
  const isFreehandTool = tool === "freehand";
  const isSaveDisabled = isFreehandTool && currentFreehandPoints.length < 2;

  function toPercentPoint(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(100, Number(x.toFixed(2)))),
      y: Math.max(0, Math.min(100, Number(y.toFixed(2)))),
    };
  }

  function updateFreehandBounds(points: Array<{ x: number; y: number }>) {
    if (points.length < 2) return;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.max(0, Math.min(...xs));
    const maxX = Math.min(100, Math.max(...xs));
    const minY = Math.max(0, Math.min(...ys));
    const maxY = Math.min(100, Math.max(...ys));
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    setPoint({ x: Number(minX.toFixed(2)), y: Number(minY.toFixed(2)) });
    setSize({ width: Number(width.toFixed(2)), height: Number(height.toFixed(2)) });
  }

  function pointsToPath(points: Array<{ x: number; y: number }>) {
    if (points.length === 0) return "";
    return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  }

  function normalizePointsForBox(points: Array<{ x: number; y: number }>) {
    if (points.length < 2) {
      return points;
    }
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.max(0, Math.min(...xs));
    const maxX = Math.min(100, Math.max(...xs));
    const minY = Math.max(0, Math.min(...ys));
    const maxY = Math.min(100, Math.max(...ys));
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    return points.map((p) => ({
      x: Number((((p.x - minX) / width) * 100).toFixed(2)),
      y: Number((((p.y - minY) / height) * 100).toFixed(2)),
    }));
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`doc-collab-${documentId}`, {
      config: {
        presence: { key: currentUser.id },
      },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceUser>();
      const users = Object.values(state).flat();
      setOnlineUsers(users);
    });

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "annotations", filter: `document_id=eq.${documentId}` },
      () => router.refresh(),
    );


    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ userId: currentUser.id, email: currentUser.email ?? "user" });
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser.email, currentUser.id, documentId, router]);

  return (
    <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
      <article className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div>
            <p className="font-medium text-slate-900">{title}</p>
            <p className="text-slate-500">Page {activePage} of {numPages}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-slate-500">Live users: {onlineUsers.length}</p>
            {onlineUsers.slice(0, 3).map((user) => (
              <span key={user.userId} className="rounded-full bg-cyan-100 px-2 py-1 text-xs text-cyan-800">
                {user.email.split("@")[0]}
              </span>
            ))}
            <a href={filePath} target="_blank" rel="noreferrer" className="rounded-lg bg-slate-900 px-3 py-2 font-medium text-white">
              Open source file
            </a>
          </div>
        </div>

        <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="mx-auto w-fit">
            <div
              className="relative"
              onClick={(event) => {
                if (isFreehandTool) return;
                const next = toPercentPoint(event as unknown as React.PointerEvent<HTMLDivElement>);
                setPoint({ x: Math.max(0, Math.min(95, next.x)), y: Math.max(0, Math.min(95, next.y)) });
              }}
              onPointerDown={(event) => {
                if (!isFreehandTool) return;
                event.preventDefault();
                setIsDrawing(true);
                const first = toPercentPoint(event);
                setFreehandPoints([first]);
              }}
              onPointerMove={(event) => {
                if (!isFreehandTool || !isDrawing) return;
                event.preventDefault();
                setFreehandPoints((prev) => [...prev, toPercentPoint(event)]);
              }}
              onPointerUp={(event) => {
                if (!isFreehandTool) return;
                event.preventDefault();
                const finalPoint = toPercentPoint(event);
                setFreehandPoints((prev) => {
                  const next = [...prev, finalPoint];
                  updateFreehandBounds(next);
                  return next;
                });
                setIsDrawing(false);
              }}
              onPointerLeave={() => {
                if (!isFreehandTool) return;
                setIsDrawing(false);
              }}
            >
              <Document file={filePath} onLoadSuccess={(doc) => setNumPages(doc.numPages)}>
                <Page pageNumber={activePage} width={840} renderAnnotationLayer renderTextLayer />
              </Document>

              <div className="pointer-events-none absolute inset-0">
                {currentPageAnnotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    className={`absolute overflow-hidden rounded border-2 ${boxClass(annotation.annotation_type)}`}
                    style={{
                      left: `${annotation.x}%`,
                      top: `${annotation.y}%`,
                      width: `${annotation.width}%`,
                      height: `${annotation.height}%`,
                      borderColor: annotation.color,
                      backgroundColor: annotation.annotation_type === "highlight" ? annotation.color : "transparent",
                      color: annotation.color,
                      borderRadius: annotation.annotation_type === "shape" && annotation.shape === "circle" ? "9999px" : "8px",
                    }}
                    title={annotation.text || annotation.annotation_type}
                  >
                    {annotation.annotation_type === "text" ? <p className="truncate px-1 text-[11px] font-medium">{annotation.text}</p> : null}
                    {annotation.annotation_type === "strikethrough" ? (
                      <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2" style={{ backgroundColor: annotation.color }} />
                    ) : null}
                    {annotation.annotation_type === "freehand" && annotation.points ? (
                      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path
                          d={pointsToPath(annotation.points)}
                          fill="none"
                          stroke={annotation.color}
                          strokeWidth="0.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    ) : null}
                  </div>
                ))}
                {isFreehandTool && currentFreehandPoints.length > 1 ? (
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path
                      d={pointsToPath(currentFreehandPoints)}
                      fill="none"
                      stroke={color}
                      strokeWidth="0.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm">
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:opacity-50"
            disabled={activePage <= 1}
            onClick={() => setActivePage((v) => Math.max(1, v - 1))}
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:opacity-50"
            disabled={activePage >= numPages}
            onClick={() => setActivePage((v) => Math.min(numPages, v + 1))}
          >
            Next
          </button>
          <p className="text-slate-500">Click on the page to position new annotation.</p>
        </div>
      </article>

      <article className="space-y-5">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Create annotation</h2>
          <form action={createAction} className="mt-4 space-y-3">
            <input type="hidden" name="classroom_id" value={classroomId} />
            <input type="hidden" name="document_id" value={documentId} />
            <input type="hidden" name="page_number" value={activePage} />
            <input type="hidden" name="x" value={point.x} />
            <input type="hidden" name="y" value={point.y} />
            <input type="hidden" name="width" value={size.width} />
            <input type="hidden" name="height" value={size.height} />

            <select
              name="annotation_type"
              value={tool}
              onChange={(event) => {
                setTool(event.target.value);
                setFreehandPoints([]);
              }}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="highlight">Highlight</option>
              <option value="underline">Underline</option>
              <option value="strikethrough">Strikethrough</option>
              <option value="text">Text Note</option>
              <option value="drawing">Drawing Box</option>
              <option value="shape">Shape</option>
              <option value="freehand">Freehand</option>
            </select>
            {tool === "shape" ? (
              <select name="shape" value={shape} onChange={(event) => setShape(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                <option value="rectangle">Rectangle</option>
                <option value="circle">Circle</option>
              </select>
            ) : null}
            {isFreehandTool ? (
              <input type="hidden" name="points" value={JSON.stringify(normalizePointsForBox(currentFreehandPoints))} />
            ) : null}
            <input name="color" value={color} onChange={(event) => setColor(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={size.width}
                onChange={(event) => setSize((s) => ({ ...s, width: safeNum(event.target.value, 1) }))}
                className="rounded-xl border border-slate-300 px-4 py-3"
                placeholder="width %"
                disabled={isFreehandTool}
              />
              <input
                type="number"
                value={size.height}
                onChange={(event) => setSize((s) => ({ ...s, height: safeNum(event.target.value, 1) }))}
                className="rounded-xl border border-slate-300 px-4 py-3"
                placeholder="height %"
                disabled={isFreehandTool}
              />
            </div>
            <textarea name="text" value={text} onChange={(event) => setText(event.target.value)} className="h-20 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Optional text" />
            <p className="text-xs text-slate-500">
              Position: x {point.x}% / y {point.y}% {isFreehandTool ? "· Draw on the page to capture a stroke." : ""}
            </p>
            <button
              type="submit"
              className="rounded-xl bg-cyan-700 px-4 py-3 font-semibold text-white hover:bg-cyan-600 disabled:opacity-60"
              disabled={isSaveDisabled}
            >
              Save annotation
            </button>
          </form>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Edit annotations</h2>
          <div className="mt-4 space-y-3">
            {currentPageAnnotations.length === 0 ? <p className="text-slate-500">No annotations on this page.</p> : null}
            {currentPageAnnotations.map((annotation) => (
              <div key={annotation.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-700">{annotation.annotation_type}</p>
                <form action={updateAction} className="space-y-2">
                  <input type="hidden" name="classroom_id" value={classroomId} />
                  <input type="hidden" name="document_id" value={documentId} />
                  <input type="hidden" name="annotation_id" value={annotation.id} />
                  <input type="hidden" name="page_number" value={activePage} />
                  <input type="hidden" name="annotation_type" value={annotation.annotation_type} />
                  {annotation.annotation_type === "shape" ? (
                    <input type="hidden" name="shape" value={annotation.shape ?? "rectangle"} />
                  ) : null}
                  {annotation.annotation_type === "freehand" ? (
                    <input type="hidden" name="points" value={JSON.stringify(annotation.points ?? [])} />
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    <input name="x" type="number" defaultValue={annotation.x} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    <input name="y" type="number" defaultValue={annotation.y} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    <input name="width" type="number" defaultValue={annotation.width} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    <input name="height" type="number" defaultValue={annotation.height} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                  <input name="color" defaultValue={annotation.color} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <textarea name="text" defaultValue={annotation.text} className="h-16 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white">Update</button>
                </form>

                <form action={deleteAction} className="mt-2">
                  <input type="hidden" name="classroom_id" value={classroomId} />
                  <input type="hidden" name="document_id" value={documentId} />
                  <input type="hidden" name="annotation_id" value={annotation.id} />
                  <button className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">Delete</button>
                </form>
              </div>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}
