import type { OrderPlacedEvent } from "./order.events.js";
import type { Order } from "./order.schemas.js";

export interface IOrdersRepository {
  save(order: Order): Promise<Order>;
  findById(id: string): Promise<Order | null>;
}

export interface IOrderPublisherPort {
  publishOrderPlaced(event: OrderPlacedEvent): Promise<void>;
  close(): Promise<void>;
}
