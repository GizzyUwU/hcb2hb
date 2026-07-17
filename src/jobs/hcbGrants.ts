import type { logger as LogTape } from "@/index";
import HCB from "@/lib/hcb";
import HCBScan from "@/lib/hcbscan";

export default {
  name: "hcbGrants",
  execute: async ({ logger }: { logger: typeof LogTape }) => {
    if (!process.env["HCBSCAN_ID"]) return;
    const hcbScan = new HCBScan(logger)
    const userActivities = await hcbScan.userActivities({
      id: process.env["HCBSCAN_ID"]
    });
    if (!userActivities.ok || !userActivities.data.ok || userActivities.data.data?.length === 0) return;
    
  },
};
