import { describe, expect, it } from "vitest";
import { itemsToSapText, orderToSapText, type Order } from "../client/src/catalog/lib/order-text";

const order: Order = {
  items: [
    {
      row: {
        id: "part-1",
        equipo: "834K",
        np: "2J-3507",
        descripcion: "Tuerca de cuchilla",
        sap: "3007141",
      },
      qty: 2,
    },
    {
      row: {
        id: "part-2",
        equipo: "834K",
        np: "4F-4042",
        descripcion: "Perno de cuchilla",
        sap: "",
      },
      qty: 1,
    },
  ],
  lineas: 2,
  unidades: 3,
};

describe("formato de portapapeles SAP", () => {
  it("salta UM y coloca la cantidad en Ctd.nece", () => {
    const result = orderToSapText(order);

    expect(result).toEqual({
      texto: "3007141\t\t\t\t2",
      copiados: 1,
      omitidos: 1,
    });
    const fila = result.texto.split("\n")[0]?.split("\t");
    expect(fila).toEqual(["3007141", "", "", "", "2"]);
    expect(fila).toHaveLength(5);
  });

  it("usa el mismo formato al copiar directamente desde un kit", () => {
    const result = itemsToSapText([
      { sap: "3002920", qty: 1 },
      { sap: "", qty: 4 },
      { sap: "3005227", qty: 3 },
    ]);

    expect(result).toEqual({
      texto: "3002920\t\t\t\t1\n3005227\t\t\t\t3",
      copiados: 2,
      omitidos: 1,
    });
  });
});
