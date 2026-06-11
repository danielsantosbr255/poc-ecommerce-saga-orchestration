import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastify from "fastify";
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { env } from "./config/env.js";
import rabbitmqPlugin from "./infra/messaging/rabbitmq.plugin.js";
import { OrderModule } from "./order/order.module.js";
import errorHandlerPlugin from "./plugins/error-handler.plugin.js";

export const buildApp = async () => {
  const app = fastify({
    logger:
      env.NODE_ENV === "production"
        ? { level: "info" }
        : {
            level: "debug",
            transport: {
              target: "pino-pretty",
              options: { singleLine: true, colorize: true },
            },
          },
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(sensible);
  await app.register(errorHandlerPlugin);

  await app.register(cors, {
    origin: env.NODE_ENV === "production" ? false : "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  await app.register(rabbitmqPlugin);

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "Order Service API",
        description: "API for managing orders",
        version: "1.0.0",
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(fastifySwaggerUi, { routePrefix: "/docs" });

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(OrderModule, { prefix: "/orders" });

  return app;
};
