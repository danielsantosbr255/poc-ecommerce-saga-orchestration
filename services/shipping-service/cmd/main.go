package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/danielsantosbr255/shipping-service/internal/config"
	"github.com/danielsantosbr255/shipping-service/internal/gateway"
	"github.com/danielsantosbr255/shipping-service/internal/worker"
)

func main() {
	setupLogger()
	cfg := config.Load()

	slog.Info("shipping-service starting", "rabbitmq_url", cfg.RabbitMQURL)

	slog.Info("connecting to RabbitMQ", "url", cfg.RabbitMQURL)
	conn, err := config.Connect(cfg.RabbitMQURL)
	if err != nil {
		slog.Error("failed to connect to RabbitMQ", "error", err)
		os.Exit(1)
	}
	defer conn.Close()
	slog.Info("connected to RabbitMQ successfully")

	publisher, err := worker.NewPublisher(conn)
	if err != nil {
		slog.Error("failed to initialize publisher", "error", err)
		os.Exit(1)
	}
	defer publisher.Close()

	carrierMock := gateway.NewCarrierMock()
	handler := worker.NewHandler(carrierMock)

	consumer := worker.NewConsumer(conn, handler, publisher, cfg.QOSPrefetch, cfg.MaxRetries)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var wg sync.WaitGroup

	// Start consumer
	go func() {
		if err := consumer.Run(ctx, &wg); err != nil {
			slog.Error("consumer stopped with error", "error", err)
			cancel()
		}
	}()

	// Graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	slog.Info("shutdown signal received — waiting for in-flight messages to finish")
	cancel()
	wg.Wait()
	slog.Info("all messages processed — shipping-service stopped cleanly")
}

func setupLogger() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)
}
