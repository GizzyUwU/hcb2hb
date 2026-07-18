import { z } from "zod";

export namespace ZTypes {
  /**
   * @summary Parameters for creating an entity endpoint
   * @route POST /api/v1/entities
   */
  export const PostCreateEntityParams = z.object({
    description: z.string().max(1000),
    entityTypeId: z.string(),
    manufacturer: z.string().max(255).nullish(),
    modelNumber: z.string().max(255).nullish(),
    name: z.string().min(1).max(255),
    parentId: z.string().nullish(),
    quantity: z.number().positive().min(1),
    tagIds: z.array(z.string()),
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
            "warranty",
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
          icon: z.string().nullish(),
          id: z.string(),
          isLocation: z.boolean(),
          name: z.string(),
          updatedAt: z.string(),
        }),
        id: z.string(),
        imageId: z.string().nullish(),
        insured: z.boolean(),
        itemCount: z.number(),
        name: z.string(),
        parent: z.unknown().nullish(), // CBA to do recursion
        purchasePrice: z.number(),
        quantity: z.number(),
        soldDate: z.string(),
        tags: z.array(
          z.object({
            color: z.string(),
            createdAt: z.string(),
            description: z.string(),
            icon: z.string().nullish(),
            id: z.string(),
            name: z.string(),
            parentId: z.string().nullish(),
            updatedAt: z.string(),
          }),
        ),
        thumbnailId: z.string().nullish(),
        updatedAt: z.string(),
      }),
    ).nullish(),
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
      }).nullish(),
      defaultTemplateId: z.string().nullish(),
      description: z.string(),
      icon: z.string().nullish(),
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
    id: z.string(),
    imageId: z.string().nullish(),
    insured: z.boolean(),
    itemCount: z.number().nullish(),
    lifetimewarranty: z.boolean().nullish(),
    manufacturer: z.string().nullish(),
    modelNumber: z.string().nullish(),
    name: z.string(),
    notes: z.string(),
    parent: z.unknown().nullish(), // CBA to do recursion
    purchaseDate: z.string(),
    purchaseFrom: z.string(),
    purchasePrice: z.number(),
    quantity: z.number(),
    serialNumber: z.string(),
    soldDate: z.string(),
    soldNotes: z.string(),
    soldPrice: z.number().nullish(),
    soldTo: z.string(),
    syncChildEntityLocations: z.boolean(),
    tags: z.array(
      z.object({
        color: z.string(),
        createdAt: z.string(),
        description: z.string(),
        icon: z.string().nullish(),
        id: z.string(),
        name: z.string(),
        parentId: z.string().nullish(),
        updatedAt: z.string(),
      }),
    ),
    thumbnailId: z.string().nullish(),
    totalPrice: z.number().nullish(),
    updatedAt: z.string(),
    warrantyDetails: z.string().nullish(),
    warrantyExpires: z.string().nullish(),
  }).describe("PostCreateEntityResponse");


  export const PutUpdateEntityPathParams = z.object({
    id: z.string()
  })
  /**
   * @summary Parameters for updating an entity
   * @route PUT /api/v1/entities
   */
  export const PutUpdateEntityParams = z.object({
    archived: z.boolean().nullish(),
    assetId: z.string().nullish(),
    description: z.string().max(1000).nullish(),
    entityTypeId: z.string().nullish(),
    fields: z.array(z.object({
      booleanValue: z.boolean().nullish(),
      id: z.string(),
      name: z.string().nullish(),
      numberValue: z.number().nullish(),
      textValue: z.string().nullish(),
      type: z.string()
    })).nullish(),
    id: z.string().nullish(),
    manufacturer: z.string().nullish(),
    modelNumber: z.string().nullish(),
    name: z.string().min(1).max(255),
    notes: z.string().nullish(),
    parentId: z.string().nullish(),
    purchaseDate: z.string().nullish(),
    purchaseFrom: z.string().max(255).nullish(),
    purchasePrice: z.number().nullish(),
    quantity: z.number().nullish(),
    serialNumber: z.string().nullish(),
    soldDate: z.string().nullish(),
    soldPrice: z.number().nullish(),
    syncChildEntityLocations: z.boolean().nullish(),
    tagIds: z.array(z.string()).nullish(),
    warrantyDetails: z.string().nullish(),
    warrantyExpires: z.string().nullish(),
  })

  /**
   * @summary Response for updating an entity endpoint
   * @route PUT /api/v1/entities
   * @response 200
   */
  export const PutUpdateEntityResponse = z.object({
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
            "warranty",
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
          icon: z.string().nullish(),
          id: z.string(),
          isLocation: z.boolean(),
          name: z.string(),
          updatedAt: z.string(),
        }),
        id: z.string(),
        imageId: z.string().nullish(),
        insured: z.boolean(),
        itemCount: z.number(),
        name: z.string(),
        parent: z.unknown().nullish(), // CBA to do recursion
        purchasePrice: z.number(),
        quantity: z.number(),
        soldDate: z.string(),
        tags: z.array(
          z.object({
            color: z.string(),
            createdAt: z.string(),
            description: z.string(),
            icon: z.string().nullish(),
            id: z.string(),
            name: z.string(),
            parentId: z.string().nullish(),
            updatedAt: z.string(),
          }),
        ),
        thumbnailId: z.string().nullish(),
        updatedAt: z.string(),
      }),
    ).nullish(),
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
      }).nullish(),
      defaultTemplateId: z.string().nullish(),
      description: z.string(),
      icon: z.string().nullish(),
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
    imageId: z.string().nullish(),
    insured: z.boolean(),
    itemCount: z.number().nullish(),
    lifetimewarranty: z.boolean().nullish(),
    manufacturer: z.string().nullish(),
    modelNumber: z.string().nullish(),
    name: z.string(),
    notes: z.string(),
    parent: z.unknown().nullish(), // CBA to do recursion
    purchaseDate: z.string(),
    purchaseFrom: z.string(),
    purchasePrice: z.number(),
    quantity: z.number(),
    serialNumber: z.string(),
    soldDate: z.string(),
    soldNotes: z.string(),
    soldPrice: z.number().nullish(),
    soldTo: z.string(),
    syncChildEntityLocations: z.boolean(),
    tags: z.array(
      z.object({
        color: z.string(),
        createdAt: z.string(),
        description: z.string(),
        icon: z.string().nullish(),
        id: z.string(),
        name: z.string(),
        parentId: z.string().nullish(),
        updatedAt: z.string(),
      }),
    ),
    thumbnailId: z.string().nullish(),
    totalPrice: z.number().nullish(),
    updatedAt: z.string(),
    warrantyDetails: z.string().nullish(),
    warrantyExpires: z.string().nullish(),
  }).describe("PutUpdateEntityResponse");
  
  /**
   * @summary Query parameters for querying all entities endpoint
   * @route GET /api/v1/entities
   */
  export const QueryAllEntitiesQueryParams = z.object({
    q: z.string().optional(),
    page: z.number().positive().optional(),
    tags: z.array(z.string()).optional(),
    parentIds: z.array(z.string()).optional(),
  });

  /**
   * @summary Response of query all entites endpoint
   * @route GET /api/v1/entities
   * @response 200
   */
  export const QueryAllEntitiesResponse = z.object({
    items: z.array(z.object({
      archived: z.boolean(),
      assetId: z.string().nullish(),
      createdAt: z.string(),
      description: z.string().nullish(),
      entityType: z.object({}),
      id: z.string(),
      imageId: z.string().nullish(),
      insured: z.boolean(),
      itemCount: z.number().nullish(),
      name: z.string(),
      parent: z.unknown().nullish(), // CBA TO RECURSION TO THE PARENT
      purchasePrice: z.number().nullish(),
      quantity: z.number().nullish(),
      tags: z.array(z.object({
        color: z.string(),
        createdAt: z.string(),
        description: z.string(),
        icon: z.string().nullish(),
        id: z.string(),
        name: z.string(),
        parentId: z.string().nullish(),
        updatedAt: z.string(),
      })).nullish(),
      thumbnailId: z.string().nullish(),
      updatedAt: z.string(),
    })),
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPrice: z.number(),
  }).describe("QueryAllEntitiesResponse");
  
  /**
   * @summary Response of get all tags endpoint
   * @route GET /api/v1/tags
   * @response 200
   */
  export const GetAllTagsResponse = z.array(z.object({
    color: z.string(),
    createdAt: z.string(),
    descriptipn: z.string().nullish(),
    icon: z.string().nullish(),
    id: z.string(),
    name: z.string(),
    parentId: z.string().nullish(),
    updatedAt: z.string(),
  })).describe("GetAllTagsResponse")

  /**
   * @summary Params of create tag endpoint
   * @route POST /api/v1/tags
   */
  export const CreateTagParams = z.object({
    color: z.string(),
    descrtiption: z.string().max(1000),
    icon: z.string().max(255),
    name: z.string().min(1).max(255),
    parentId: z.string().nullish()
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
      icon: z.string().nullish(),
      id: z.string(),
      name: z.string(),
      parentId: z.string().nullish(),
      updatedAt: z.string(),
    })),
    color: z.string(),
    createdAt: z.string(),
    description: z.string(),
    icon: z.string().nullish(),
    id: z.string(),
    name: z.string(),
    parent: z.object({
      color: z.string(),
      createdAt: z.string(),
      description: z.string(),
      icon: z.string().nullish(),
      id: z.string(),
      name: z.string(),
      parentId: z.string().nullish(),
      updatedAt: z.string(),
    }).nullish(),
    parentId: z.string().nullish(),
    updatedAt: z.string(),
  }).describe("CreateTagResponse")
}
