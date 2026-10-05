import { describe, expect, it } from "vitest";
import { parsePerneriaCsv } from "./perneria-store";

describe("lector PERNERIA", () => {
  it("lee columnas por encabezado y normaliza medida, acabado, SAP/N/P y largo", () => {
    const rows = parsePerneriaCsv([
      "ID,TIPO,MEDIDA,LARGO_MM,ACABADO,N/P,DESCRIPCIÓN",
      "1,Perno,m10,50,Negro, 10001 ,Perno M10x50 negro",
      "2,Tuerca,M10,,Negro,20001,Tuerca M10 negra",
    ].join("\n"));
    expect(rows).toEqual([
      { id: "1", tipo: "PERNO", medida: "M10", largoMm: 50, acabado: "NEGRO", np: "10001", descripcion: "Perno M10x50 negro" },
      { id: "2", tipo: "TUERCA", medida: "M10", largoMm: null, acabado: "NEGRO", np: "20001", descripcion: "Tuerca M10 negra" },
    ]);
  });

  it("tolera que solo exista un componente y no inventa filas faltantes", () => {
    const rows = parsePerneriaCsv([
      "ID,TIPO,MEDIDA,LARGO_MM,ACABADO,N/P,DESCRIPCIÓN",
      "6,Arandela,M10,,Plateado,30002,Arandela M10 plateada",
    ].join("\n"));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tipo).toBe("ARANDELA");
    expect(rows[0]?.np).toBe("30002");
  });
});
