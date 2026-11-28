import { beforeEach, describe, expect, test, vi } from "vitest";

const put = vi.fn();
vi.mock("./client", () => ({ api: { PUT: (...args: unknown[]) => put(...args) } }));

const { queueActionList } = await import("./action-queue");

describe("queueActionList", () => {
  beforeEach(() => {
    put.mockReset();
  });

  test("tells queued, refused and accepted with nothing to queue apart", async () => {
    put.mockResolvedValue({
      data: {
        info: ["1 action(s) queued"],
        error: ["wake on node_id=w3: 403: no"],
        data: [{}],
        refusals: [{ index: 2, message: "no" }],
        notices: [{ index: 1, message: "node w2 is already up: nothing queued" }],
      },
      error: undefined,
    });
    const results = await queueActionList([
      { node_id: "w1", action: "wake" },
      { node_id: "w2", action: "wake" },
      { node_id: "w3", action: "wake" },
      "refused before",
    ]);
    expect(results).toEqual([
      { refusal: null, notice: null },
      { refusal: null, notice: "node w2 is already up: nothing queued" },
      { refusal: "no", notice: null },
      { refusal: "refused before", notice: null },
    ]);
  });

  test("reads an answer without notices, as from a collector before them", async () => {
    put.mockResolvedValue({
      data: { info: [], error: [], data: [], refusals: [] },
      error: undefined,
    });
    expect(await queueActionList([{ node_id: "w1", action: "wake" }])).toEqual([
      { refusal: null, notice: null },
    ]);
  });
});
