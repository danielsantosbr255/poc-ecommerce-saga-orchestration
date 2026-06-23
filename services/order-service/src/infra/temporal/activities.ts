import type { OrdersService } from "../../order/order.service.js";

// This is a bit of a hack to pass the service to activities without a DI container in Temporal Activities easily,
// but in a production setup we would use the Activity Context or a factory.
let ordersService: OrdersService;

export function initActivities(service: OrdersService) {
  ordersService = service;
}

export async function updateOrderStatus(orderId: string, status: "PAID" | "SHIPPED" | "CANCELED"): Promise<void> {
  switch (status) {
    case "PAID":
      await ordersService.processPaymentResult(orderId, "APPROVED");
      break;
    case "SHIPPED":
      await ordersService.processShippingResult(orderId, "COMPLETED");
      break;
    case "CANCELED":
      await ordersService.compensateOrder(orderId);
      break;
    default:
      throw new Error(`Unknown status: ${status}`);
  }
}
