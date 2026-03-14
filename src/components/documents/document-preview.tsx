"use client";

import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

type Props = {
  url: string;
  fileType: string;
};

export default function DocumentPreview({ url, fileType }: Props) {
  const [numPages, setNumPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [url]);

  if (!url) {
    return (
      <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
        No preview
      </div>
    );
  }

  if (fileType === "image") {
    return (
      <div className="h-28 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <img src={url} alt="Document preview" className="h-full w-full object-cover" />
      </div>
    );
  }

  if (fileType === "pdf") {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2">
        {error ? (
          <p className="text-xs text-slate-400">Preview unavailable</p>
        ) : (
          <Document
            file={url}
            onLoadSuccess={(doc) => setNumPages(doc.numPages)}
            onLoadError={() => setError("failed")}
          >
            <Page pageNumber={1} width={180} renderAnnotationLayer={false} renderTextLayer={false} />
          </Document>
        )}
        <p className="mt-1 text-[10px] text-slate-400">Page 1 of {numPages}</p>
      </div>
    );
  }

  return (
    <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
      Preview not available
    </div>
  );
}
