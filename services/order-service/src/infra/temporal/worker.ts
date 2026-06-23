import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities.js";

let worker: Worker;

export async function startTemporalWorker() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
  });

  worker = await Worker.create({
    connection,
    namespace: "default",
    taskQueue: "order-saga-task-queue",
    workflowsPath: new URL("./workflows.js", import.meta.url).pathname,
    activities,
  });

  // Run the worker as a background promise
  worker.run().catch(err => {
    console.error("Worker failed", err);
  });

  return worker;
}

export async function stopTemporalWorker() {
  if (worker) {
    worker.shutdown();
  }
}
