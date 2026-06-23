import { proxyActivities } from "@temporalio/workflow";

// Types for activities that live in other services (Go)
export interface PaymentActivities {
  ProcessPayment(orderId: string): Promise<void>;
  RefundPayment(orderId: string): Promise<void>;
}

export interface ShippingActivities {
  ShipOrder(orderId: string): Promise<void>;
}

export interface NotificationActivities {
  NotifyCustomer(orderId: string, message: string): Promise<void>;
}

// Types for local activities
import type * as OrderActivities from "./activities.js";

const { updateOrderStatus } = proxyActivities<typeof OrderActivities>({
  startToCloseTimeout: "10 seconds",
});

const payment = proxyActivities<PaymentActivities>({
  startToCloseTimeout: "1 minute",
  retry: { maximumAttempts: 3 },
});

const shipping = proxyActivities<ShippingActivities>({
  startToCloseTimeout: "1 minute",
});

const notification = proxyActivities<NotificationActivities>({
  startToCloseTimeout: "10 seconds",
});

export async function OrderSagaWorkflow(orderId: string): Promise<void> {
  let paymentProcessed = false;
  let shippingProcessed = false;

  try {
    // Step 1: Process Payment
    await payment.ProcessPayment(orderId);
    paymentProcessed = true;
    await updateOrderStatus(orderId, "PAID");

    // Step 2: Ship Order
    await shipping.ShipOrder(orderId);
    shippingProcessed = true;
    await updateOrderStatus(orderId, "SHIPPED");

    // Step 3: Notify Customer (Success)
    await notification.NotifyCustomer(orderId, "Your order has been shipped successfully.");
  } catch (err) {
    // Compensation Logic
    if (shippingProcessed) {
      // In a real scenario, returning a shipped order is complex.
      // For this lab, if shipping fails, we refund.
    }

    if (paymentProcessed) {
      await payment.RefundPayment(orderId);
    }

    await updateOrderStatus(orderId, "CANCELED");
    await notification.NotifyCustomer(orderId, "Your order was canceled and refunded.");

    throw err; // Rethrow to mark workflow as failed, or return to mark as success with compensation.
  }
}
