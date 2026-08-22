import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, useState, type ReactNode } from "react";
import { isSessionExpired } from "./errors";
import { clearSessionTokens } from "./session";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (count, err) => {
          if (isSessionExpired(err)) return false;
          return count < 1;
        },
        staleTime: 20_000,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const queryClient = createQueryClient();
    queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && isSessionExpired(event.query.state.error)) {
        void clearSessionTokens();
      }
    });
    return queryClient;
  });
  return createElement(QueryClientProvider, { client }, children);
}
