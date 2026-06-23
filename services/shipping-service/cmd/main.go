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

	w := worker.New(c, "shipping-service-task-queue", worker.Options{})

	w.RegisterActivity(activities.ShipOrder)

	slog.Info("shipping-service starting Temporal worker on shipping-service-task-queue")
	err = w.Start()
	if err != nil {
		slog.Error("Unable to start Temporal worker", "error", err)
		os.Exit(1)
	}

	slog.Info("Started Worker", "Namespace", "default", "TaskQueue", "shipping-service-task-queue")
	select {}
}

func setupLogger() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)
}
