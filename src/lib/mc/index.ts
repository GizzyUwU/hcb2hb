import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import type { logger as LogTape } from "@/index";
import { ZTypes } from "./types.ts";
import { z } from "zod";

export default class Macondo {
  lastCode: number | null = null;
  private fetch: AxiosInstance;
  private ready: Promise<void>;
  private logger: typeof LogTape;

  constructor(apiKey: string, logtape: typeof LogTape) {
    this.fetch = axios.create({
      baseURL: "https://macondo.hackclub.com/api",
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    this.logger = logtape;
    this.ready = Promise.resolve();
  }

  private async req<T extends z.ZodType>(
    config: AxiosRequestConfig,
    schema: T,
  ): Promise<
    | (Omit<AxiosResponse, "data"> & { ok: boolean; data: z.infer<T> })
    | {
        ok: false;
        status: number | null;
        msg: string | unknown;
      }
  > {
    await this.ready;
    try {
      const res = await this.fetch.request(config);
      this.lastCode = res.status ?? 0;
      try {
        return {
          ...res,
          ok: true,
          data: schema.parse(res.data),
        };
      } catch (err) {
        if (err instanceof z.ZodError) {
          const ctx = this.logger.with({
            schemaDesc: schema.description,
            err: err.issues,
          });
          ctx.error(
            `Zod validation error on Homebox ${config.method} ${config.url} trying to validate with ${schema.description}`,
          );
          return {
            ok: false,
            status: res.status,
            msg: err.issues,
          };
        } else {
          const ctx = this.logger.with({
            err,
          });
          ctx.error(`Unknown parsing error on Homebox ${config.url} `);
          return {
            ok: false,
            status: res.status,
            msg: err,
          };
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
          msg: err.message,
        };
      } else return { ok: false, status: 0, msg: err };
    }
  }

  /**
   * Get shop orders via user who owns api key
   */
  public async orders() {
    return this.req(
      {
        method: "GET",
        url: "/shop/my-orders",
      },
      ZTypes["GetMyOrders"],
    );
  }
}
