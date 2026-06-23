package main

import (
	"log/slog"
	"os"
	"time"

	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"

	"github.com/danielsantosbr255/payment-service/internal/config"
	"github.com/danielsantosbr255/payment-service/internal/gateway"
	"github.com/danielsantosbr255/payment-service/internal/repository"
	temporalWorker "github.com/danielsantosbr255/payment-service/internal/worker"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	cfg := config.Load()
	slog.Info("payment-service starting Temporal worker")

	repo := repository.NewMemoryRepository()
	gw := gateway.NewMockGateway()
	activities := temporalWorker.NewPaymentActivities(repo, gw, time.Duration(cfg.GatewayTimeoutMS)*time.Millisecond)

	c, err := client.Dial(client.Options{
		HostPort: os.Getenv("TEMPORAL_ADDRESS"),
	})
	if err != nil {
		slog.Error("Unable to create Temporal client", "error", err)
		os.Exit(1)
	}
	defer c.Close()

	w := worker.New(c, "payment-service-task-queue", worker.Options{})

	w.RegisterActivity(activities.ProcessPayment)
	w.RegisterActivity(activities.RefundPayment)

	slog.Info("payment-service starting Temporal worker on payment-service-task-queue")
	err = w.Start()
	if err != nil {
		slog.Error("Unable to start Temporal worker", "error", err)
		os.Exit(1)
	}

	slog.Info("Started Worker", "Namespace", "default", "TaskQueue", "payment-service-task-queue")
	
	select {}
}
