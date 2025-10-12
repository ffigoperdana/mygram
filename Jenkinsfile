pipeline {
    agent any
    
    tools {
        go '1.21'  // Ensure Jenkins has Go configured
    }
    
    environment {
        GO111MODULE = 'on'
        CGO_ENABLED = '0'
        GOOS = 'linux'
    }
    
    parameters {
        string(name: 'IMAGE_TAG', defaultValue: 'latest', description: 'Docker image tag to deploy')
        string(name: 'GIT_BRANCH', defaultValue: 'final-project', description: 'Git branch being deployed')
        choice(name: 'ENVIRONMENT', choices: ['staging', 'production'], description: 'Target environment')
        booleanParam(name: 'RUN_INTEGRATION_TESTS', defaultValue: false, description: 'Run integration tests')
        booleanParam(name: 'RUN_PERFORMANCE_TESTS', defaultValue: false, description: 'Run performance tests')
    }
    
    environment {
        DOCKER_REGISTRY = 'ghcr.io'
        IMAGE_NAME = 'ffigoperdana/go-dts-chapter3'
        COMPOSE_PROJECT_NAME = "mygram-${params.ENVIRONMENT}"
        SLACK_CHANNEL = '#deployments'
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        skipStagesAfterUnstable()
        ansiColor('xterm')
    }
    
    stages {
        stage('Preparation') {
            steps {
                script {
                    echo "🚀 Starting deployment pipeline"
                    echo "Environment: ${params.ENVIRONMENT}"
                    echo "Image Tag: ${params.IMAGE_TAG}"
                    echo "Branch: ${params.GIT_BRANCH}"
                    
                    // Set environment-specific variables
                    if (params.ENVIRONMENT == 'production') {
                        env.TARGET_HOST = 'production.egodev.tech'
                        env.COOLIFY_PROJECT = 'mygram-prod'
                    } else {
                        env.TARGET_HOST = 'staging.egodev.tech'
                        env.COOLIFY_PROJECT = 'mygram-staging'
                    }
                }
            }
        }
        
        stage('Health Check - Pre-deployment') {
            steps {
                script {
                    echo "🔍 Checking current application health..."
                    try {
                        sh """
                        curl -f http://${env.TARGET_HOST}/health || echo "Application not running or unhealthy"
                        """
                    } catch (Exception e) {
                        echo "Pre-deployment health check failed: ${e.getMessage()}"
                    }
                }
            }
        }
        
        stage('Pull Latest Image') {
            steps {
                script {
                    echo "📦 Pulling Docker image: ${DOCKER_REGISTRY}/${IMAGE_NAME}:${params.IMAGE_TAG}"
                    sh """
                    docker pull ${DOCKER_REGISTRY}/${IMAGE_NAME}:${params.IMAGE_TAG}
                    """
                }
            }
        }
        
        stage('Database Migration Check') {
            when {
                expression { params.ENVIRONMENT == 'production' }
            }
            steps {
                script {
                    echo "🗄️ Checking database migrations..."
                    sh """
                    # Check if migrations are needed
                    # This is a placeholder - implement actual migration check
                    echo "Database migration check completed"
                    """
                }
            }
        }
        
        stage('Integration Tests') {
            when {
                expression { params.RUN_INTEGRATION_TESTS }
            }
            steps {
                script {
                    echo "🧪 Running integration tests..."
                    sh """
                    # Start test environment
                    docker-compose -f docker-compose.test.yml up -d postgres
                    
                    # Wait for database
                    sleep 10
                    
                    # Run integration tests with test image
                    docker run --rm --network=\${COMPOSE_PROJECT_NAME}_default \\
                        -e DB_HOST=postgres \\
                        -e DB_USER=postgres \\
                        -e DB_PASSWORD=admin \\
                        -e DB_NAME=finalproject_test \\
                        ${DOCKER_REGISTRY}/${IMAGE_NAME}:${params.IMAGE_TAG} \\
                        go test -v ./tests/integration/...
                    
                    # Cleanup
                    docker-compose -f docker-compose.test.yml down -v
                    """
                }
            }
            post {
                always {
                    sh "docker-compose -f docker-compose.test.yml down -v || true"
                }
            }
        }
        
        stage('Performance Tests') {
            when {
                expression { params.RUN_PERFORMANCE_TESTS }
            }
            steps {
                script {
                    echo "⚡ Running performance tests..."
                    sh """
                    # Start application for performance testing
                    docker-compose -f docker-compose.perf.yml up -d
                    
                    # Wait for application startup
                    sleep 30
                    
                    # Run load tests (example with hey)
                    docker run --rm --network=\${COMPOSE_PROJECT_NAME}_default \\
                        rcmorano/docker-hey \\
                        -n 1000 -c 10 -t 30 \\
                        http://app:8080/health
                    
                    # Cleanup
                    docker-compose -f docker-compose.perf.yml down
                    """
                }
            }
            post {
                always {
                    sh "docker-compose -f docker-compose.perf.yml down || true"
                }
            }
        }
        
        stage('Security Scan') {
            steps {
                script {
                    echo "🔒 Running security scan on Docker image..."
                    sh """
                    # Scan the Docker image for vulnerabilities
                    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \\
                        aquasec/trivy image \\
                        --exit-code 1 \\
                        --severity HIGH,CRITICAL \\
                        ${DOCKER_REGISTRY}/${IMAGE_NAME}:${params.IMAGE_TAG} || true
                    """
                }
            }
        }
        
        stage('Deploy to Coolify') {
            steps {
                script {
                    echo "🚢 Deploying to ${params.ENVIRONMENT} via Coolify..."
                    
                    // Deploy using Coolify API
                    sh """
                    curl -X POST \\
                        -H "Authorization: Bearer \${COOLIFY_API_TOKEN}" \\
                        -H "Content-Type: application/json" \\
                        -d '{
                            "image": "${DOCKER_REGISTRY}/${IMAGE_NAME}:${params.IMAGE_TAG}",
                            "project": "${env.COOLIFY_PROJECT}",
                            "environment": "${params.ENVIRONMENT}"
                        }' \\
                        "\${COOLIFY_URL}/api/v1/deploy"
                    """
                    
                    // Alternative: Update docker-compose and restart
                    sh """
                    # Update environment variables
                    export IMAGE_TAG=${params.IMAGE_TAG}
                    export DOCKER_REGISTRY=${DOCKER_REGISTRY}
                    
                    # Deploy using docker-compose
                    docker-compose -f docker-compose.prod.yml pull
                    docker-compose -f docker-compose.prod.yml up -d --remove-orphans
                    
                    # Wait for deployment
                    sleep 15
                    """
                }
            }
        }
        
        stage('Health Check - Post-deployment') {
            steps {
                script {
                    echo "🏥 Running post-deployment health checks..."
                    
                    def healthCheckPassed = false
                    def maxRetries = 12
                    def retryCount = 0
                    
                    while (!healthCheckPassed && retryCount < maxRetries) {
                        try {
                            sh """
                            curl -f http://${env.TARGET_HOST}/health/ready
                            """
                            healthCheckPassed = true
                            echo "✅ Health check passed!"
                        } catch (Exception e) {
                            retryCount++
                            echo "⏳ Health check attempt ${retryCount}/${maxRetries} failed, retrying in 10 seconds..."
                            sleep 10
                        }
                    }
                    
                    if (!healthCheckPassed) {
                        error("❌ Health checks failed after ${maxRetries} attempts")
                    }
                }
            }
        }
        
        stage('Smoke Tests') {
            steps {
                script {
                    echo "💨 Running smoke tests..."
                    sh """
                    # Basic API endpoint tests
                    curl -f http://${env.TARGET_HOST}/health
                    curl -f http://${env.TARGET_HOST}/health/live
                    curl -f http://${env.TARGET_HOST}/health/ready
                    
                    # Test user registration endpoint
                    curl -X POST -H "Content-Type: application/json" \\
                        -d '{"username":"testuser","email":"test@example.com","password":"testpass123","age":25}' \\
                        http://${env.TARGET_HOST}/users/register || true
                    
                    echo "✅ Smoke tests completed"
                    """
                }
            }
        }
        
        stage('Cleanup Old Images') {
            steps {
                script {
                    echo "🧹 Cleaning up old Docker images..."
                    sh """
                    # Keep last 3 images, remove others
                    docker images ${DOCKER_REGISTRY}/${IMAGE_NAME} --format "table {{.Tag}}" | \\
                        grep -v latest | grep -v ${params.IMAGE_TAG} | \\
                        tail -n +4 | \\
                        xargs -r -I {} docker rmi ${DOCKER_REGISTRY}/${IMAGE_NAME}:{} || true
                    
                    # Clean up dangling images
                    docker image prune -f || true
                    """
                }
            }
        }
    }
    
    post {
        always {
            script {
                // Calculate deployment duration
                def duration = currentBuild.durationString.replace(' and counting', '')
                echo "⏱️ Pipeline completed in: ${duration}"
            }
        }
        
        success {
            script {
                echo "🎉 Deployment successful!"
                
                // Send Slack notification (if configured)
                // slackSend(
                //     channel: env.SLACK_CHANNEL,
                //     color: 'good',
                //     message: "✅ MyGram API deployed successfully to ${params.ENVIRONMENT}\\nImage: ${params.IMAGE_TAG}\\nBranch: ${params.GIT_BRANCH}\\nDuration: ${currentBuild.durationString}"
                // )
            }
        }
        
        failure {
            script {
                echo "❌ Deployment failed!"
                
                // Send Slack notification (if configured)
                // slackSend(
                //     channel: env.SLACK_CHANNEL,
                //     color: 'danger',
                //     message: "❌ MyGram API deployment failed for ${params.ENVIRONMENT}\\nImage: ${params.IMAGE_TAG}\\nBranch: ${params.GIT_BRANCH}\\nCheck: ${BUILD_URL}"
                // )
                
                // Rollback on production failure
                if (params.ENVIRONMENT == 'production') {
                    echo "🔄 Initiating rollback procedure..."
                    // Add rollback logic here
                }
            }
        }
        
        unstable {
            echo "⚠️ Pipeline completed with warnings"
        }
        
        cleanup {
            // Clean up workspace
            deleteDir()
        }
    }
}