package main

import (
	"log/slog"
	"os"

	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"

	"github.com/danielsantosbr255/shipping-service/internal/gateway"
	temporalWorker "github.com/danielsantosbr255/shipping-service/internal/worker"
)

func main() {
	setupLogger()

	slog.Info("shipping-service starting Temporal worker")

	carrierMock := gateway.NewCarrierMock()
	activities := temporalWorker.NewShippingActivities(carrierMock)

	c, err := client.Dial(client.Options{
		HostPort: os.Getenv("TEMPORAL_ADDRESS"),
	})
	if err != nil {
		slog.Error("Unable to create Temporal client", "error", err)
		os.Exit(1)
	}
	defer c.Close()

	w := worker.New(c, "order-saga-task-queue", worker.Options{})

	w.RegisterActivity(activities.ShipOrder)

	err = w.Run(worker.InterruptCh())
	if err != nil {
		slog.Error("Unable to start worker", "error", err)
		os.Exit(1)
	}
}

func setupLogger() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)
}
