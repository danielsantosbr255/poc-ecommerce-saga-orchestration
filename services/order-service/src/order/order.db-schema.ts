import { integer, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import type { OrderItem, OrderStatus } from "./order.schemas.js";

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey(),
  customerId: uuid("customer_id").notNull(),
  items: jsonb("items").$type<OrderItem[]>().notNull(),
  totalAmount: integer("total_amount").notNull(),
  status: varchar("status", { length: 50 }).$type<OrderStatus>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
});

export const idempotencyKeys = pgTable("idempotency_keys", {
  key: uuid("key").primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
});
