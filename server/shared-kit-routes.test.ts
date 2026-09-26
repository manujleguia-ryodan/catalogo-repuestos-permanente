import { describe, expect, it } from "vitest";
import { cleanSharedKitPayload } from "./shared-kit-routes";
import { kitFingerprint } from "../client/src/catalog/lib/kit-store";

const valid = {
  id: "shared_demo",
  codigo: "KIT-834K-001",
  trabajo: "Cambio de cuchillas",
  equipo: "834K",
  fingerprint: "834K|2J-3507:2",
  items: [
    { np: " 2J-3507 ", sap: "341084", descripcion: "Tuerca", equipo: "834K", qty: 2.9 },
  ],
};

describe("kits compartidos", () => {
  it("genera la misma huella para los mismos componentes aunque cambie cantidad o equipo", () => {
    const first = kitFingerprint("834K", [{ np: "2J-3507", sap: "341084", descripcion: "Tuerca", equipo: "834K", qty: 1 }]);
    const second = kitFingerprint("D10T2", [{ np: " 2J-3507 ", sap: "341084", descripcion: "Otra descripción", equipo: "D10T2", qty: 9 }]);
    expect(second).toBe(first);
  });

  it("acepta un kit válido y normaliza texto y cantidades", () => {
    expect(cleanSharedKitPayload(valid)).toEqual({
      ...valid,
      codigo: "KIT-834K-001",
      trabajo: "Cambio de cuchillas",
      equipo: "834K",
      items: [{ np: "2J-3507", sap: "341084", descripcion: "Tuerca", equipo: "834K", qty: 2 }],
    });
  });

  it("rechaza kits sin identidad o sin repuestos válidos", () => {
    expect(cleanSharedKitPayload({ ...valid, trabajo: "" })).toBeNull();
    expect(cleanSharedKitPayload({ ...valid, items: [{ np: "", qty: 0 }] })).toEqual({
      ...valid,
      items: [],
    });
    expect(cleanSharedKitPayload(null)).toBeNull();
  });
});
