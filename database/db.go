package database

import (
	"finalproject/config"
	"finalproject/models"
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var (
	db *gorm.DB
)

func StartDB() error {
	cfg := config.Load()
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		cfg.DBHost,
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBName,
		cfg.DBPort,
		cfg.DBSSLMode,
	)

	conn, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("connect database: %w", err)
	}

	if cfg.GinMode != "release" {
		conn = conn.Debug()
	}

	if err := conn.AutoMigrate(models.User{}, models.Photo{}, models.Comment{}, models.SocialMedia{}); err != nil {
		return fmt.Errorf("migrate database: %w", err)
	}

	db = conn
	return nil
}

func GetDB() *gorm.DB {
	return db
}

func SetDB(database *gorm.DB) {
	db = database
}
