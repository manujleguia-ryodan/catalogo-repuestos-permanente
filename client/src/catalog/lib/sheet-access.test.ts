import { describe, expect, it } from "vitest";
import { isValidSheetAccessKey } from "./sheet-access";

describe("isValidSheetAccessKey", () => {
  it("acepta la clave configurada aunque tenga espacios alrededor", () => {
    expect(isValidSheetAccessKey(" 2026 ")).toBe(true);
  });

  it("rechaza claves vacías o distintas", () => {
    expect(isValidSheetAccessKey("")).toBe(false);
    expect(isValidSheetAccessKey("2025")).toBe(false);
    expect(isValidSheetAccessKey("2026x")).toBe(false);
  });
});
