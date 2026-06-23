import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../order.db-schema.js";
import { OrderEntity } from "../order.entity.js";
import type { IOrdersRepository } from "../order.types.js";

export class DrizzleOrdersRepository implements IOrdersRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async save(order: OrderEntity): Promise<OrderEntity> {
    const data = order.toJSON();

    await this.db.transaction(async tx => {
      await tx
        .insert(schema.orders)
        .values({
          id: data.id,
          customerId: data.customerId,
          status: data.status,
          items: data.items,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        })
        .onConflictDoUpdate({
          target: schema.orders.id,
          set: {
            status: data.status,
            items: data.items,
            updatedAt: data.updatedAt,
          },
        });
    });

    return order;
  }

  async findById(id: string): Promise<OrderEntity | null> {
    const [row] = await this.db.select().from(schema.orders).where(eq(schema.orders.id, id)).limit(1);

    if (!row) return null;

    return OrderEntity.restore({
      id: row.id,
      customerId: row.customerId,
      status: row.status,
      items: row.items,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
