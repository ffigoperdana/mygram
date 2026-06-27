package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"strings"

	appconfig "finalproject/config"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var ErrObjectStorageNotConfigured = errors.New("object storage is not configured")

type ObjectUploadInput struct {
	Key         string
	ContentType string
	Body        io.Reader
	Size        int64
}

type ObjectUploadResult struct {
	URL         string
	Key         string
	Bucket      string
	ContentType string
	Size        int64
}

func UploadObject(ctx context.Context, cfg appconfig.Config, input ObjectUploadInput) (ObjectUploadResult, error) {
	if !cfg.ObjectStorageConfigured() {
		return ObjectUploadResult{}, ErrObjectStorageNotConfigured
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(
		ctx,
		awsconfig.WithRegion(cfg.S3Region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.S3AccessKeyID,
			cfg.S3SecretAccessKey,
			"",
		)),
	)
	if err != nil {
		return ObjectUploadResult{}, fmt.Errorf("load s3 config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg, func(options *s3.Options) {
		options.BaseEndpoint = aws.String(cfg.S3Endpoint)
		options.UsePathStyle = cfg.S3ForcePathStyle
		options.RequestChecksumCalculation = aws.RequestChecksumCalculationWhenRequired
		options.ResponseChecksumValidation = aws.ResponseChecksumValidationWhenRequired
	})

	_, err = client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(cfg.S3Bucket),
		Key:           aws.String(input.Key),
		Body:          input.Body,
		ContentType:   aws.String(input.ContentType),
		ContentLength: aws.Int64(input.Size),
		CacheControl:  aws.String("public, max-age=31536000, immutable"),
	})
	if err != nil {
		return ObjectUploadResult{}, fmt.Errorf("upload object: %w", err)
	}

	return ObjectUploadResult{
		URL:         objectURL(cfg, input.Key),
		Key:         input.Key,
		Bucket:      cfg.S3Bucket,
		ContentType: input.ContentType,
		Size:        input.Size,
	}, nil
}

func objectURL(cfg appconfig.Config, key string) string {
	escapedKey := escapeObjectKey(key)

	if cfg.S3PublicBaseURL != "" {
		return cfg.S3PublicBaseURL + "/" + escapedKey
	}

	endpoint := strings.TrimRight(cfg.S3Endpoint, "/")
	if cfg.S3ForcePathStyle {
		return endpoint + "/" + url.PathEscape(cfg.S3Bucket) + "/" + escapedKey
	}

	parsed, err := url.Parse(endpoint)
	if err != nil || parsed.Host == "" {
		return endpoint + "/" + url.PathEscape(cfg.S3Bucket) + "/" + escapedKey
	}

	parsed.Host = cfg.S3Bucket + "." + parsed.Host
	parsed.Path = strings.TrimRight(parsed.Path, "/") + "/" + key
	return parsed.String()
}

func escapeObjectKey(key string) string {
	segments := strings.Split(strings.TrimLeft(key, "/"), "/")
	for index, segment := range segments {
		segments[index] = url.PathEscape(segment)
	}

	return strings.Join(segments, "/")
}
