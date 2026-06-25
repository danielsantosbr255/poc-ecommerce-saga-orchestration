import { describe, expect, it, vi } from "vitest";
import { OrderEntity } from "./order.entity.js";
import { OrdersService } from "./order.service.js";
import { ProductCatalogService } from "./product-catalog.service.js";
import { InMemoryOrdersRepository } from "./repositories/order.repository.in-memory.js";

vi.mock("../infra/temporal/client.js", () => ({
  startOrderSaga: vi.fn().mockResolvedValue({ workflowId: "mock-id" }),
}));

describe("OrdersService", () => {
  it("should create an order, save it, and save an outbox event", async () => {
    const fakeRepo = new InMemoryOrdersRepository();
    const fakeCatalog = new ProductCatalogService();
    // mock price
    vi.spyOn(fakeCatalog, "getProductPrice").mockResolvedValue(5000);

    const service = new OrdersService(fakeRepo, fakeCatalog);
    const input = {
      customerId: crypto.randomUUID(),
      items: [{ productId: crypto.randomUUID(), quantity: 2 }],
    };

    const idempotencyKey = crypto.randomUUID();
    const { order, isNew } = await service.create(input, idempotencyKey);

    expect(isNew).toBe(true);
    expect(order.id).toBeDefined();
    expect(order.status).toBe("PENDING");
    expect(order.customerId).toBe(input.customerId);
    expect(order.items).toEqual([{ productId: input.items[0].productId, quantity: 2, unitPrice: 5000 }]);
    expect(order.totalAmount).toBe(10000);

    const savedOrder = await fakeRepo.findById(order.id);
    expect(savedOrder).toEqual(order);
  });

  it("should return an order if found by id", async () => {
    const fakeRepo = new InMemoryOrdersRepository();
    const fakeCatalog = new ProductCatalogService();
    const order = OrderEntity.create({
      customerId: crypto.randomUUID(),
      items: [],
    });
    await fakeRepo.save(order);

    const service = new OrdersService(fakeRepo, fakeCatalog);
    const result = await service.getById(order.id);

    expect(result).toEqual(order);
  });

  it("should throw a 404 error if order is not found", async () => {
    const fakeRepo = new InMemoryOrdersRepository();
    const fakeCatalog = new ProductCatalogService();
    const service = new OrdersService(fakeRepo, fakeCatalog);

    await expect(service.getById("123")).rejects.toThrow("Order with identifier '123' was not found.");
  });
});
