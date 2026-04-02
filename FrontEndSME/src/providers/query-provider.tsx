"use client";

import { QueryClient, QueryClientProvider, useIsFetching } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactNode, useState } from "react";

// Thin progress bar that appears whenever any query is in-flight
function GlobalLoadingBar() {
  const fetching = useIsFetching();
  if (!fetching) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        width: "100%",
        height: "3px",
        background: "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.4) 100%)",
        animation: "sme-loading-bar 1.2s ease-in-out infinite alternate",
      }}
    />
  );
}

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes — avoids redundant refetches
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <GlobalLoadingBar />
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
