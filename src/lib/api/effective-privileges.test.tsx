import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useHasPrivilege } from "./effective-privileges";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

function stubPrivileges(rows: { role: string; privilege: string }[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () => json({ data: rows })),
  );
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("a control gated on a privilege", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("shows for a holder of the privilege, once known", async () => {
    stubPrivileges([{ role: "TagManager", privilege: "T" }]);
    const { result } = renderHook(() => useHasPrivilege(["TagManager"]), { wrapper });
    expect(result.current).toBe(false);
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  test("shows for a Manager, who holds them all", async () => {
    stubPrivileges([{ role: "Manager", privilege: "T" }]);
    const { result } = renderHook(() => useHasPrivilege(["NetworkManager"]), { wrapper });
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  test("stays hidden for the others, an organisational group of that name included", async () => {
    stubPrivileges([
      { role: "AppManager", privilege: "T" },
      { role: "TagManager", privilege: "F" },
    ]);
    const { result } = renderHook(() => useHasPrivilege(["TagManager"]), { wrapper });
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
    // Still false once the privileges are read.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current).toBe(false);
  });
});
