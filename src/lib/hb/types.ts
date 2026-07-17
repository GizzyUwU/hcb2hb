import { z } from "zod";

export namespace ZTypes {
  /**
   * @summary Parameters for creating an entity endpoint
   * @route POST /api/v1/entities
   */
  export const PostCreateEntityParams = z.object({
    description: z.string(),
    entityTypeId: z.string(),
    name: z.string(),
    parentId: z.string(),
    quantity: z.number().positive().min(1),
    tagsId: z.array(z.string()),
  });

  /**
   * @summary Response for creating an entity endpoint
   * @route POST /api/v1/entities
   * @response 201
   */
  export const PostCreateEntityResponse = z.object({
    archived: z.boolean(),
    assetId: z.string(),
    attachments: z.array(
      z.object({
        created_at: z.string(),
        id: z.string(),
        mimeType: z.string(),
        path: z.string(),
        primary: z.boolean(),
        thumbanil: z.object({
          created_at: z.string(),
          edges: z.unknown(), // CBA to add all ts its so huge in the docs
          id: z.string(),
          mime_type: z.string(),
          path: z.string(),
          primary: z.boolean(),
          title: z.string(),
          type: z.enum([
            "attachment",
            "photo",
            "manual",
            "warrenty",
            "receipt",
            "thumbnail",
          ]),
          updated_at: z.string(),
        }),
        title: z.string(),
        type: z.string(),
        updatedAt: z.string(),
      }),
    ),
    children: z.array(
      z.object({
        archived: z.boolean(),
        assetId: z.string(),
        createdAt: z.string(),
        description: z.string(),
        entityType: z.object({
          createdAt: z.string(),
          defaultTemplate: z.object({
            createdAt: z.string(),
            description: z.string(),
            id: z.string(),
            name: z.string(),
            updatedAt: z.string(),
          }),
          defaultTemplateId: z.string(),
          description: z.string(),
          icon: z.string(),
          id: z.string(),
          isLocation: z.boolean(),
          name: z.string(),
          updatedAt: z.string(),
        }),
        id: z.string(),
        imageId: z.string().nullable(),
        insured: z.boolean(),
        itemCount: z.number(),
        name: z.string(),
        parent: z.unknown(), // CBA to do recursion
        purchasePrice: z.number(),
        quantity: z.number(),
        soldDate: z.string(),
        tags: z.array(
          z.object({
            color: z.string(),
            createdAt: z.string(),
            description: z.string(),
            icon: z.string(),
            id: z.string(),
            name: z.string(),
            parentId: z.string().nullable(),
            updatedAt: z.string(),
          }),
        ),
        thumbnailId: z.string().nullable(),
        updatedAt: z.string(),
      }),
    ),
    createdAt: z.string(),
    description: z.string(),
    entityType: z.object({
      createdAt: z.string(),
      defaultTemplate: z.object({
        createdAt: z.string(),
        description: z.string(),
        id: z.string(),
        name: z.string(),
        updatedAt: z.string(),
      }),
      defaultTemplateId: z.string(),
      description: z.string(),
      icon: z.string(),
      id: z.string(),
      isLocation: z.boolean(),
      name: z.string(),
      updatedAt: z.string(),
    }),
    fields: z.array(
      z.object({
        booleanValue: z.boolean(),
        id: z.string(),
        name: z.string(),
        numberValue: z.number(),
        textValue: z.string(),
        type: z.string(),
      }),
    ),
    imageId: z.string(),
    insured: z.boolean(),
    itemCount: z.number(),
    lifetimeWarrenty: z.boolean(),
    manufacturer: z.string(),
    modelNumber: z.string(),
    name: z.string(),
    notes: z.string(),
    parent: z.unknown(), // CBA to do recursion
    purchaseDate: z.string(),
    purchaseFrom: z.string(),
    purchasePrice: z.number(),
    quantity: z.number(),
    serialNumber: z.string(),
    soldDate: z.string(),
    soldNotes: z.string(),
    soldPrice: z.string(),
    soldTo: z.string(),
    syncChildEntityLocations: z.boolean(),
    tags: z.array(
      z.object({
        color: z.string(),
        createdAt: z.string(),
        description: z.string(),
        icon: z.string(),
        id: z.string(),
        name: z.string(),
        parentId: z.string().nullable(),
        updatedAt: z.string(),
      }),
    ),
    thumbnailId: z.string().nullable(),
    totalPrice: z.number(),
    updatedAt: z.string(),
    warrentyDetails: z.string(),
    warrentyExpires: z.string(),
  });

  /**
   * @summary Query parameters for querying all entities endpoint
   * @route GET /api/v1/entities
   */
  export const QueryAllEntitiesQueryParams = z.object({
    q: z.string(),
    page: z.number().positive(),
    tags: z.array(z.string()),
    parentIds: z.array(z.string()),
  });

  /**
   * @summary Response of query all entites endpoint
   * @route GET /api/v1/entities
   * @response 200
   */
  export const QueryAllEntitiesResponse = z.object({
    items: z.array(z.object({
      archived: z.boolean(),
      assetId: z.string(),
      createdAt: z.string(),
      description: z.string(),
      entityType: z.object({}),
      id: z.string(),
      imageId: z.string().nullable(),
      insured: z.boolean(),
      itemCount: z.number(),
      name: z.string(),
      parent: z.unknown(), // CBA TO RECURSION TO THE PARENT
      purchasePrice: z.number(),
      quantity: z.number(),
      tags: z.array(z.object({
        color: z.string(),
        createdAt: z.string(),
        description: z.string(),
        icon: z.string(),
        id: z.string(),
        name: z.string(),
        parentId: z.string().nullable(),
        updatedAt: z.string(),
      })),
      thumbnailId: z.string().nullable(),
      updatedAt: z.string(),
    })),
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPrice: z.number(),
  });
  
  /**
   * @summary Response of get all tags endpoint
   * @route GET /api/v1/tags
   * @response 200
   */
  export const GetAllTagsResponse = z.array(z.object({
    color: z.string(),
    createdAt: z.string(),
    descriptipn: z.string(),
    icon: z.string(),
    id: z.string(),
    name: z.string(),
    parentId: z.string().nullable(),
    updatedAt: z.string(),
  }))

  /**
   * @summary Params of create tag endpoint
   * @route POST /api/v1/tags
   */
  export const CreateTagParams = z.object({
    color: z.string(),
    descrtiption: z.string().max(1000),
    icon: z.string().max(255),
    string: z.string().min(1).max(255),
    parentID: z.string().nullable()
  })

  /**
   * @summary Response of create a tag endpoint
   * @route POST /api/v1/tags
   * @response 201
   */
  export const CreateTagResponse = z.object({
    children: z.array(z.object({
      color: z.string(),
      createdAt: z.string(),
      description: z.string(),
      icon: z.string(),
      id: z.string(),
      name: z.string(),
      parentId: z.string().nullable(),
      updatedAt: z.string(),
    })),
    color: z.string(),
    createdAt: z.string(),
    description: z.string(),
    iicon: z.string(),
    id: z.string(),
    name: z.string(),
    parent: z.object({
      color: z.string(),
      createdAt: z.string(),
      description: z.string(),
      icon: z.string(),
      id: z.string(),
      name: z.string(),
      parentId: z.string().nullable(),
      updatedAt: z.string(),
    }),
    parentId: z.string().nullable(),
    updatedAt: z.string(),
  })
}
