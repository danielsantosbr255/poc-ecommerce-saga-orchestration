import fp from "fastify-plugin";
import { initTemporalClient } from "./client.js";
import { startTemporalWorker, stopTemporalWorker } from "./worker.js";

export default fp(async app => {
  // Initialize the client so it's ready to use
  await initTemporalClient();

  // Start the worker
  await startTemporalWorker();

  // Handle graceful shutdown
  app.addHook("onClose", async () => {
    app.log.info("Shutting down Temporal worker...");
    await stopTemporalWorker();
  });
});
