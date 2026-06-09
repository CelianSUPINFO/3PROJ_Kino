import { describe, expect, it } from "vitest";
import { notificationLabel, statusLabel, t } from "./i18n";

describe("web translations", () => {
  it("interpolates translated values", () => {
    expect(t("fr", "title.runtimeMin", { minutes: 120 })).toBe("120 min");
  });

  it("translates library statuses and notifications", () => {
    expect(statusLabel("fr", "COMPLETED")).toBe("Terminé");
    expect(statusLabel("en", "COMPLETED")).toBe("Completed");
    expect(notificationLabel("en", "RECOMMENDATION")).toBe("New recommendation");
  });
});
