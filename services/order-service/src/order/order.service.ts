import { ResourceNotFoundError } from "../core/errors/app.errors.js";
import { startOrderSaga } from "../infra/temporal/client.js";
import { OrderEntity } from "./order.entity.js";
import type { CreateOrderBody } from "./order.schemas.js";
import type { IOrdersRepository } from "./order.types.js";

export class OrdersService {
  constructor(private readonly repository: IOrdersRepository) {}

  async create(input: CreateOrderBody, _correlationId?: string): Promise<OrderEntity> {
    const order = OrderEntity.create(input);

    await this.repository.save(order);
    await startOrderSaga(order.id);
    return order;
  }

  async getById(id: string): Promise<OrderEntity> {
    const order = await this.repository.findById(id);
    if (!order) throw new ResourceNotFoundError("Order", id);
    return order;
  }

  async processPaymentResult(id: string, status: "APPROVED" | "REJECTED"): Promise<OrderEntity> {
    const order = await this.getById(id);
    status === "APPROVED" ? order.markAsPaid() : order.cancel();
    return this.repository.save(order);
  }

  async processShippingResult(id: string, status: "COMPLETED" | "FAILED"): Promise<OrderEntity> {
    const order = await this.getById(id);
    status === "COMPLETED" ? order.markAsShipped() : order.cancel();
    return this.repository.save(order);
  }

  async compensateOrder(id: string): Promise<OrderEntity> {
    const order = await this.getById(id);
    order.cancel();
    return this.repository.save(order);
  }
}
