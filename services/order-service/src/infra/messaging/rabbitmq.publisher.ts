import type { Connection } from "rabbitmq-client";
import type { OrderPlacedEvent } from "../../order/order.events.js";
import type { IOrderPublisherPort } from "../../order/order.types.js";

const EXCHANGE = "orders";

export class RabbitOrderPublisher implements IOrderPublisherPort {
  private readonly publisher;

  constructor(rabbit: Connection) {
    this.publisher = rabbit.createPublisher({
      confirm: true,
      maxAttempts: 2,
      exchanges: [{ exchange: EXCHANGE, type: "topic", durable: true }],
    });
  }

  async publishOrderPlaced(event: OrderPlacedEvent, correlationId?: string) {
    await this.publisher.send(
      {
        durable: true,
        exchange: EXCHANGE,
        routingKey: "order.placed",
        contentType: "application/json",
        messageId: event.eventId,
        correlationId: correlationId ?? crypto.randomUUID(),
        timestamp: Date.now(),
        headers: {
          "x-source-service": "order-service",
          "x-event-type": "order.placed",
        },
      },
      event,
    );
  }

  async close() {
    await this.publisher.close();
  }
}
