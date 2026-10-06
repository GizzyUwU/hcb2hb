import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import type { logger as LogTape } from "@/index";
import { ZTypes } from "./types.ts";
import { z } from "zod";

export default class HomeBox {
  public lastCode: number = 200;
  private fetch: AxiosInstance;
  private logger: typeof LogTape;
  private ready: Promise<void>;
  constructor(url: string, apiKey: string, logtape: typeof LogTape) {
    this.fetch = axios.create({
      baseURL: url + "/api/v1",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 10000,
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
        const responseData = (err.response?.data as unknown) ?? null;
        const msg =
          responseData !== null && responseData !== undefined
            ? `${err.message} - ${typeof responseData === "string" ? responseData : JSON.stringify(responseData)}`
            : err.message;
        return {
          ok: false,
          status,
          msg,
        };
      } else return { ok: false, status: 0, msg: err };
    }
  }

  /**
   * Create an entity in homebox
   * @param {string} param.description - Description of the entity
   * @param {string} param.entityTypeId - Type ID of the entity
   * @param {string} param.parentId - Parent of the entity
   * @param {number} param.quantity - Quantity of the entity
   * @param {string[]} param.tagsId- Tags to set on the entity
   */
  public async createEntity(
    params: z.infer<(typeof ZTypes)["PostCreateEntityParams"]>,
  ) {
    return this.req(
      {
        method: "POST",
        url: "/entities",
        data: params,
      },
      ZTypes["PostCreateEntityResponse"],
    );
  }

  /**
   * Update an entity in homebox
   */
  public async updateEntity(
    pathParams: z.infer<(typeof ZTypes)["PutUpdateEntityPathParams"]>,
    params: z.infer<(typeof ZTypes)["PutUpdateEntityParams"]>,
  ) {
    return this.req(
      {
        method: "PUT",
        url: "/entities/" + pathParams.id,
        data: params,
      },
      ZTypes["PutUpdateEntityResponse"],
    );
  }

  /**
   * Delete an entity in homebox
   * @param {string} param.id - Id used to find and delete an entity
   */
  public async deleteEntity(
    pathParams: z.infer<(typeof ZTypes)["DeleteEntityPathParams"]>,
  ) {
    return this.req(
      {
        method: "DELETE",
        url: "/entities/" + pathParams.id,
      },
      z.unknown(),
    );
  }

  /**
   * Query all entities that exist in homebox
   * @param {string} query.q - The string used to search
   * @param {string} query.page - Page number for pagination
   * @param {string[]} query.tags - Tags to search by to find entities
   * @param {string[]} query.parentIds - IDs of the parents of entities
   */
  public async queryEntities(
    query?: z.infer<(typeof ZTypes)["QueryAllEntitiesQueryParams"]>,
  ) {
    return this.req(
      {
        method: "GET",
        url: "/entities",
        params: query,
      },
      ZTypes["QueryAllEntitiesResponse"],
    );
  }

  /**
   * Get all the tags that exist in homebox
   */
  public async getTags() {
    return this.req(
      {
        method: "GET",
        url: "/tags",
      },
      ZTypes["GetAllTagsResponse"],
    );
  }

  /**
   * Create a tag on homebox
   * @param {string} param.color - Color in HEX
   * @param {string} param.description - Description for the tag
   * @param {string} param.icon - Icon data of tag I think
   * @param {string} param.parentId - ID of the parent tag (optional)
   */
  public async createTag(params: z.infer<(typeof ZTypes)["CreateTagParams"]>) {
    return this.req(
      {
        method: "POST",
        url: "/tags",
        data: params,
      },
      ZTypes["CreateTagResponse"],
    );
  }
}
