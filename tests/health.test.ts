import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("production health contract", () => {
  it("returns only the public service status and configured revision", async () => {
    process.env.APP_ENVIRONMENT = "production";
    process.env.APP_REVISION = "test-revision";

    const response = GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      service: "haaglandencup",
      environment: "production",
      revision: "test-revision",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
