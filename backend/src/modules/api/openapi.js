/**
 * OpenAPI 3.1 document, generated from the resource registry.
 *
 * Generating it (rather than hand-maintaining a spec file) means the published
 * contract can never drift from what the API actually accepts — both read from
 * the same registry.
 */
import { RESOURCES, SCOPES, SCOPE_LABELS, eventTypes } from "./api.resources.js";

const TYPE_MAP = {
  string: { type: "string" },
  number: { type: "number" },
  boolean: { type: "boolean" },
  date: { type: "string", format: "date-time" },
  datestr: { type: "string", format: "date" },
};

const schemaFor = (resource, { writable = false } = {}) => {
  const properties = {};
  const required = [];
  for (const [key, meta] of Object.entries(resource.fields)) {
    if (writable && !meta.writable) continue;
    properties[key] = { ...TYPE_MAP[meta.type] };
    if (meta.enum) properties[key].enum = meta.enum;
    if (meta.readonly) properties[key].readOnly = true;
    if (writable && meta.required) required.push(key);
  }
  return { type: "object", properties, ...(required.length ? { required } : {}) };
};

const errorResponse = (description) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: { code: { type: "string" }, message: { type: "string" } },
          },
        },
      },
    },
  },
});

export function buildOpenApi(baseUrl = "/api/v1") {
  const paths = {};

  for (const resource of Object.values(RESOURCES)) {
    const tag = resource.name;
    const ref = `#/components/schemas/${resource.name}`;
    const collection = `${baseUrl}/${resource.id}`;
    const item = `${collection}/{id}`;

    paths[collection] = {
      get: {
        tags: [tag],
        summary: `List ${resource.id}`,
        security: [{ apiToken: [`${resource.scope}:read`] }],
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 200 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          { name: "sort", in: "query", description: "Field name; prefix with - for descending.", schema: { type: "string" } },
          { name: "created_after", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "created_before", in: "query", schema: { type: "string", format: "date-time" } },
          ...(resource.filterable || []).map((key) => ({
            name: key, in: "query",
            description: "Exact match; comma-separate for an OR match.",
            schema: { type: "string" },
          })),
        ],
        responses: {
          200: {
            description: "A paged list.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    object: { type: "string", enum: ["list"] },
                    data: { type: "array", items: { $ref: ref } },
                    total: { type: "integer" },
                    limit: { type: "integer" },
                    offset: { type: "integer" },
                    has_more: { type: "boolean" },
                  },
                },
              },
            },
          },
          401: errorResponse("Missing or invalid API token."),
          403: errorResponse("Token lacks the required scope."),
          429: errorResponse("Rate limited."),
        },
      },
    };

    paths[item] = {
      get: {
        tags: [tag],
        summary: `Retrieve a ${resource.name}`,
        security: [{ apiToken: [`${resource.scope}:read`] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "The record.", content: { "application/json": { schema: { $ref: ref } } } },
          404: errorResponse("No such record."),
        },
      },
    };

    if (!resource.readOnly) {
      paths[collection].post = {
        tags: [tag],
        summary: `Create a ${resource.name}`,
        security: [{ apiToken: [`${resource.scope}:write`] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: schemaFor(resource, { writable: true }) } },
        },
        responses: {
          201: { description: "Created.", content: { "application/json": { schema: { $ref: ref } } } },
          400: errorResponse("Validation failed."),
          409: errorResponse("Conflicts with an existing record."),
        },
      };
      paths[item].patch = {
        tags: [tag],
        summary: `Update a ${resource.name}`,
        security: [{ apiToken: [`${resource.scope}:write`] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: schemaFor(resource, { writable: true }) } },
        },
        responses: {
          200: { description: "Updated.", content: { "application/json": { schema: { $ref: ref } } } },
          404: errorResponse("No such record."),
        },
      };
      paths[item].delete = {
        tags: [tag],
        summary: `Delete a ${resource.name}`,
        security: [{ apiToken: [`${resource.scope}:write`] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Deleted." },
          404: errorResponse("No such record."),
        },
      };
    }
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "ExecUI API",
      version: "1.0.0",
      description:
        "Read and write your ExecUI data from any system.\n\n" +
        "Authenticate with an API token: `Authorization: Bearer execui_live_…`. " +
        "Create tokens in Account → Developer. Tokens are scoped, so a read-only " +
        "integration can never write.\n\n" +
        "Subscribe to outbound webhooks to be notified when records change — " +
        "each callback is HMAC-signed so you can verify it came from ExecUI.",
    },
    servers: [{ url: baseUrl }],
    security: [{ apiToken: [] }],
    paths,
    components: {
      securitySchemes: {
        apiToken: {
          type: "http",
          scheme: "bearer",
          description: "An ExecUI API token (`execui_live_…`).",
        },
      },
      schemas: Object.fromEntries(Object.values(RESOURCES).map((r) => [r.name, schemaFor(r)])),
    },
    tags: Object.values(RESOURCES).map((r) => ({ name: r.name })),
    "x-scopes": SCOPES.map((s) => ({ scope: s, description: SCOPE_LABELS[s] })),
    "x-webhook-events": eventTypes(),
  };
}
