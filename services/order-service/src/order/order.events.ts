import { z } from "zod/v4";
import type { Order } from "./order.schemas.js";
import { orderItemSchema } from "./order.schemas.js";

export const orderPlacedEventSchema = z.object({
  eventId: z.uuid(),
  eventType: z.literal("order.placed"),
  aggregateId: z.uuid(),
  occurredAt: z.iso.datetime(),
  version: z.literal(1),
  payload: z.object({
    orderId: z.uuid(),
    customerId: z.uuid(),
    items: z.array(orderItemSchema).min(1),
  }),
});

export type OrderPlacedEvent = z.infer<typeof orderPlacedEventSchema>;

export function buildOrderPlacedEvent(order: Order): OrderPlacedEvent {
  return {
    eventId: crypto.randomUUID(),
    eventType: "order.placed",
    aggregateId: order.id,
    occurredAt: new Date().toISOString(),
    version: 1,
    payload: {
      orderId: order.id,
      customerId: order.customerId,
      items: order.items,
    },
  };
}
