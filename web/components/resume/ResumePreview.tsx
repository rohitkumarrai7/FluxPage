"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { StructuredResume } from "@/lib/resumeParser";
import type { TemplateVariant } from "./templates";
import { ResumeLayout } from "./templates/layouts";
import { MIN_READABLE_SCALE, previewScaleFromContent } from "@/lib/resumeFit";

interface Props {
  resume: StructuredResume;
  template?: TemplateVariant;
  fontSize?: number;
  lineSpacing?: number;
  fitOnePage?: boolean;
}

export function ResumePreview({
  resume,
  template = "classic",
  fontSize = 10,
  lineSpacing = 1.2,
  fitOnePage = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  const fontScale = fontSize / 10;
  const compact = fitOnePage;

  const layoutProps = { resume, template, compact };

  const recalculateScale = () => {
    const container = containerRef.current;
    const content = measureRef.current;
    if (!container || !content) return;

    const containerH = container.clientHeight;
    const contentH = content.scrollHeight;
    if (containerH <= 0 || contentH <= 0) return;

    // DOM measurement only — avoids double-shrink from heuristics
    setFitScale(previewScaleFromContent(contentH, containerH, MIN_READABLE_SCALE));
  };

  useLayoutEffect(() => {
    if (!fitOnePage) {
      setFitScale(1);
      return;
    }
    recalculateScale();
  }, [resume, template, fontSize, lineSpacing, fitOnePage, fontScale]);

  useLayoutEffect(() => {
    if (!fitOnePage) return;
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(recalculateScale);
    ro.observe(container);
    return () => ro.disconnect();
  }, [resume, template, fontSize, lineSpacing, fitOnePage, fontScale]);

  return (
    <div
      ref={containerRef}
      className="relative shadow-xl border border-slate-200 bg-white mx-auto w-full"
      style={{ aspectRatio: "210 / 297", overflow: "hidden" }}
    >
      <div
        ref={measureRef}
        aria-hidden
        className="absolute top-0 left-0 w-full pointer-events-none select-none"
        style={{
          visibility: "hidden",
          fontSize: `${fontScale * 100}%`,
          lineHeight: lineSpacing,
        }}
      >
        <ResumeLayout {...layoutProps} />
      </div>

      <div
        className="absolute top-0 left-0 w-full origin-top-left"
        style={{
          transform: fitScale < 1 ? `scale(${fitScale})` : undefined,
          transformOrigin: "top left",
          fontSize: `${fontScale * 100}%`,
          lineHeight: lineSpacing,
        }}
      >
        <ResumeLayout {...layoutProps} />
      </div>
    </div>
  );
}
