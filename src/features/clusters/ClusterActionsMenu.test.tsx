import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import i18n from "@/i18n";
import { ClusterActionsMenu } from "./ClusterActionsMenu";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("the actions of the clusters", () => {
  let deletes: string[];

  function stubApi(privileges: { role: string; privilege: string }[], refuse = "") {
    deletes = [];
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) => {
        const request = input instanceof Request ? input : new Request(String(input));
        const path = decodeURIComponent(new URL(request.url).pathname.replace(/^\/api/, ""));
        if (request.method === "DELETE") {
          deletes.push(path);
          return path.endsWith(refuse) && refuse !== ""
            ? json({ text: "you are not responsible for every node of cluster b" }, 403)
            : new Response(null, { status: 204 });
        }
        if (path === "/users/self/groups") return json({ data: privileges });
        return json({ data: [] });
      }),
    );
  }

  beforeEach(() => {
    void i18n.changeLanguage("en");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderMenu() {
    const onDeleted = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ClusterActionsMenu
          clusters={[
            { id: "c1", name: "a" },
            { id: "c2", name: "b" },
          ]}
          onDeleted={onDeleted}
        />
      </QueryClientProvider>,
    );
    return onDeleted;
  }

  async function openDelete() {
    fireEvent.click(await screen.findByRole("button", { name: /Actions/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /Data actions/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /Delete from the collector/ }));
    return screen.findByRole("alertdialog");
  }

  test("a NodeManager deletes the clusters from the collector, one request each", async () => {
    stubApi([{ role: "NodeManager", privilege: "T" }], "c2");
    const onDeleted = renderMenu();
    const dialog = await openDelete();
    expect(
      within(dialog).getByText(/Delete these 2 clusters from the collector\?/),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete 2 clusters" }));
    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledWith(["c1"]);
    });
    expect(deletes).toEqual(["/clusters/c1", "/clusters/c2"]);
    expect(
      await screen.findByText(/you are not responsible for every node of cluster b/),
    ).toBeInTheDocument();
  });

  test("a user without NodeManager is offered the agent actions, not the deletion", async () => {
    stubApi([{ role: "NodeExec", privilege: "T" }]);
    renderMenu();
    fireEvent.click(await screen.findByRole("button", { name: /Actions/ }));
    expect(await screen.findByRole("menuitem", { name: /Freeze every node/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Data actions/ })).not.toBeInTheDocument();
  });
});
