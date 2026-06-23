import type { OrderEntity } from "./order.entity.js";

export interface IOrdersRepository {
  save(order: OrderEntity): Promise<OrderEntity>;
  findById(id: string): Promise<OrderEntity | null>;
}
