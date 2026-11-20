"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { IconSparkles } from "@tabler/icons-react";

const LazyAiCopilotWidget = dynamic(
  () => import("./ai-copilot-widget").then((mod) => mod.AiCopilotWidget),
  { ssr: false }
);

/**
 * Nút mở AI Copilot siêu nhẹ được gắn trên layout chung.
 * Chỉ tải chunk AiCopilotWidget (~30KB) và cấu hình AI khi người dùng bấm mở lần đầu.
 */
export function AiCopilotLauncher() {
  const [activated, setActivated] = React.useState(false);

  if (activated) {
    return <LazyAiCopilotWidget initialOpen />;
  }

  return (
    <button
      type="button"
      onClick={() => setActivated(true)}
      aria-label="Mở Trợ Lý AI SME Copilot"
      title="Trợ Lý AI SME Copilot"
      className="fixed bottom-5 right-5 z-50 flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 hover:shadow-xl active:scale-95 cursor-pointer"
    >
      <IconSparkles className="h-6 w-6" />
    </button>
  );
}
