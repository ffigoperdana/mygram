package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"finalproject/router"

	"github.com/stretchr/testify/assert"
)

func TestHealthCheckEndpoint(t *testing.T) {
	// Create a test router
	r := router.StartApp()

	// Create a test request
	req, _ := http.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	// Perform the request
	r.ServeHTTP(w, req)

	// Assert the response
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "healthy")
}

func TestLivenessCheck(t *testing.T) {
	r := router.StartApp()
	req, _ := http.NewRequest("GET", "/health/live", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "alive")
}

// Example of testing user registration endpoint
func TestUserRegistrationEndpoint(t *testing.T) {
	r := router.StartApp()
	
	// Test GET method on POST endpoint (should return 404 or Method Not Allowed)
	req, _ := http.NewRequest("GET", "/users/register", nil)
	w := httptest.NewRecorder()
	
	r.ServeHTTP(w, req)
	
	// Should not be OK since we're using GET on a POST endpoint
	assert.NotEqual(t, http.StatusOK, w.Code)
}