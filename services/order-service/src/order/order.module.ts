import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { RabbitOrderPublisher } from "../infra/messaging/rabbitmq.publisher.js";
import { InMemoryOrdersRepository } from "./order.repository.js";
import { createOrderRouteSchema, getOrderRouteSchema } from "./order.schemas.js";
import { OrdersService } from "./order.service.js";

export const OrderModule: FastifyPluginAsync = async app => {
  const repository = new InMemoryOrdersRepository();
  const publisher = new RabbitOrderPublisher(app.rabbit);
  const service = new OrdersService(repository, publisher);

  const api = app.withTypeProvider<ZodTypeProvider>();

  api.addHook("onClose", async () => await publisher.close());

  api.post("/", { schema: createOrderRouteSchema }, async (request, reply) => {
    const order = await service.create(request.body);
    return reply.status(202).send({ orderId: order.id, status: order.status });
  });

  api.get("/:id", { schema: getOrderRouteSchema }, async (request, reply) => {
    const order = await service.getById(request.params.id);
    return reply.status(200).send(order);
  });
};
