import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
vi.mock("../api", () => ({ apiFetch }));

describe("mobile public discovery integration", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    vi.resetModules();
  });

  it("deduplicates and sorts members returned by unified search", async () => {
    apiFetch.mockResolvedValue({
      users: [
        { id: "2", displayName: "Zoé" },
        { id: "1", displayName: "Alice" },
        { id: "1", displayName: "Alice" },
      ],
      lists: [],
    });
    const discovery = await import("./publicDiscovery");
    const users = await discovery.discoverAllUsers();
    expect(users.map((user) => user.id)).toEqual(["1", "2"]);
  });

  it("keeps only public lists belonging to the selected profile", async () => {
    apiFetch.mockResolvedValue({
      users: [],
      lists: [
        { id: "a", userId: "u1", name: "A", user: { displayName: "One" } },
        { id: "b", userId: "u2", name: "B", user: { displayName: "Two" } },
      ],
    });
    const discovery = await import("./publicDiscovery");
    const lists = await discovery.discoverPublicListsForUser("u1");
    expect(lists).toEqual([expect.objectContaining({ id: "a", isPublic: true })]);
  });
});
