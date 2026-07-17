import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from "axios";
import type { ZodType } from "zod";
import { z } from "zod";
import { ZTypes } from "./types.ts"
import type { logger as LogTape } from "@/index";

export default class HCBScan {
  public lastCode: number = 200;
  private fetch: AxiosInstance;
  private logger: typeof LogTape;
  private ready: Promise<void>;
  constructor(logtape: typeof LogTape) {
    this.fetch = axios.create({
      baseURL: "https://hcbscan.3kh0.net/api/v1",
      timeout: 10000
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
   * Returns a paginated activity feed for a specific user.
   * @param {string} param.id - ID of the user you want the activities from
   * @param {number} query.page - Number of what page you want to look at
   * @param {number} query.per_page - Limit of items per page
   * 
   */
  public async activities(param: z.infer<typeof ZTypes["GetUserActivitiesParams"]>, query?: z.infer<typeof ZTypes["GetUserActivitiesQueryParams"]>) {
    return this.req({
      method: "GET",
      url: "/users/" + param.id + "/activities",
      params: query
    }, ZTypes["GetUserActivitiesResponse"])
  }
}