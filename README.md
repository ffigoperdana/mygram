# MyGram - Social Media Backend API

A comprehensive social media backend application built with Go (Golang) using the Gin framework. This project is a final project for Hactiv8's Go Programming course, focusing on building secure APIs for a social media platform where users can share photos, comments, and social media links.

## 👨‍💻 Author Information

**Nama**: Figo Perdana Putra  
**Kelas**: F-07  
**Contact**: perdanaputrafigo@gmail.com  

---

## 🚀 Project Overview

MyGram is a RESTful API backend for a social media application that allows users to:
- Register and authenticate accounts
- Upload and manage photos with captions
- Comment on photos
- Share social media links
- Secure access with JWT authentication
- Role-based authorization for resource management

## 🏗️ Architecture & Tech Stack

### **Core Technologies**
- **Language**: Go 1.20
- **Framework**: Gin Web Framework
- **Database**: PostgreSQL with GORM ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcrypt hashing
- **Documentation**: Swagger/OpenAPI
- **Validation**: govalidator

### **Dependencies**
```go
- github.com/gin-gonic/gin - Web framework
- gorm.io/gorm - ORM for database operations
- gorm.io/driver/postgres - PostgreSQL driver
- github.com/dgrijalva/jwt-go - JWT authentication
- golang.org/x/crypto - Password hashing (bcrypt)
- github.com/asaskevich/govalidator - Input validation
- github.com/swaggo/gin-swagger - API documentation
```

## 📊 Database Schema

The application uses PostgreSQL with the following main entities:

### **User Model**
```go
- ID (Primary Key)
- Username (Unique)
- Email (Unique) 
- Password (Hashed with bcrypt)
- Age (Minimum 9 years old)
- CreatedAt, UpdatedAt
- Relationships: Has many Photos, Comments, SocialMedias
```

### **Photo Model**
```go
- ID (Primary Key)
- Title (Required)
- Caption (Optional)
- PhotoURL (Required, validated URL)
- UserID (Foreign Key)
- CreatedAt, UpdatedAt
- Relationships: Belongs to User, Has many Comments
```

### **Comment Model**
```go
- ID (Primary Key)
- Message (Required)
- PhotoID (Foreign Key)
- UserID (Foreign Key)
- CreatedAt, UpdatedAt
- Relationships: Belongs to User and Photo
```

### **SocialMedia Model**
```go
- ID (Primary Key)
- Name (Required)
- SocialMediaURL (Required, validated URL)
- UserID (Foreign Key)
- CreatedAt, UpdatedAt
- Relationships: Belongs to User
```

## 🔐 Security Features

### **Authentication & Authorization**
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Authorization Middleware**: Resource-specific authorization
- **Input Validation**: Comprehensive validation on all inputs

### **Middleware Stack**
1. **Authentication Middleware**: Validates JWT tokens
2. **Authorization Middleware**: Ensures users can only modify their own resources
3. **Content-Type Handling**: Supports JSON and form data

## 🛠️ API Endpoints

### **User Management**
```
POST /users/register  - Register new user
POST /users/login     - User authentication
```

### **Photo Management** (🔒 Requires Authentication)
```
POST   /photos/create           - Upload new photo
GET    /photos/getall           - Get all photos
GET    /photos/get/:photoId     - Get specific photo
PUT    /photos/update/:photoId  - Update photo (owner only)
DELETE /photos/delete/:photoId  - Delete photo (owner only)
```

### **Comment Management** (🔒 Requires Authentication)
```
POST   /comments/create/:photoId       - Add comment to photo
GET    /comments/getall               - Get all comments
GET    /comments/getall/:photoId      - Get comments for specific photo
GET    /comments/get/:commentId       - Get specific comment
PUT    /comments/update/:commentId    - Update comment (owner only)
DELETE /comments/delete/:commentId    - Delete comment (owner only)
```

### **Social Media Management** (🔒 Requires Authentication)
```
POST   /socialmedia/create                    - Add social media link
GET    /socialmedia/getall                    - Get all social media links
GET    /socialmedia/get/:socialMediaId        - Get specific social media
PUT    /socialmedia/update/:socialMediaId     - Update social media (owner only)
DELETE /socialmedia/delete/:socialMediaId     - Delete social media (owner only)
```

