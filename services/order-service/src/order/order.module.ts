import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { initActivities } from "../infra/temporal/activities.js";
import { createOrderRouteSchema, getOrderRouteSchema } from "./order.schemas.js";
import { OrdersService } from "./order.service.js";
import { DrizzleOrdersRepository } from "./repositories/order.repository.drizzle.js";

export const OrderModule: FastifyPluginAsync = async app => {
  const repository = new DrizzleOrdersRepository(app.db);
  const service = new OrdersService(repository);

  initActivities(service);
  const api = app.withTypeProvider<ZodTypeProvider>();

  api.post("/", { schema: createOrderRouteSchema }, async (request, reply) => {
    const order = await service.create(request.body, request.id);
    return reply.status(201).send({ orderId: order.id, status: order.status });
  });

  api.get("/:id", { schema: getOrderRouteSchema }, async (request, reply) => {
    const order = await service.getById(request.params.id);
    return reply.status(200).send(order.toJSON());
  });
};
