package main

import (
	"finalproject/router"
	"fmt"
	"os"
)

func main() {
	// Check if running health check
	if len(os.Args) > 1 && os.Args[1] == "health" {
		healthCheck()
		return
	}

	// database.StartDB()
	r := router.StartApp()
	
	// Get port from environment or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	fmt.Printf("Server starting on port %s\n", port)
	r.Run(":" + port)
}

func healthCheck() {
	// Simple health check - can be enhanced to check DB connectivity
	fmt.Println("Health check passed")
	os.Exit(0)
}
