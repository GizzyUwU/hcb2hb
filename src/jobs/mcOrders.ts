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
    if (
      !orders.ok ||
      orders.data?.length === 0
    )
      return;

    const tags = await hb.getTags();
    if (!tags.ok || !tags.data || tags.data.length === 0) return;
    let macondoTag = tags.data.find((tag) => tag.name.toLowerCase() === "macondo") ? tags.data.find((tag) => tag.name.toLowerCase() === "macondo")?.id : "";
    if (!macondoTag || macondoTag.length === 0) {
      const createTheTag = await hb.createTag({
        color: "#FFFF00",
        descrtiption: "Tag for all macondo orders",
        icon: "https://macondo.hackclub.com/favicon.ico",
        name: "Macondo",
        parentId: null
      })
      if (
        !createTheTag.ok ||
        !createTheTag.data ||
        Object.keys(createTheTag.data)?.length === 0
      )
        return;

      macondoTag = createTheTag.data.id;
    }

    const mcOrderEntitiesRaw = await hb.queryEntities({
      tags: ["Macondo"]
    })
  },
};
