import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "../../src/infra/database/schema.js";
import * as temporalClient from "../../src/infra/temporal/client.js";
import { OrderModule } from "../../src/order/order.module.js";
import errorHandlerPlugin from "../../src/plugins/error-handler.plugin.js";

// Mock Temporal Client and Worker to prevent connection attempts during tests
vi.mock("../../src/infra/temporal/client.js", () => ({
  initTemporalClient: vi.fn().mockResolvedValue(undefined),
  startOrderSaga: vi.fn().mockResolvedValue({ workflowId: "mock-id" }),
}));

vi.mock("../../src/infra/temporal/worker.js", () => ({
  startTemporalWorker: vi.fn().mockResolvedValue(undefined),
  stopTemporalWorker: vi.fn().mockResolvedValue(undefined),
}));

// Container image definitions for Testcontainers
const POSTGRES_IMAGE = "postgres:18-alpine";

// Helper to construct a test order payload
function buildCreateOrderPayload() {
  return {
    customerId: crypto.randomUUID(),
    items: [{ productId: crypto.randomUUID(), quantity: 1 }],
  } as const;
}

describe("OrderService E2E Integration (Testcontainers)", () => {
  let pgContainer: StartedPostgreSqlContainer;
  let pgClient: pg.Client;
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    // Spin up real database instance via Testcontainers
    pgContainer = await new PostgreSqlContainer(POSTGRES_IMAGE).start();

    // Connect real Postgres client to the container
    pgClient = new pg.Client({ connectionString: pgContainer.getConnectionUri() });
    await pgClient.connect();

    // Create the schema
    await pgClient.query(`
      CREATE TABLE orders (
        id UUID PRIMARY KEY,
        customer_id UUID NOT NULL,
        items JSONB NOT NULL,
        total_amount INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
      CREATE TABLE idempotency_keys (
        key UUID PRIMARY KEY,
        order_id UUID NOT NULL REFERENCES orders(id),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);

    const db = drizzle(pgClient, { schema });

    // Bootstrap Fastify application
    app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.register(errorHandlerPlugin);

    // Inject the database connection
    app.decorate("db", db);

    // We no longer need to register temporalPlugin explicitly here
    // because we are injecting OrderModule in a testing context, but if it is used, it's mocked.
    // In our real app, temporalPlugin is in app.ts, but here we only register OrderModule.
    // This perfectly tests the domain logic without starting Temporal infra.
    app.register(OrderModule, { prefix: "/orders" });
    await app.ready();
  });

  afterAll(async () => {
    // Teardown services in reverse order of initialization
    await app?.close();
    await pgClient?.end();
    await pgContainer?.stop();
    vi.restoreAllMocks();
  });

  it("should verify Postgres container is running and accessible", async () => {
    const result = await pgClient.query("SELECT 1 AS ready");
    expect(result.rows[0]?.ready).toBe(1);
  });

  it("should create an order via HTTP and start Temporal Saga", async () => {
    const payload = buildCreateOrderPayload();

    // Execute HTTP request using Fastify's in-memory light-my-request
    const response = await app.inject({
      method: "POST",
      url: "/orders",
      headers: {
        "x-idempotency-key": crypto.randomUUID(),
      },
      payload,
    });

    if (response.statusCode !== 201) {
      throw new Error(`Expected 201 but got ${response.statusCode}: ${response.payload}`);
    }
    expect(response.statusCode).toBe(201);

    const body = response.json() as { orderId: string; status: string };
    expect(body.orderId).toBeDefined();
    expect(body.status).toBe("PENDING");

    // Verify the Temporal Saga was triggered
    expect(temporalClient.startOrderSaga).toHaveBeenCalledWith(body.orderId, payload.customerId, 1500);
  });
});
