import type { logger as LogTape } from "@/index";
import HCB from "@/lib/hcb";
import HCBScan from "@/lib/hcbscan";
import HomeBox from "@/lib/homebox";

export default {
  name: "hcbGrants",
  interval: 300,
  execute: async ({ logger }: { logger: typeof LogTape }) => {
    logger.info("Starting hcbGrants job");
    if (
      !process.env["HCBSCAN_ID"] ||
      !process.env["HOMEBOX_SERVER_URL"] ||
      !process.env["HOMEBOX_API_KEY"] ||
      !process.env["HOMEBOX_ENTITY_TYPE_ID"]
    ) {
      logger
        .with({
          hasHCBSCAN_ID: !!process.env["HCBSCAN_ID"],
          hasHOMEBOX_SERVER_URL: !!process.env["HOMEBOX_SERVER_URL"],
          hasHOMEBOX_API_KEY: !!process.env["HOMEBOX_API_KEY"],
          hasHOMEBOX_ENTITY_TYPE_ID: !!process.env["HOMEBOX_ENTITY_TYPE_ID"],
        })
        .info("hcbGrants: missing required env vars, skipping");
      return;
    }
    logger.info("hcbGrants: env vars present, initializing clients");

    const hcbScan = new HCBScan(logger);
    const hcb = new HCB(logger);
    const hb = new HomeBox(
      process.env["HOMEBOX_SERVER_URL"],
      process.env["HOMEBOX_API_KEY"],
      logger,
    );
    logger
      .with({ hcbScanId: process.env["HCBSCAN_ID"] })
      .info("hcbGrants: fetching userActivities from HCBScan");
    const userActivities = await hcbScan.userActivities({
      id: process.env["HCBSCAN_ID"],
    });
    logger
      .with({
        ok: userActivities.ok,
        status: (userActivities as any).status,
        dataOk: (userActivities as any).data?.ok,
        dataLength: (userActivities as any).data?.data?.length ?? 0,
      })
      .info("hcbGrants: userActivities response");
    if (
      !userActivities.ok ||
      !userActivities.data.ok ||
      userActivities.data.data?.length === 0
    ) {
      logger
        .with({
          ok: userActivities.ok,
          dataOk: (userActivities as any).data?.ok,
          length: (userActivities as any).data?.data?.length ?? 0,
        })
        .info("hcbGrants: no userActivities or request failed, skipping");
      return;
    }
    logger
      .with({ count: userActivities.data.data?.length })
      .info("hcbGrants: got userActivities");

    logger.info("hcbGrants: fetching HomeBox tags");
    const tags = await hb.getTags();
    logger
      .with({
        ok: tags.ok,
        status: (tags as any).status,
        count: (tags as any).data?.length ?? 0,
      })
      .info("hcbGrants: getTags response");
    if (!tags.ok || !tags.data || (tags as any).data?.length === 0) {
      logger
        .with({ ok: tags.ok, count: (tags as any).data?.length ?? 0, data: (tags as any).data })
        .info("hcbGrants: no tags or getTags failed, skipping");
      return;
    }

    let grantTag = tags.data.find((tag) => tag.name.toLowerCase() === "grant")
      ? tags.data.find((tag) => tag.name.toLowerCase() === "grant")?.id
      : "";
    logger.with({ grantTag, found: !!grantTag }).info("hcbGrants: resolved grantTag");
    if (!grantTag || grantTag.length === 0) {
      logger.info("hcbGrants: grantTag not found, creating new Grant tag");
      const creationOfTag = await hb.createTag({
        color: "#ed344f",
        descrtiption: "Tag for all HCB grants",
        icon: "https://hcb.hackclub.com/brand/hcb-icon-icon-original.png",
        name: "Grant",
        parentId: null,
      });
      logger
        .with({
          ok: creationOfTag.ok,
          status: (creationOfTag as any).status,
          data: (creationOfTag as any).data,
        })
        .info("hcbGrants: createTag response");
      if (
        !creationOfTag.ok ||
        !creationOfTag.data ||
        Object.keys((creationOfTag as any).data)?.length === 0
      ) {
        logger
          .with({ ok: creationOfTag.ok, data: (creationOfTag as any).data })
          .info("hcbGrants: createTag failed, skipping");
        return;
      }

      grantTag = creationOfTag.data.id;
      logger.with({ grantTag }).info("hcbGrants: created new grantTag");
    }
    const activities = userActivities.data.data ?? [];
    logger
      .with({ activityCount: activities.length, grantTag })
      .info("hcbGrants: querying existing grant entities from HomeBox");
    const grantEntitesRaw = await hb.queryEntities({
      tags: [grantTag],
    });
    logger
      .with({
        ok: grantEntitesRaw.ok,
        status: (grantEntitesRaw as any).status,
        count: (grantEntitesRaw as any).data?.items?.length ?? 0,
      })
      .info("hcbGrants: queryEntities response");
    if (
      !grantEntitesRaw.ok ||
      !grantEntitesRaw.data
    ) {
      logger
        .with({ ok: grantEntitesRaw.ok, data: (grantEntitesRaw as any).data })
        .info("hcbGrants: queryEntities failed, skipping");
      return;
    }
    const grantEntities = grantEntitesRaw.data.items ?? [];

    // Determine last grant date watermark (for spam reduction) but also build
    // existence set so we can resume if the job stops mid-check.
    let lastGrantDate: Date | null = null;
    let mostRecent: (typeof grantEntities)[number] | undefined;
    if (grantEntities.length > 0) {
      const sorted = [...grantEntities].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      mostRecent = sorted[0];
      if (mostRecent?.createdAt) {
        const parsed = new Date(mostRecent.createdAt);
        if (!isNaN(parsed.getTime())) {
          lastGrantDate = parsed;
        }
      }
      logger
        .with({
          grantEntitiesCount: grantEntities.length,
          lastGrantDate: lastGrantDate?.toISOString() ?? null,
          lastEntityName: mostRecent?.name,
          lastEntityCreatedAt: mostRecent?.createdAt,
        })
        .info("hcbGrants: determined lastGrantDate watermark");
    } else {
      logger.info("hcbGrants: no existing grant entities, no watermark will be applied");
    }

    // Build dedup set from already-created HomeBox entities.
    // Entity name is `${activityId} - ${cardId} - ${memo}`, so split on " - ".
    const existingActivityIds = new Set<string>();
    const existingCardIds = new Set<string>();
    for (const g of grantEntities) {
      const parts = g.name.split(" - ");
      if (parts[0]) existingActivityIds.add(parts[0].trim());
      if (parts[1]) existingCardIds.add(parts[1].trim());
    }

    // Filter to only activities not yet in HomeBox - this is the source of
    // truth for resume. Date watermark is only for logging / optional spam
    // reduction; we MUST NOT drop missing activities that are older than
    // lastGrantDate or we will lose work when the job stops mid-loop.
    let filteredByKey = 0;
    let filteredByExisting = 0;
    let filteredByDateIfStrict = 0;
    let candidates = activities.filter((a: any) => {
      if (a.key !== "raw_pending_stripe_transaction.create" || !a.id) {
        filteredByKey++;
        return false;
      }
      if (existingActivityIds.has(a.id)) {
        filteredByExisting++;
        return false;
      }
      // Fallback substring check for legacy entities where name may not split cleanly
      const stillExists = grantEntities.some(
        (g) => g.name.includes(a.id) || (a.id && g.name.includes(a.id)),
      );
      if (stillExists) {
        filteredByExisting++;
        return false;
      }
      return true;
    });

    // Log how many would have been dropped by strict date filter - but keep them!
    if (lastGrantDate) {
      filteredByDateIfStrict = candidates.filter((a: any) => {
        if (!a.created_at) return false;
        const d = new Date(a.created_at);
        return !isNaN(d.getTime()) && d <= lastGrantDate!;
      }).length;
      if (filteredByDateIfStrict > 0) {
        logger
          .with({
            filteredByDateIfStrict,
            lastGrantDate: lastGrantDate.toISOString(),
            totalCandidates: candidates.length,
          })
          .info(
            `hcbGrants: ${filteredByDateIfStrict} candidates are older than lastGrantDate but are missing in HomeBox - will still process to recover from mid-run stop`,
          );
      }
    }

    // Sort oldest first so we fill gaps in order and watermark advances predictably
    let filteredActivities = [...candidates].sort((a: any, b: any) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return da - db;
    });

    logger
      .with({
        total: activities.length,
        filteredByKey,
        filteredByExisting,
        filteredByDateIfStrict,
        remaining: filteredActivities.length,
        lastGrantDate: lastGrantDate?.toISOString() ?? null,
      })
      .info("hcbGrants: filtered activities (dedup + resume-aware)");

    if (filteredActivities.length === 0) {
      logger
        .with({ total: activities.length, filteredByKey, filteredByExisting, lastGrantDate: lastGrantDate?.toISOString() ?? null })
        .info("hcbGrants: no new activities since last grant, skipping HCB fetches");
      return;
    }

    logger
      .with({ grantEntitiesCount: grantEntities.length, activitiesCount: filteredActivities.length, totalActivities: activities.length })
      .info("hcbGrants: starting activity loop for new activities");
    let skippedByKey = 0;
    let processed = 0;
    let created = 0;
    for (const activity of filteredActivities) {
      logger
        .with({ activityId: activity.id, key: (activity as any).key, created_at: (activity as any).created_at })
        .debug("hcbGrants: processing activity");
      if (
        activity.key !== "raw_pending_stripe_transaction.create" ||
        !activity.id
      ) {
        skippedByKey++;
        logger
          .with({ activityId: activity.id, key: (activity as any).key, skippedByKey })
          .debug("hcbGrants: skipping activity - key mismatch or missing id");
        continue;
      }
      // Pre-fetch dedup: if already in HomeBox, skip HCB calls entirely
      // (handles resume after mid-run stop)
      if (existingActivityIds.has(activity.id)) {
        logger
          .with({ activityId: activity.id })
          .debug("hcbGrants: skipping - already in existingActivityIds set (pre-fetch)");
        continue;
      }
      logger
        .with({ activityId: activity.id })
        .debug("hcbGrants: fetching activityData from HCB");
      let activityData = await hcb.activity({
        activity_id: activity.id ?? "",
      });

      logger
        .with({
          activityId: activity.id,
          ok: (activityData as any)?.ok,
          status: (activityData as any)?.status,
          hasTransaction: !!(activityData as any)?.data?.transaction,
        })
        .debug("hcbGrants: activityData response");

      if (!activityData || !activityData.ok || !activityData.status) {
        console.log(activityData, activity.id)
        logger
          .with({ activityData, activityId: activity.id })
          .error("Unexpected activity data response");
        return;
      }

      if (activityData.status === 408) {
        logger.with({ activityId: activity.id, status: 408 }).debug("hcbGrants: activityData timed out (408), skipping");
        continue;
      }
      if (activityData.status === 429) {
        logger.with({ activityId: activity.id }).info("hcbGrants: activityData ratelimited (429), entering retry loop");
        while (activityData.status === 429) {
          logger.info("Activity Data by HCB ratelimited");

          const waitMs = 2000 + Math.floor(Math.random() * 1000);
          await new Promise((res) => setTimeout(res, waitMs));
          activityData = await hcb.activity({ activity_id: activity.id ?? "" });
          logger.with({ activityId: activity.id, status: (activityData as any).status }).debug("hcbGrants: retry activityData response");
        }
      }

      logger
        .with({
          activityId: activity.id,
          amount_cents: (activityData as any).data?.transaction?.amount_cents,
          hasCardCharge: !!(activityData as any).data?.transaction?.card_charge,
          ok: activityData.ok,
        })
        .debug("hcbGrants: checking transaction amount_cents and card_charge");
      if (
        activityData.ok &&
        activityData.data.transaction?.amount_cents &&
        (activityData.data.transaction?.amount_cents ?? 0) < 0
      ) {
        if (!activityData.data.transaction?.card_charge) {
          logger.with({ activityId: activity.id }).debug("hcbGrants: skipping - no card_charge on transaction");
          continue;
        }
        logger
          .with({
            activityId: activity.id,
            cardChargeId: activityData.data.transaction?.card_charge.id,
          })
          .debug("hcbGrants: fetching cardCharge");
        let cardCharge = await hcb.cardCharge({
          card_charge_id: activityData.data.transaction?.card_charge.id,
        });
        logger
          .with({
            activityId: activity.id,
            ok: (cardCharge as any).ok,
            status: (cardCharge as any).status,
            cardId: (cardCharge as any)?.data?.card?.id,
          })
          .debug("hcbGrants: cardCharge response");

        if (cardCharge.status === 408) {
          logger.with({ activityId: activity.id, status: 408 }).debug("hcbGrants: cardCharge timed out (408), skipping");
          continue;
        }
        if (cardCharge.status === 429) {
          logger.with({ activityId: activity.id }).info("hcbGrants: cardCharge ratelimited (429), entering retry loop");
          while (cardCharge.status === 429) {
            logger.info("Card charge ratelimited");
            const waitMs = 2000 + Math.floor(Math.random() * 1000);
            await new Promise((res) => setTimeout(res, waitMs));
            cardCharge = await hcb.cardCharge({
              card_charge_id: activityData.data.transaction?.card_charge.id,
            });
            logger.with({ activityId: activity.id, status: (cardCharge as any).status }).debug("hcbGrants: retry cardCharge response");
          }
        }

        if (cardCharge.ok) {
          const existing = grantEntities.find(
            (g) =>
              g.name.includes(activity.id ?? crypto.randomUUID()) ||
              g.name.includes(cardCharge.data.card.id ?? crypto.randomUUID()),
          );
          if (existing) {
            logger
              .with({ activityId: activity.id, existingName: existing.name, cardId: cardCharge.data.card.id })
              .debug("hcbGrants: skipping - grant entity already exists");
            continue;
          }
          logger.with({ activityId: activity.id, cardId: cardCharge.data.card.id }).debug("hcbGrants: no existing entity, creating new entity");
          const rawEntityName = `${activity.id} - ${cardCharge.data.card.id} - ${activityData.data.transaction.memo ?? ""}`;
          const entityName = rawEntityName.length > 255 ? rawEntityName.slice(0, 255) : rawEntityName;
          if (rawEntityName.length > 255) {
            logger
              .with({
                activityId: activity.id,
                rawLength: rawEntityName.length,
                truncatedLength: entityName.length,
                rawName: rawEntityName,
              })
              .info(`hcbGrants: truncating entity name from ${rawEntityName.length} to 255 chars`);
          }
          const entityDescription = `HCB Grant of ${activity.id}`.slice(0, 1000);
          const creationParams = {
            description: entityDescription,
            entityTypeId: process.env["HOMEBOX_ENTITY_TYPE_ID"] as string,
            name: entityName,
            quantity: 1,
            tagIds: [grantTag],
          };
          logger
            .with({
              activityId: activity.id,
              entityName,
              entityDescription,
              nameLength: entityName.length,
              entityTypeId: creationParams.entityTypeId,
              grantTag,
            })
            .debug("hcbGrants: createEntity params");
          const creationOfEntity = await hb.createEntity(creationParams);
          const createMsgStr =
            typeof (creationOfEntity as any).msg === "string"
              ? (creationOfEntity as any).msg
              : JSON.stringify((creationOfEntity as any).msg);
          logger
            .with({
              activityId: activity.id,
              ok: creationOfEntity.ok,
              status: (creationOfEntity as any).status,
              entityId: (creationOfEntity as any).data?.id,
              msg: (creationOfEntity as any).msg,
              msgStr: createMsgStr,
            })
            .debug("hcbGrants: createEntity response");
          if (
            !creationOfEntity.ok ||
            !creationOfEntity.data ||
            Object.keys(creationOfEntity.data)?.length === 0
          ) {
            logger.error(
              `hcbGrants: createEntity failed activityId=${activity.id} status=${(creationOfEntity as any).status} msg=${createMsgStr} ok=${creationOfEntity.ok} nameLen=${entityName.length} entityTypeId=${creationParams.entityTypeId} grantTag=${grantTag}`,
            );
            logger
              .with({
                activityId: activity.id,
                ok: creationOfEntity.ok,
                status: (creationOfEntity as any).status,
                msg: (creationOfEntity as any).msg,
                msgStr: createMsgStr,
                entityName,
                entityParams: creationParams,
                memo: activityData.data.transaction.memo,
                amount_cents: activityData.data.transaction.amount_cents,
              })
              .error("hcbGrants: createEntity failed details");
            continue;
          }

          logger.with({ activityId: activity.id, entityId: creationOfEntity.data.id }).debug("hcbGrants: updating entity with purchasePrice and tags");
          const updateTheEntity = await hb.updateEntity(
            {
              id: creationOfEntity.data.id,
            },
            {
              name: entityName,
              tagIds: [grantTag],
              quantity: 1,
              purchasePrice:
                Math.abs(activityData.data.transaction.amount_cents) / 100,
            },
          );
          const updateMsgStr =
            typeof (updateTheEntity as any).msg === "string"
              ? (updateTheEntity as any).msg
              : JSON.stringify((updateTheEntity as any).msg);
          logger
            .with({
              activityId: activity.id,
              entityId: creationOfEntity.data.id,
              ok: updateTheEntity.ok,
              status: (updateTheEntity as any).status,
              msg: (updateTheEntity as any).msg,
              msgStr: updateMsgStr,
            })
            .debug("hcbGrants: updateEntity response");

          if (
            !updateTheEntity.ok ||
            !updateTheEntity.data ||
            Object.keys(updateTheEntity.data)?.length === 0
          ) {
            logger.error(
              `hcbGrants: updateEntity failed activityId=${activity.id} entityId=${creationOfEntity.data.id} status=${(updateTheEntity as any).status} msg=${updateMsgStr} ok=${updateTheEntity.ok}`,
            );
            logger
              .with({
                activityId: activity.id,
                entityId: creationOfEntity.data.id,
                ok: updateTheEntity.ok,
                status: (updateTheEntity as any).status,
                msg: (updateTheEntity as any).msg,
                msgStr: updateMsgStr,
                entityName,
              })
              .error("hcbGrants: updateEntity failed details");
            continue;
          }
          created++;
          // Update dedup sets so later duplicates in same run are skipped
          existingActivityIds.add(activity.id);
          if (cardCharge.data.card.id) existingCardIds.add(cardCharge.data.card.id);
          logger
            .with({
              activityId: activity.id,
              memo: activityData.data.transaction.memo,
              entityId: creationOfEntity.data.id,
              created,
            })
            .info("Created new entity of a HCB grant transaction");
          continue;
        } else {
          logger
            .with({
              activityId: activity.id,
              ok: cardCharge.ok,
              status: (cardCharge as any).status,
            })
            .debug("hcbGrants: cardCharge not ok, skipping");
        }
      } else {
        logger
          .with({
            activityId: activity.id,
            amount_cents: (activityData as any).data?.transaction?.amount_cents,
            ok: activityData.ok,
          })
          .debug("hcbGrants: skipping - transaction not negative or missing amount_cents");
      }
      processed++;
    }
    logger
      .with({ total: activities.length, filtered: filteredActivities.length, processed, skippedByKey, created, grantEntitiesCount: grantEntities.length, lastGrantDate: lastGrantDate?.toISOString() ?? null })
      .info("hcbGrants: finished processing activities");
  },
};
