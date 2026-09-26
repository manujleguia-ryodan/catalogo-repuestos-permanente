import { describe, expect, it } from "vitest";
import { cleanSharedKitPayload, uniqueSharedCode } from "./shared-kit-routes";
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

  it("resuelve el código ocupado al compartir un kit local", () => {
    expect(uniqueSharedCode("KIT-PV271-001", "PV271", [{ codigo: "KIT-PV271-001" }])).toBe("KIT-PV271-002");
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

  it("guarda siempre el mismo formato aunque llegue con mayúsculas mezcladas", () => {
    const result = cleanSharedKitPayload({
      ...valid,
      codigo: "kit-834k-009",
      trabajo: "  CAMBIO   DE   CUCHILLAS  ",
      equipo: " 834k ",
      items: [
        { np: " 9-Z ", sap: " sap-2 ", descripcion: "Zeta", equipo: "834k", qty: 1 },
        { np: " 2-A ", sap: "sap-1", descripcion: "Alfa", equipo: "834k", qty: 2 },
      ],
    });
    expect(result?.codigo).toBe("KIT-834K-009");
    expect(result?.trabajo).toBe("Cambio de cuchillas");
    expect(result?.equipo).toBe("834K");
    expect(result?.items.map((item) => item.np)).toEqual(["2-A", "9-Z"]);
    expect(result?.items.map((item) => item.sap)).toEqual(["SAP-1", "SAP-2"]);
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
