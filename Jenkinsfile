pipeline {
    agent any

    options {
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    parameters {
        booleanParam(name: 'PUSH_IMAGES', defaultValue: false, description: 'Push GHCR images after build checks. Keep false for Phase E.')
        string(name: 'IMAGE_TAG', defaultValue: '', description: 'Optional image tag. Defaults to git SHA.')
        string(name: 'PUBLIC_API_BASE_URL', defaultValue: 'https://api.mygram.example.com', description: 'Frontend build-time API URL.')
        string(name: 'GHCR_OWNER_REPO', defaultValue: '', description: 'Required when PUSH_IMAGES=true, for example ghcr.io/owner/mygram.')
    }

    environment {
        GO_VERSION_HINT = '1.26.x'
        NODE_VERSION_HINT = '20'
        BACKEND_LOCAL_IMAGE = 'mygram-api:jenkins'
        FRONTEND_LOCAL_IMAGE = 'mygram-web:jenkins'
        CI_JWT_SECRET = 'ci-jwt-secret-that-is-long-enough-for-mygram'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_SHORT_SHA = sh(script: 'git rev-parse --short=12 HEAD', returnStdout: true).trim()
                    env.EFFECTIVE_IMAGE_TAG = params.IMAGE_TAG?.trim() ? params.IMAGE_TAG.trim() : env.GIT_SHORT_SHA
                }
            }
        }

        stage('Tool Versions') {
            steps {
                sh 'go version'
                sh 'node --version'
                sh 'npm --version'
                sh 'docker version'
                sh 'docker compose version || docker-compose --version'
            }
        }

        stage('Backend Quality') {
            steps {
                sh 'go mod download'
                sh 'go mod verify'
                sh 'go vet ./...'
                sh '''
                    JWT_SECRET="${CI_JWT_SECRET}" \
                    GIN_MODE=test \
                    DB_HOST="${DB_HOST:-localhost}" \
                    DB_USER="${DB_USER:-postgres}" \
                    DB_PASSWORD="${DB_PASSWORD:-admin}" \
                    DB_NAME="${DB_NAME:-finalproject_test}" \
                    DB_PORT="${DB_PORT:-5432}" \
                    DB_SSLMODE="${DB_SSLMODE:-disable}" \
                    go test -count=1 ./...
                '''
            }
        }

        stage('Frontend Quality') {
            steps {
                dir('mygram-frontend') {
                    sh 'npm ci'
                    sh 'npm run typecheck'
                    sh 'npm run lint'
                    sh 'npm run test'
                    sh '''
                        VITE_API_BASE_URL="${PUBLIC_API_BASE_URL}" \
                        VITE_CAP_ENABLED=false \
                        VITE_CAP_BASE_URL=https://cap.fgdev.tech \
                        VITE_CAP_SITE_KEY=jenkins-site-key \
                        VITE_CAP_REQUIRED_ON_LOGIN=true \
                        npm run build
                    '''
                }
            }
        }

        stage('Docker Build Check') {
            steps {
                sh 'docker build -t "${BACKEND_LOCAL_IMAGE}" .'
                sh '''
                    docker build \
                      --build-arg VITE_API_BASE_URL="${PUBLIC_API_BASE_URL}" \
                      --build-arg VITE_CAP_ENABLED=false \
                      --build-arg VITE_CAP_BASE_URL=https://cap.fgdev.tech \
                      --build-arg VITE_CAP_SITE_KEY=jenkins-site-key \
                      --build-arg VITE_CAP_REQUIRED_ON_LOGIN=true \
                      -t "${FRONTEND_LOCAL_IMAGE}" \
                      ./mygram-frontend
                '''
            }
        }

        stage('Compose Config Check') {
            steps {
                sh '''
                    if docker compose version >/dev/null 2>&1; then
                      COMPOSE="docker compose"
                    else
                      COMPOSE="docker-compose"
                    fi

                    BACKEND_IMAGE="${BACKEND_LOCAL_IMAGE}" \
                    FRONTEND_IMAGE="${FRONTEND_LOCAL_IMAGE}" \
                    DB_NAME=finalproject \
                    DB_USER=postgres \
                    DB_PASSWORD=ci-postgres-password \
                    JWT_SECRET="${CI_JWT_SECRET}" \
                    JWT_EXPIRATION_HOURS=24 \
                    CORS_ALLOWED_ORIGINS=https://mygram.example.com,https://docs.mygram.example.com \
                    PUBLIC_OPENAPI_ENABLED=true \
                    SWAGGER_UI_MODE=public \
                    CAP_ENABLED=false \
                    CAP_BASE_URL=https://cap.fgdev.tech \
                    CAP_SITE_KEY=jenkins-site-key \
                    CAP_SECRET_KEY=jenkins-secret-key \
                    CAP_REQUIRED_ON_LOGIN=true \
                    S3_ENDPOINT=https://s3.fgdev.tech \
                    S3_REGION=garage \
                    S3_BUCKET=fgdev-media \
                    S3_ACCESS_KEY_ID=jenkins-access-key \
                    S3_SECRET_ACCESS_KEY=jenkins-secret-key \
                    S3_FORCE_PATH_STYLE=true \
                    S3_UPLOAD_MAX_MB=5 \
                    $COMPOSE -f docker-compose.prod.yml config

                    JWT_SECRET="${CI_JWT_SECRET}" \
                    DB_PASSWORD=admin \
                    CORS_ALLOWED_ORIGINS=http://localhost:3000 \
                    PUBLIC_API_BASE_URL=http://localhost:8080 \
                    VITE_CAP_ENABLED=false \
                    S3_ENDPOINT="" \
                    S3_BUCKET="" \
                    S3_ACCESS_KEY_ID="" \
                    S3_SECRET_ACCESS_KEY="" \
                    $COMPOSE -f docker-compose.fullstack.yml config
                '''
            }
        }

        stage('Push Images') {
            when {
                expression { return params.PUSH_IMAGES }
            }
            steps {
                script {
                    def imagePrefix = params.GHCR_OWNER_REPO?.trim()
                    if (!imagePrefix) {
                        error('GHCR_OWNER_REPO is required when PUSH_IMAGES=true, for example ghcr.io/owner/mygram')
                    }
                    env.BACKEND_REMOTE_IMAGE = "${imagePrefix}-api:${env.EFFECTIVE_IMAGE_TAG}"
                    env.FRONTEND_REMOTE_IMAGE = "${imagePrefix}-web:${env.EFFECTIVE_IMAGE_TAG}"
                }
                sh 'docker tag "${BACKEND_LOCAL_IMAGE}" "${BACKEND_REMOTE_IMAGE}"'
                sh 'docker tag "${FRONTEND_LOCAL_IMAGE}" "${FRONTEND_REMOTE_IMAGE}"'
                withCredentials([
                    usernamePassword(
                        credentialsId: 'ghcr',
                        usernameVariable: 'GHCR_USERNAME',
                        passwordVariable: 'GHCR_TOKEN'
                    )
                ]) {
                    sh '''
                        set +x
                        printf "%s" "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
                    '''
                    sh 'docker push "${BACKEND_REMOTE_IMAGE}"'
                    sh 'docker push "${FRONTEND_REMOTE_IMAGE}"'
                }
            }
        }
    }

    post {
        success {
            echo "Phase E checks completed. Backend and frontend Dockerfiles built successfully in Jenkins."
            echo "Effective image tag: ${env.EFFECTIVE_IMAGE_TAG}"
        }
        failure {
            echo 'Phase E checks failed. Review the failing stage before moving to deploy automation.'
        }
    }
}
