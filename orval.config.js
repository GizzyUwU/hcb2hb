import { defineConfig } from "orval";

export default defineConfig({
  hcbscan: {
    output: {
      client: "zod",
      mode: "single",
      target: "./src/lib/hcbscan/types.ts",
    },
    input: {
      target: "./specs/hcbscan.yaml",
    },
  },
  hcb: {
    output: {
      client: "zod",
      mode: "single",
      target: "./src/lib/hcb/types.ts",
    },
    input: {
      target: "./specs/hcb.json",
    },
  },
});