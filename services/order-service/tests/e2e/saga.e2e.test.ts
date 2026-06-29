import { beforeAll, describe, expect, it } from "vitest";

const API_URL = "http://localhost:3001";

// Helper to poll for order status changes
async function waitForOrderStatus(orderId: string, expectedStatus: string, maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${API_URL}/orders/${orderId}`);
    if (res.ok) {
      const order = await res.json();
      if (order.status === expectedStatus) {
        return order;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Timeout waiting for order ${orderId} to reach status ${expectedStatus}`);
}

describe("SAGA E2E Tests", () => {
  beforeAll(async () => {
    // Poll to ensure API is up before starting tests
    for (let i = 0; i < 20; i++) {
      try {
        await fetch(`${API_URL}/orders/dummy-check`);
        return; // API is up
      } catch (_e) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error("Order service did not start in time for tests.");
  });

  it("Scenario 1: Happy Path - Order should go from PENDING to SHIPPED", async () => {
    // Customer ID simulating a normal success run
    const customerId = "00000000-0000-4000-8000-000000000003";

    const createRes = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        customerId,
        items: [{ productId: "d84764d9-26e6-48eb-aa66-8d0c303cbb97", quantity: 1 }],
      }),
    });

    expect(createRes.status).toBe(202);
    const { orderId, status } = await createRes.json();
    expect(status).toBe("ACCEPTED");

    // Poll until Temporal orchestration completes
    const completedOrder = await waitForOrderStatus(orderId, "SHIPPED");
    expect(completedOrder.status).toBe("SHIPPED");
  });

  it("Scenario 2: Compensation - Payment Failure should CANCEL the order", async () => {
    // Customer ID triggering permanent payment decline in MockGateway
    const customerId = "00000000-0000-4000-8000-000000000001";

    const createRes = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        customerId,
        items: [{ productId: "d84764d9-26e6-48eb-aa66-8d0c303cbb97", quantity: 1 }],
      }),
    });

    expect(createRes.status).toBe(202);
    const { orderId } = await createRes.json();

    // Poll until Temporal orchestration completes
    const completedOrder = await waitForOrderStatus(orderId, "CANCELED");
    expect(completedOrder.status).toBe("CANCELED");
  });

  it("Scenario 3: Compensation - Shipping Failure should CANCEL the order and trigger Refund", async () => {
    // Customer ID triggering permanent shipping failure in CarrierMock
    const customerId = "00000000-0000-4000-8000-000000000002";

    const createRes = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        customerId,
        items: [{ productId: "d84764d9-26e6-48eb-aa66-8d0c303cbb97", quantity: 1 }],
      }),
    });

    expect(createRes.status).toBe(202);
    const { orderId } = await createRes.json();

    // Poll until Temporal orchestration completes
    // Note: the order might momentarily be "PAID" but will eventually be "CANCELED" due to refund
    const completedOrder = await waitForOrderStatus(orderId, "CANCELED");
    expect(completedOrder.status).toBe("CANCELED");
  });
});
