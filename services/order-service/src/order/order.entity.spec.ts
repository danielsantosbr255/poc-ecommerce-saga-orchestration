import { describe, expect, it } from "vitest";
import { OrderEntity } from "../../src/order/order.entity.js";

describe("OrderEntity Idempotency", () => {
  it("markAsPaid should be idempotent", () => {
    const order = OrderEntity.create({
      customerId: "123",
      items: [{ productId: "abc", quantity: 1, unitPrice: 100 }],
    });

    // First call
    order.markAsPaid();
    expect(order.status).toBe("PAID");

    // Second call should not throw and status should remain PAID
    expect(() => order.markAsPaid()).not.toThrow();
    expect(order.status).toBe("PAID");
  });

  it("markAsShipped should be idempotent", () => {
    const order = OrderEntity.create({
      customerId: "123",
      items: [{ productId: "abc", quantity: 1, unitPrice: 100 }],
    });

    order.markAsPaid();
    order.markAsShipped();
    expect(order.status).toBe("SHIPPED");

    // Second call should not throw
    expect(() => order.markAsShipped()).not.toThrow();
    expect(order.status).toBe("SHIPPED");
  });

  it("cancel should be idempotent", () => {
    const order = OrderEntity.create({
      customerId: "123",
      items: [{ productId: "abc", quantity: 1, unitPrice: 100 }],
    });

    order.cancel();
    expect(order.status).toBe("CANCELED");

    // Second call should not throw
    expect(() => order.cancel()).not.toThrow();
    expect(order.status).toBe("CANCELED");
  });
});
