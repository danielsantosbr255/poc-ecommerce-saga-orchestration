import type { FastifySchema } from "fastify";
import { z } from "zod/v4";

// ── Shared primitives ──────────────────────────────────────────────

export const orderStatuses = z.enum(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELED"]);

export const orderItemSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().int().positive(),
});

// ── Entity schema (single source of truth) ─────────────────────────

export const orderSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid(),
  items: z.array(orderItemSchema),
  totalAmount: z.number().int().positive(),
  status: orderStatuses,
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ── Route schemas ──────────────────────────────────────────────────

export const createOrderItemSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().positive(),
});

export const createOrderBodySchema = z.object({
  customerId: z.uuid(),
  items: z.array(createOrderItemSchema).min(1),
});

export const createOrderResponseSchema = z.object({
  orderId: z.uuid(),
  status: orderStatuses,
});

export const createOrderHeadersSchema = z.object({
  "x-idempotency-key": z.string().uuid(),
});

export const orderParamsSchema = z.object({
  id: z.uuid(),
});

export const apiErrorSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
});

// ── Route Configurations ───────────────────────────────────────────

export const createOrderRouteSchema = {
  tags: ["orders"],
  summary: "Create a new order",
  description: "Creates a new order with the provided items and customer ID.",
  headers: createOrderHeadersSchema,
  body: createOrderBodySchema,
  response: {
    201: createOrderResponseSchema,
    200: createOrderResponseSchema,
    400: apiErrorSchema,
  },
} satisfies FastifySchema;

export const getOrderRouteSchema = {
  tags: ["orders"],
  summary: "Get an order by ID",
  description: "Retrieves an order's details by its unique identifier.",
  params: orderParamsSchema,
  response: {
    200: orderSchema,
    404: apiErrorSchema,
  },
} satisfies FastifySchema;

// ── Inferred types ─────────────────────────────────────────────────

export type OrderData = z.infer<typeof orderSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type OrderStatus = z.infer<typeof orderStatuses>;
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;
export type CreateOrderHeaders = z.infer<typeof createOrderHeadersSchema>;
export type CreateOrderResponse = z.infer<typeof createOrderResponseSchema>;
export type OrderParams = z.infer<typeof orderParamsSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;
