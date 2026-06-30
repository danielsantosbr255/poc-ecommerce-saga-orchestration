import { Client, Connection, WorkflowExecutionAlreadyStartedError, WorkflowIdReusePolicy } from "@temporalio/client";
import type { ISagaOrchestrator } from "../../../application/ports/saga-orchestrator.port.js";
import type { OrderEntity } from "../../../domain/entities/order.entity.js";
import { IdempotencyConflictError } from "../../../domain/exceptions/domain.errors.js";
import { OrderSagaWorkflow } from "./workflows.js";

export class TemporalSagaAdapter implements ISagaOrchestrator {
  private constructor(private readonly client: Client) {}

  static async createAndConnect(address: string): Promise<TemporalSagaAdapter> {
    const connection = await Connection.connect({ address });
    const client = new Client({ connection });
    return new TemporalSagaAdapter(client);
  }

  static create(client: Client): TemporalSagaAdapter {
    return new TemporalSagaAdapter(client);
  }

  async startOrderSaga(order: OrderEntity, idempotencyKey: string): Promise<void> {
    try {
      await this.client.workflow.start(OrderSagaWorkflow, {
        args: [{ order: order.toSnapshot(), idempotencyKey }],
        taskQueue: "order-saga-task-queue",
        workflowId: `order-saga-${idempotencyKey}`,
        workflowIdReusePolicy: WorkflowIdReusePolicy.REJECT_DUPLICATE,
      });
    } catch (error) {
      if (error instanceof WorkflowExecutionAlreadyStartedError) {
        throw new IdempotencyConflictError(idempotencyKey);
      }
      throw error;
    }
  }
}
