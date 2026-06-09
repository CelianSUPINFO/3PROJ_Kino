import { describe, expect, it } from "vitest";
import { genreLabel, notificationLabel, statusLabel, t } from "./i18n";

describe("mobile translations", () => {
  it("interpolates translation variables", () => {
    expect(t("fr", "notifications.unread", { count: 3 })).toContain("3");
  });

  it("translates search and notification labels", () => {
    expect(genreLabel("en", "drama")).toBe("Drama");
    expect(statusLabel("fr", "WATCHLIST")).toBe("À voir");
    expect(notificationLabel("fr", "RECOMMENDATION")).toBe("Nouvelle recommandation");
  });
});
