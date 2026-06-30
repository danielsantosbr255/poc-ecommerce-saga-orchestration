import { proxyActivities } from "@temporalio/workflow";
import type {
  CreateOrderActivityInput,
  NotificationActivities,
  PaymentActivities,
  ShippingActivities,
} from "./activities.interfaces.js";
import type { OrderActivities } from "./activities.js";

const orderActivities = proxyActivities<OrderActivities>({
  startToCloseTimeout: "10 seconds",
});

const payment = proxyActivities<PaymentActivities>({
  startToCloseTimeout: "1 minute",
  retry: { maximumAttempts: 3 },
  taskQueue: "payment-service-task-queue",
});

const shipping = proxyActivities<ShippingActivities>({
  startToCloseTimeout: "1 minute",
  retry: { maximumAttempts: 3 },
  taskQueue: "shipping-service-task-queue",
});

const notification = proxyActivities<NotificationActivities>({
  startToCloseTimeout: "10 seconds",
  taskQueue: "notification-service-task-queue",
});

export async function OrderSagaWorkflow(input: CreateOrderActivityInput): Promise<void> {
  let paymentProcessed = false;
  let shippingProcessed = false;

  try {
    // Step 0: Persist order in database (Temporal guarantees execution)
    await orderActivities.createOrder(input);

    // Step 1: Process Payment
    await payment.ProcessPayment(input.order.id, input.order.customerId, input.order.totalAmount);
    paymentProcessed = true;
    await orderActivities.updateOrderStatus(input.order.id, "PAID");

    // Step 2: Ship Order
    await shipping.ShipOrder(input.order.id, input.order.customerId);
    shippingProcessed = true;
    await orderActivities.updateOrderStatus(input.order.id, "SHIPPED");

    // Step 3: Notify Customer (Success)
    await notification.NotifyCustomer(input.order.id, "Your order has been shipped successfully.");
  } catch (err) {
    // Compensation Logic
    if (shippingProcessed) {
      // In a real scenario, returning a shipped order is complex.
      // For this lab, if shipping fails, we refund.
    }

    if (paymentProcessed) {
      await payment.RefundPayment(input.order.id, input.order.customerId, input.order.totalAmount);
    }

    await orderActivities.updateOrderStatus(input.order.id, "CANCELED");
    await notification.NotifyCustomer(input.order.id, "Your order was canceled and refunded.");

    throw err; // Rethrow to mark workflow as failed, or return to mark as success with compensation.
  }
}
