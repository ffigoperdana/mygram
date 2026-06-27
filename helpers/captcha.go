package helpers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"finalproject/config"
)

var (
	ErrCaptchaNotConfigured = errors.New("captcha is not configured")
	ErrCaptchaRequired      = errors.New("captcha token is required")
	ErrCaptchaFailed        = errors.New("captcha verification failed")
	ErrCaptchaUnavailable   = errors.New("captcha verification service is unavailable")
)

type captchaVerifyRequest struct {
	Secret   string `json:"secret"`
	Response string `json:"response"`
}

type captchaVerifyResponse struct {
	Success bool     `json:"success"`
	Error   string   `json:"error,omitempty"`
	Message string   `json:"message,omitempty"`
	Errors  []string `json:"errors,omitempty"`
}

func VerifyCaptchaToken(cfg config.Config, token string) error {
	if !cfg.CapEnabled {
		return nil
	}

	token = strings.TrimSpace(token)
	if token == "" {
		return ErrCaptchaRequired
	}

	if strings.TrimSpace(cfg.CapBaseURL) == "" || strings.TrimSpace(cfg.CapSiteKey) == "" || strings.TrimSpace(cfg.CapSecretKey) == "" {
		return ErrCaptchaNotConfigured
	}

	endpoint := fmt.Sprintf("%s/%s/siteverify", strings.TrimRight(cfg.CapBaseURL, "/"), url.PathEscape(cfg.CapSiteKey))
	body, err := json.Marshal(captchaVerifyRequest{
		Secret:   cfg.CapSecretKey,
		Response: token,
	})
	if err != nil {
		return fmt.Errorf("%w: %v", ErrCaptchaFailed, err)
	}

	request, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("%w: %v", ErrCaptchaNotConfigured, err)
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept", "application/json")

	client := http.Client{Timeout: 5 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrCaptchaUnavailable, err)
	}
	defer response.Body.Close()

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("%w: status %d", ErrCaptchaUnavailable, response.StatusCode)
	}

	result := captchaVerifyResponse{}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return fmt.Errorf("%w: invalid response", ErrCaptchaFailed)
	}

	if result.Success {
		return nil
	}

	reason := strings.TrimSpace(result.Message)
	if reason == "" {
		reason = strings.TrimSpace(result.Error)
	}
	if reason == "" && len(result.Errors) > 0 {
		reason = strings.Join(result.Errors, ", ")
	}
	if reason == "" {
		return ErrCaptchaFailed
	}

	return fmt.Errorf("%w: %s", ErrCaptchaFailed, reason)
}
