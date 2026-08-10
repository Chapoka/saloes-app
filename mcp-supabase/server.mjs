#!/usr/bin/env node

/**
 * MCP Server para Supabase Self-Hosted via REST API
 * Usa PostgREST + Supabase Auth API com service_role key
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_SERVICE_ROLE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Prefer": "return=representation",
};

async function supabaseRequest(method, path, body) {
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const server = new Server(
  { name: "supabase-selfhosted", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "select",
      description: "Query rows from a Supabase table using PostgREST filters",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name" },
          select: { type: "string", description: "Columns to select (default: *)", default: "*" },
          filters: { type: "object", description: "Key-value filters (eq operator)", default: {} },
          limit: { type: "number", description: "Max rows to return", default: 100 },
          order: { type: "string", description: "Column to order by (prefix - for DESC)" },
        },
        required: ["table"],
      },
    },
    {
      name: "insert",
      description: "Insert one or more rows into a Supabase table",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name" },
          data: { description: "Row object or array of row objects to insert" },
        },
        required: ["table", "data"],
      },
    },
    {
      name: "update",
      description: "Update rows in a Supabase table matching filters",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name" },
          filters: { type: "object", description: "Key-value filters to match rows (eq)" },
          data: { type: "object", description: "Fields to update" },
        },
        required: ["table", "filters", "data"],
      },
    },
    {
      name: "delete",
      description: "Delete rows from a Supabase table matching filters",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name" },
          filters: { type: "object", description: "Key-value filters to match rows (eq)" },
        },
        required: ["table", "filters"],
      },
    },
    {
      name: "rpc",
      description: "Call a Supabase database function (RPC)",
      inputSchema: {
        type: "object",
        properties: {
          function_name: { type: "string", description: "Name of the Postgres function" },
          params: { type: "object", description: "Function parameters", default: {} },
        },
        required: ["function_name"],
      },
    },
    {
      name: "list_tables",
      description: "List all tables available in the public schema",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_schema",
      description: "Get column definitions for a specific table",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name" },
        },
        required: ["table"],
      },
    },
    {
      name: "list_users",
      description: "List users from Supabase Auth",
      inputSchema: {
        type: "object",
        properties: {
          page: { type: "number", default: 1 },
          per_page: { type: "number", default: 50 },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    if (name === "select") {
      const cols = args.select || "*";
      const limit = args.limit || 100;
      let path = `/rest/v1/${args.table}?select=${cols}&limit=${limit}`;
      if (args.filters) {
        for (const [k, v] of Object.entries(args.filters)) {
          path += `&${k}=eq.${v}`;
        }
      }
      if (args.order) {
        const desc = args.order.startsWith("-");
        const col = desc ? args.order.slice(1) : args.order;
        path += `&order=${col}.${desc ? "desc" : "asc"}`;
      }
      result = await supabaseRequest("GET", path);
    }

    else if (name === "insert") {
      result = await supabaseRequest("POST", `/rest/v1/${args.table}`, args.data);
    }

    else if (name === "update") {
      let path = `/rest/v1/${args.table}?`;
      for (const [k, v] of Object.entries(args.filters || {})) {
        path += `${k}=eq.${v}&`;
      }
      result = await supabaseRequest("PATCH", path.slice(0, -1), args.data);
    }

    else if (name === "delete") {
      let path = `/rest/v1/${args.table}?`;
      for (const [k, v] of Object.entries(args.filters || {})) {
        path += `${k}=eq.${v}&`;
      }
      result = await supabaseRequest("DELETE", path.slice(0, -1));
    }

    else if (name === "rpc") {
      result = await supabaseRequest("POST", `/rest/v1/rpc/${args.function_name}`, args.params || {});
    }

    else if (name === "list_tables") {
      result = await supabaseRequest(
        "GET",
        `/rest/v1/rpc/pg_catalog_tables`
      );
      // Fallback via information_schema via PostgREST introspection
      if (!result || result.error) {
        result = await supabaseRequest(
          "GET",
          `/rest/v1/?select=*`
        );
      }
    }

    else if (name === "get_schema") {
      // Use PostgREST OPTIONS to get schema
      const url = `${SUPABASE_URL}/rest/v1/${args.table}`;
      const res = await fetch(url, { method: "OPTIONS", headers });
      const text = await res.text();
      result = { schema_info: text };
    }

    else if (name === "list_users") {
      const page = args.page || 1;
      const per_page = args.per_page || 50;
      result = await supabaseRequest(
        "GET",
        `/auth/v1/admin/users?page=${page}&per_page=${per_page}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Supabase Self-Hosted MCP Server running...");
