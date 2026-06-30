import type { IOrderRepository } from "../../../application/ports/order-repository.port.js";
import type { UpdateOrderStatusUseCase } from "../../../application/use-cases/update-order-status.use-case.js";
import { OrderEntity } from "../../../domain/entities/order.entity.js";
import type { CreateOrderActivityInput } from "./activities.interfaces.js";

export function createActivities(
  updateOrderStatusUseCase: UpdateOrderStatusUseCase,
  orderRepository: IOrderRepository,
) {
  return {
    async createOrder(input: CreateOrderActivityInput): Promise<void> {
      const order = OrderEntity.restore(input.order);
      await orderRepository.createWithIdempotency(order, input.idempotencyKey);
    },

    async updateOrderStatus(orderId: string, status: "PAID" | "SHIPPED" | "CANCELED"): Promise<void> {
      await updateOrderStatusUseCase.execute(orderId, status);
    },
  };
}

export type OrderActivities = ReturnType<typeof createActivities>;
