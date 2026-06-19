import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { OutboxRelay } from "../infra/messaging/outbox.relay.js";
import { RabbitOrderPublisher } from "../infra/messaging/rabbitmq.publisher.js";
import { createOrderRouteSchema, getOrderRouteSchema } from "./order.schemas.js";
import { OrdersService } from "./order.service.js";
import { DrizzleOrdersRepository } from "./repositories/order.repository.drizzle.js";

export const OrderModule: FastifyPluginAsync = async app => {
  const repository = new DrizzleOrdersRepository(app.db);
  const publisher = new RabbitOrderPublisher(app.rabbit);
  const service = new OrdersService(repository);
  const outboxRelay = new OutboxRelay(app.db, publisher);

  const api = app.withTypeProvider<ZodTypeProvider>();

  api.addHook("onReady", async () => {
    outboxRelay.start();
  });

  api.addHook("onClose", async () => {
    outboxRelay.stop();
    await publisher.close();
  });

  api.post("/", { schema: createOrderRouteSchema }, async (request, reply) => {
    const order = await service.create(request.body, request.id);
    return reply.status(201).send({ orderId: order.id, status: order.status });
  });

  api.get("/:id", { schema: getOrderRouteSchema }, async (request, reply) => {
    const order = await service.getById(request.params.id);
    return reply.status(200).send(order.toJSON());
  });
};
