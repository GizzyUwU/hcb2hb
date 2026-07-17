import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from "axios";
import type { ZodType } from "zod";
import { z } from "zod";
import { ZTypes } from "./types.ts"
import type { logger as LogTape } from "@/index";

export default class HCB {
  public lastCode: number = 200;
  private fetch: AxiosInstance;
  private logger: typeof LogTape;
  private ready: Promise<void>;
  constructor(logtape: typeof LogTape) {
    this.fetch = axios.create({
      baseURL: "https://hcb.hackclub.com/api/v3",
      timeout: 10000,
    });
    this.logger = logtape;
    this.ready = Promise.resolve();
  }

  private async req<S extends ZodType<any, any, any>>(config: AxiosRequestConfig, schema: S): Promise<AxiosResponse | {
    ok: false; status: number | null; msg: string | unknown;
  }> {
    await this.ready;
    try {
      const res = await this.fetch.request(config);
      this.lastCode = res.status ?? 0;
      try {
        return {
          ...res,
          data: schema.parse(res.data)
        }
      } catch (err) {
        if (err instanceof z.ZodError) {
          const ctx = this.logger.with({
            schemaDesc: schema.description,
            err: err.issues
          })
          ctx.error(`Zod validation error on HCB ${config.url}`)
          return {
            ok: false,
            status: res.status,
            msg: err.issues
          }
        } else {
          const ctx = this.logger.with({
            err
          })
          ctx.error(`Unknown parsing error on HCB ${config.url}`)
          return {
            ok: false,
            status: res.status,
            msg: err
          }
        }
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        let status = err.response?.status ?? err.status ?? null;
        if (
            (!status && err.code === "ECONNABORTED") ||
            (!status && err.message === "timeout of 10000ms exceeded")
          ) {
            status = 408;
        }
        this.lastCode = status ?? 0;
        return {
          ok: false,
          status,
          msg: err.message
        }
      } else return { ok: false, status: 0, msg: err }
    }
  }

  /**
   * Get a single activity's details from HCB
   * @param {string} param.activity_id - ID of the activity you want to look at
   * @param {string} query.expand - Object types to expand in the API response (separated by commas)
  */
  public async activity(param: z.infer<typeof ZTypes["GetASingleActivityParams"]>, query?: z.infer<typeof ZTypes["GetASingleActivityQueryParams"]>) {
    return this.req({
      method: "GET",
      url: "/activities/" + param.activity_id,
      data: param,
      params: query
    }, ZTypes["GetASingleActivityResponse"])
  }
}