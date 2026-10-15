import { describe, expect, it } from "vitest";
import {
  itemsToSapComponentsText,
  itemsToSapQuantitiesText,
  itemsToSapText,
  orderToSapText,
  type Order,
} from "../client/src/catalog/lib/order-text";

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
  it("coloca SAP en Componente y la cantidad después del segundo tab", () => {
    const result = orderToSapText(order);

    expect(result).toEqual({
      texto: "3007141\t\t2",
      copiados: 1,
      omitidos: 1,
    });
    const fila = result.texto.split("\n")[0]?.split("\t");
    expect(fila).toEqual(["3007141", "", "2"]);
    expect(fila).toHaveLength(3);
  });

  it("usa el mismo formato al copiar directamente desde un kit", () => {
    const items = [
      { sap: "3002920", qty: 1 },
      { sap: "", qty: 4 },
      { sap: "3005227", qty: 3 },
    ];
    const result = itemsToSapText(items);

    expect(result).toEqual({
      texto: "3002920\t\t1\n3005227\t\t3",
      copiados: 2,
      omitidos: 1,
    });
  });

  it("mantiene separados los datos de kits distintos al copiar consecutivamente", () => {
    const kitA = [{ sap: "KIT-A-SAP", qty: 2 }];
    const kitB = [{ sap: "KIT-B-SAP", qty: 7 }];

    expect(itemsToSapText(kitA).texto).toBe("KIT-A-SAP\t\t2");
    expect(itemsToSapText(kitB).texto).toBe("KIT-B-SAP\t\t7");
  });

  it("separa Componentes y Ctd.nece para pegar desde la celda con cursor", () => {
    const items = [
      { sap: "3007141", qty: 2 },
      { sap: "3027668", qty: 1 },
    ];

    expect(itemsToSapComponentsText(items).texto).toBe("3007141\n3027668");
    expect(itemsToSapQuantitiesText(items).texto).toBe("2\n1");
  });
});
