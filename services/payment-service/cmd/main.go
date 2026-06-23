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

	w := worker.New(c, "order-saga-task-queue", worker.Options{})

	w.RegisterActivity(activities.ProcessPayment)
	w.RegisterActivity(activities.RefundPayment)

	err = w.Run(worker.InterruptCh())
	if err != nil {
		slog.Error("Unable to start worker", "error", err)
		os.Exit(1)
	}
}
