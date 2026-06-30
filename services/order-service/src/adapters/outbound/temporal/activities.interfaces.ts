import type { OrderSnapshot } from "../../../domain/entities/order.entity.js";

export interface PaymentActivities {
  ProcessPayment(orderId: string, customerId: string, amount: number): Promise<void>;
  RefundPayment(orderId: string, customerId: string, amount: number): Promise<void>;
}

export interface ShippingActivities {
  ShipOrder(orderId: string, customerId: string): Promise<void>;
}

export interface NotificationActivities {
  NotifyCustomer(orderId: string, message: string): Promise<void>;
}

export interface CreateOrderActivityInput {
  order: OrderSnapshot;
  idempotencyKey: string;
}
