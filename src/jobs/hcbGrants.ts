import type { logger as LogTape } from "@/index";
import HCB from "@/lib/hcb";
import HCBScan from "@/lib/hcbscan";
import HomeBox from "@/lib/homebox";

export default {
  name: "hcbGrants",
  execute: async ({ logger }: { logger: typeof LogTape }) => {
    if (
      !process.env["HCBSCAN_ID"] ||
      !process.env["HOMEBOX_SERVER_URL"] ||
      !process.env["HOMEBOX_API_KEY"] ||
      !process.env["HOMEBOX_ENTITY_TYPE_ID"]
    )
      return;

    const hcbScan = new HCBScan(logger);
    const hcb = new HCB(logger);
    const hb = new HomeBox(
      process.env["HOMEBOX_SERVER_URL"],
      process.env["HOMEBOX_API_KEY"],
      logger,
    );
    const userActivities = await hcbScan.userActivities({
      id: process.env["HCBSCAN_ID"],
    });
    if (
      !userActivities.ok ||
      !userActivities.data.ok ||
      userActivities.data.data?.length === 0
    )
      return;

    const tags = await hb.getTags();
    if (!tags.ok || !tags.data || tags.data?.length === 0) return;

    let grantTag = tags.data.find((tag) => tag.name.toLowerCase() === "grant")
      ? tags.data.find((tag) => tag.name.toLowerCase() === "grant")?.id
      : "";
    if (!grantTag || grantTag.length === 0) {
      const creationOfTag = await hb.createTag({
        color: "#ed344f",
        descrtiption: "Tag for all HCB grants",
        icon: "https://hcb.hackclub.com/brand/hcb-icon-icon-original.png",
        name: "Grant",
        parentId: null,
      });
      if (
        !creationOfTag.ok ||
        !creationOfTag.data ||
        Object.keys(creationOfTag.data)?.length === 0
      )
        return;

      grantTag = creationOfTag.data.id;
    }
    const activities = userActivities.data.data ?? [];
    const grantEntitesRaw = await hb.queryEntities({
      tags: [grantTag],
    });
    if (
      !grantEntitesRaw.ok ||
      !grantEntitesRaw.data
    )
      return;
    const grantEntities = grantEntitesRaw.data.items ?? [];
    for (const activity of activities) {
      if (
        activity.key !== "raw_pending_stripe_transaction.create" ||
        !activity.id
      )
        continue;
      let activityData = await hcb.activity({
        activity_id: activity.id ?? "",
      });

      if (!activityData || !activityData.ok || !activityData.status) {
        logger
          .with({ activityData })
          .error("Unexpected activity data response");
        return;
      }

      if (activityData.status === 408) continue;
      if (activityData.status === 429) {
        while (activityData.status === 429) {
          logger.info("Activity Data by HCB ratelimited");

          const waitMs = 2000 + Math.floor(Math.random() * 1000);
          await new Promise((res) => setTimeout(res, waitMs));
          activityData = await hcb.activity({ activity_id: activity.id ?? "" });
        }
      }

      if (
        activityData.ok &&
        activityData.data.transaction?.amount_cents &&
        (activityData.data.transaction?.amount_cents ?? 0) < 0
      ) {
        if (!activityData.data.transaction?.card_charge) continue;
        let cardCharge = await hcb.cardCharge({
          card_charge_id: activityData.data.transaction?.card_charge.id,
        });

        if (cardCharge.status === 408) continue;
        if (cardCharge.status === 429) {
          while (cardCharge.status === 429) {
            logger.info("Card charge ratelimited");
            const waitMs = 2000 + Math.floor(Math.random() * 1000);
            await new Promise((res) => setTimeout(res, waitMs));
            cardCharge = await hcb.cardCharge({
              card_charge_id: activityData.data.transaction?.card_charge.id,
            });
          }
        }

        if (cardCharge.ok) {
          if (
            grantEntities.find(
              (g) =>
                g.name.includes(activity.id ?? crypto.randomUUID()) ||
                g.name.includes(cardCharge.data.card.id ?? crypto.randomUUID()),
            )
          )
            continue;
          const creationOfEntity = await hb.createEntity({
            description: `HCB Grant of ${activity.id}`,
            entityTypeId: process.env["HOMEBOX_ENTITY_TYPE_ID"],
            name: `${activity.id} - ${cardCharge.data.card.id} - ${activityData.data.transaction.memo}`,
            quantity: 1,
            tagIds: [grantTag],
          });
          if (
            !creationOfEntity.ok ||
            !creationOfEntity.data ||
            Object.keys(creationOfEntity.data)?.length === 0
          )
            continue;

          const updateTheEntity = await hb.updateEntity(
            {
              id: creationOfEntity.data.id,
            },
            {
              name: `${activity.id} - ${cardCharge.data.card.id} - ${activityData.data.transaction.memo}`,
              tagIds: [grantTag],
              quantity: 1,
              purchasePrice:
                Math.abs(activityData.data.transaction.amount_cents) / 100,
            },
          );

          if (
            !updateTheEntity.ok ||
            !updateTheEntity.data ||
            Object.keys(updateTheEntity.data)?.length === 0
          )
            continue;

          logger
            .with({
              activityId: activity.id,
              memo: activityData.data.transaction.memo,
            })
            .info("Created new entity of a HCB grant transaction");
          continue;
        }
      }
    }
  },
};
