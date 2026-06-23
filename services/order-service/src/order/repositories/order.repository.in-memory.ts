import { OrderEntity } from "../order.entity.js";
import type { OrderData } from "../order.schemas.js";
import type { IOrdersRepository } from "../order.types.js";

export class InMemoryOrdersRepository implements IOrdersRepository {
  private readonly orders: OrderData[] = [];

  async save(order: OrderEntity): Promise<OrderEntity> {
    const existingIndex = this.orders.findIndex(o => o.id === order.id);
    if (existingIndex > -1) {
      this.orders[existingIndex] = order.toJSON();
    } else {
      this.orders.push(order.toJSON());
    }
    return order;
  }

  async findById(id: string): Promise<OrderEntity | null> {
    const data = this.orders.find(o => o.id === id);
    if (!data) return null;
    return OrderEntity.restore(data);
  }
}
