import type { logger as LogTape } from "@/index";
import Macondo from "@/lib/mc";
import HomeBox from "@/lib/homebox";

export default {
  name: "mcOrders",
  execute: async ({ logger }: { logger: typeof LogTape }) => {
    if (
      !process.env["HOMEBOX_SERVER_URL"] ||
      !process.env["HOMEBOX_API_KEY"] ||
      !process.env["HOMEBOX_ENTITY_TYPE_ID"] ||
      !process.env["MACONDO_API_KEY"]
    )
      return;

    const mcClient = new Macondo(process.env["MACONDO_API_KEY"], logger);
    const hb = new HomeBox(
      process.env["HOMEBOX_SERVER_URL"],
      process.env["HOMEBOX_API_KEY"],
      logger,
    );

    const orders = await mcClient.orders();
    if (!orders.ok || orders.data?.length === 0) return;

    const tags = await hb.getTags();
    if (!tags.ok || !tags.data || tags.data.length === 0) return;
    let macondoTag = tags.data.find(
      (tag) => tag.name.toLowerCase() === "macondo",
    )
      ? tags.data.find((tag) => tag.name.toLowerCase() === "macondo")?.id
      : "";
    if (!macondoTag || macondoTag.length === 0) {
      const createTheTag = await hb.createTag({
        color: "#FFFF00",
        descrtiption: "Tag for all macondo orders",
        icon: "https://macondo.hackclub.com/favicon.ico",
        name: "Macondo",
        parentId: null,
      });
      if (
        !createTheTag.ok ||
        !createTheTag.data ||
        Object.keys(createTheTag.data)?.length === 0
      )
        return;

      macondoTag = createTheTag.data.id;
    }

    const mcEntitiesRaw = await hb.queryEntities({
      tags: [macondoTag],
    });

    if (
      !mcEntitiesRaw.ok ||
      !mcEntitiesRaw.data ||
      mcEntitiesRaw.data.items?.length === 0
    )
      return;

    const orderEntities = mcEntitiesRaw.data.items ?? [];
    for (const order of orders.data) {
      const alrExist = orderEntities.find((o) =>
        o.name.includes(String(order.order.id) ?? crypto.randomUUID()),
      );
      if (alrExist && order.order.status == "cancelled") {
        const deleteTheEntity = await hb.deleteEntity({
          id: alrExist.id,
        });

        if (
          !deleteTheEntity.ok ||
          !deleteTheEntity.data ||
          Object.keys(deleteTheEntity).length === 0
        )
          continue;

        logger
          .with({
            orderId: order.order.id,
            ysws: "Macondo",
            itemName: order.order.item_snapshot.name,
          })
          .info("Deleted a macondo order entity as it got cancelled");

        continue;
      }
      if (
        orderEntities.find((o) =>
          o.name.includes(String(order.order.id) ?? crypto.randomUUID()),
        ) ||
        order.order.status == "cancelled"
      )
        continue;
      const createTheEntity = await hb.createEntity({
        description:
          order.item.description ?? `Macondo Order ${order.order.id}`,
        entityTypeId: process.env["HOMEBOX_ENTITY_TYPE_ID"],
        name: `${order.order.id} - ${order.order.item_snapshot.name}`,
        quantity: order.order.quantity ?? 1,
        tagIds: [macondoTag],
      });

      if (
        !createTheEntity.ok ||
        !createTheEntity.data ||
        Object.keys(createTheEntity).length === 0
      )
        continue;

      logger
        .with({
          orderId: order.order.id,
          ysws: "Macondo",
          itemName: order.order.item_snapshot.name,
        })
        .info("Created new entity from a macondo order");

      continue;
    }
  },
};