### **Documentation**
```
GET /swagger/*any - Swagger API documentation
```

## 🔄 Application Workflow

### **1. User Registration & Authentication**
```
User Registration → Password Hashing → Database Storage
User Login → Password Verification → JWT Token Generation
```

### **2. Photo Sharing Flow**
```
Authentication Check → Photo Upload → Validation → Database Storage
Photo Retrieval → Authorization Check → Response
Photo Update/Delete → Owner Authorization → Database Operation
```

### **3. Comment System Flow**
```
Authentication → Photo Existence Check → Comment Creation
Comment Retrieval → Database Query → Response
Comment Modification → Owner Authorization → Database Update
```

### **4. Social Media Integration Flow**
```
Authentication → URL Validation → Social Media Link Storage
Link Management → Owner Authorization → CRUD Operations
```

## 📁 Project Structure

```
go-dts-chapter3/
├── main.go                    # Application entry point
├── go.mod                     # Go module dependencies
├── controllers/               # HTTP request handlers
│   ├── userController.go      # User registration/login
│   ├── photosController.go    # Photo CRUD operations
│   ├── commentsController.go  # Comment CRUD operations
│   └── sosmedController.go    # Social media CRUD operations
├── database/
│   └── db.go                  # Database connection & migration
├── models/                    # Database models
│   ├── user.go               # User model with validation
│   ├── photos.go             # Photo model with validation
│   ├── comments.go           # Comment model with validation
│   ├── socialMedia.go        # Social media model
│   └── gormModel.go          # Base GORM model
├── middlewares/               # HTTP middlewares
│   ├── authentication.go     # JWT authentication
│   └── authorization.go      # Resource authorization
├── helpers/                   # Utility functions
│   ├── jwt.go                # JWT token operations
│   ├── bcrypt.go             # Password hashing
│   └── headerValue.go        # HTTP header utilities
├── router/
│   └── router.go             # Route definitions
└── docs/                     # Swagger documentation
    ├── docs.go
    ├── swagger.json
    └── swagger.yaml
```

## ⚙️ Setup & Installation

### **Prerequisites**
- Go 1.20 or higher
- PostgreSQL database
- Git

### **Installation Steps**

1. **Clone Repository**
```bash
git clone <repository-url>
cd go-dts-chapter3
```

2. **Install Dependencies**
```bash
go mod download
```

3. **Database Setup**
```sql
-- Create PostgreSQL database
CREATE DATABASE finalproject;
```

4. **Configure Database** (in `database/db.go`)
```go
host     = "localhost"
user     = "postgres" 
password = "admin"
dbname   = "finalproject"
```

5. **Run Application**
```bash
go run main.go
```

The server will start on `http://localhost:8080`

### **API Documentation**
Access Swagger documentation at: `http://localhost:8080/swagger/index.html`

## 🔧 Development Features

- **Auto Migration**: Automatic database schema creation
- **Debug Mode**: Detailed SQL logging in development
- **Input Validation**: Comprehensive validation on all inputs
- **Error Handling**: Proper HTTP status codes and error messages
- **CORS Support**: Cross-origin resource sharing
- **Swagger Documentation**: Interactive API documentation

## 🎯 Key Learning Objectives

This project demonstrates:
- **RESTful API Design**: Proper HTTP methods and status codes
- **Database Relationships**: Complex entity relationships with GORM
- **Authentication & Authorization**: JWT-based security
- **Input Validation**: Data integrity and security
- **Error Handling**: Robust error management
- **Documentation**: API documentation with Swagger
- **Go Best Practices**: Clean code architecture and patterns

## 🚦 Testing

Use tools like Postman or curl to test the API endpoints. Remember to:
1. Register a user account
2. Login to get JWT token
3. Include Authorization header: `Bearer <your-jwt-token>`
4. Test CRUD operations for photos, comments, and social media

---

**Note**: This is an educational project for learning Go backend development with security best practices.
