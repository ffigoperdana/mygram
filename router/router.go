package router

import (
	"finalproject/controllers"
	"finalproject/middlewares"

	"github.com/gin-gonic/gin"

	_ "finalproject/docs"

	ginSwagger "github.com/swaggo/gin-swagger"

	swaggerfiles "github.com/swaggo/files"
)

// @title Mygram API
// @version 1.0
// @description This is a final project API from Hactiv8 to add photos, comments, and store the social media of users
// @termsOfService http://swagger.io/terms
// @contact.name API Support
// @contact.email perdanaputrafigo@gmail.com
// @license.name Apache 2.0
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @license.url http://www.apache.org/licenses/license-2.0.html
// @BasePath /
func StartApp() *gin.Engine {
	r := gin.Default()

	// Health check endpoints
	r.GET("/health", controllers.HealthCheck)
	r.GET("/health/ready", controllers.ReadinessCheck)
	r.GET("/health/live", controllers.LivenessCheck)

	userRouter := r.Group("/users")
	{
		// Create
		userRouter.POST("/register", controllers.UserRegister)
		// Read
		userRouter.POST("/login", controllers.UserLogin)
	}

	photoRouter := r.Group("/photos")
	{
		photoRouter.Use(middlewares.Authentication())
		// Create
		photoRouter.POST("/create", controllers.CreatePhoto)
		// Read
		photoRouter.GET("/getall", controllers.GetAllPhotos)
		// Read
		photoRouter.GET("/get/:photoId", controllers.GetPhoto)
		// Update
		photoRouter.PUT("/update/:photoId", middlewares.PhotoAuthorization(), controllers.UpdatePhoto)
		// Delete
		photoRouter.DELETE("/delete/:photoId", middlewares.PhotoAuthorization(), controllers.DeletePhoto)
	}

	commentRouter := r.Group("/comments")
	{
		commentRouter.Use(middlewares.Authentication())
		// Create
		commentRouter.POST("/create/:photoId", controllers.CreateComment)
		// Read
		commentRouter.GET("/getall", controllers.GetAllComments)
		// Read
		commentRouter.GET("/getall/:photoId", controllers.GetAllCommentsForPhoto)
		// Read
		commentRouter.GET("/get/:commentId", controllers.GetComment)
		// Update
		commentRouter.PUT("/update/:commentId", middlewares.CommentAuthorization(), controllers.UpdateComment)
		// Delete
		commentRouter.DELETE("/delete/:commentId", middlewares.CommentAuthorization(), controllers.DeleteComment)

	}

	socmedRouter := r.Group("/socialmedia")
	{
		socmedRouter.Use(middlewares.Authentication())
		// Create
		socmedRouter.POST("/create", controllers.CreateSocialMedia)
		// Read
		socmedRouter.GET("/getall", controllers.GetAllSocialMedias)
		// Read
		socmedRouter.GET("/get/:socialMediaId", controllers.GetSocialMedia)
		// Update
		socmedRouter.PUT("/update/:socialMediaId", middlewares.SocialMediaAuthorization(), controllers.UpdateSocialMedia)
		// Delete
		socmedRouter.DELETE("/delete/:socialMediaId", middlewares.SocialMediaAuthorization(), controllers.DeleteSocialMedia)

	}

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))

	return r
}
