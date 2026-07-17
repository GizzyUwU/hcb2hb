import type { logger as LogTape } from "@/index";
import HCB from "@/lib/hcb";
import HCBScan from "@/lib/hcbscan";

export default {
  name: "hcbGrants",
  execute: async ({ logger }: { logger: typeof LogTape }) => {
    if (!process.env["HCBSCAN_ID"]) return;
    const hcbScan = new HCBScan(logger)
  },
};
