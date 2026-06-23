import { jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import type { OrderItem, OrderStatus } from "./order.schemas.js";

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey(),
  customerId: uuid("customer_id").notNull(),
  items: jsonb("items").$type<OrderItem[]>().notNull(),
  status: varchar("status", { length: 50 }).$type<OrderStatus>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
});
