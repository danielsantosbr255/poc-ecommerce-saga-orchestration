import type { Order } from "./order.schemas.js";
import type { IOrdersRepository } from "./order.types.js";

export class InMemoryOrdersRepository implements IOrdersRepository {
  private readonly orders = new Map<string, Order>();

  async save(order: Order): Promise<Order> {
    this.orders.set(order.id, {
      ...order,
      items: order.items.map(item => ({ ...item })),
    });

    return order;
  }

  async findById(id: string): Promise<Order | null> {
    const order = this.orders.get(id);

    if (!order) {
      return null;
    }

    return {
      ...order,
      items: order.items.map(item => ({ ...item })),
    };
  }
}
