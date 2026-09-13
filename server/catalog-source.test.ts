import { describe, expect, it } from "vitest";

const sheetId = process.env.SHEET_ID ?? "19b_CZw2cJM27ltJlV2b-f73m7TZ-Vth0";
const sheetGid = process.env.SHEET_GID ?? "1920919101";

describe("catalog source", () => {
  it("can read the configured public Google Sheet endpoint", async () => {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${sheetGid}`;
    const response = await fetch(url, {
      headers: { "user-agent": "catalogo-repuestos-test" },
      signal: AbortSignal.timeout(15_000),
    });

    expect(response.ok).toBe(true);
    const body = await response.text();
    expect(body.length).toBeGreaterThan(100);
    expect(body.toUpperCase()).toContain("EQUIPO");
  }, 20_000);
});
