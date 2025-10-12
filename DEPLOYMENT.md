# 🚀 Deployment Guide for MyGram API

This guide covers the complete deployment process using Docker, GitHub Actions, Jenkins, and Coolify.

## 📋 Prerequisites

### Required Services
- ✅ **GitHub Repository** - Source code hosting
- ✅ **Docker Hub/GHCR** - Container registry
- ✅ **Jenkins** (jenkins.egodev.tech) - CI/CD pipeline
- ✅ **Coolify** - Deployment platform
- ✅ **VPS/Server** - Hosting environment

### Required Accounts & Access
- GitHub account with repository access
- Docker registry account (GitHub Container Registry recommended)
- Jenkins admin access
- Coolify admin access
- VPS/server with Docker installed

## 🏗️ Deployment Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│                 │    │                  │    │                 │
│  GitHub Actions │───▶│  Jenkins Pipeline │───▶│  Coolify Deploy │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│                 │    │                  │    │                 │
│  Docker Registry│    │  Testing & QA    │    │  Production VPS │
│  (GHCR)         │    │  Environment     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔧 Step-by-Step Setup

### Step 1: GitHub Repository Setup

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Add CI/CD configuration"
   git push origin final-project
   ```

2. **Set up GitHub Secrets** (Repository Settings → Secrets and variables → Actions):
   ```
   JENKINS_API_TOKEN=your_jenkins_api_token
   JENKINS_URL=https://jenkins.egodev.tech
   COOLIFY_API_TOKEN=your_coolify_api_token
   COOLIFY_URL=your_coolify_instance_url
   ```

### Step 2: Docker Registry Configuration

1. **Enable GitHub Container Registry**:
   - Go to your GitHub repository
   - Settings → Developer settings → Personal access tokens
   - Create token with `write:packages` permission

2. **Test Docker build locally**:
   ```bash
   docker build -t mygram:test .
   docker run -p 8080:8080 mygram:test
   ```

### Step 3: Jenkins Pipeline Setup

1. **Access Jenkins** at `jenkins.egodev.tech`

2. **Create New Pipeline**:
   - New Item → Pipeline
   - Name: `mygram-deployment`
   - Pipeline script from SCM → Git
   - Repository URL: `https://github.com/ffigoperdana/go-dts-chapter3.git`
   - Script Path: `Jenkinsfile`

3. **Configure Jenkins Credentials**:
   ```
   COOLIFY_API_TOKEN - Secret text
   COOLIFY_URL - String parameter
   DOCKER_REGISTRY_CREDENTIALS - Username/Password
   ```

4. **Install Required Jenkins Plugins**:
   - Docker Pipeline
   - HTTP Request
   - Build Timeout
   - AnsiColor

### Step 4: Coolify Application Setup

1. **Create New Application** in Coolify:
   - Name: `mygram-api`
   - Source: Docker Image
   - Registry: `ghcr.io/ffigoperdana/go-dts-chapter3`

2. **Configure Environment Variables**:
   ```env
   PORT=8080
   GIN_MODE=release
   DB_HOST=postgres
   DB_USER=postgres
   DB_PASSWORD=your_secure_password
   DB_NAME=finalproject
   JWT_SECRET=your_super_secure_jwt_secret
   ```

3. **Set up Database**:
   - Add PostgreSQL service
   - Database name: `finalproject`
   - User: `postgres`

4. **Configure Health Checks**:
   - Health Check URL: `/health`
   - Port: `8080`

### Step 5: Domain & SSL Configuration

1. **Configure Domain** in Coolify:
   - Add your domain: `api.yourdomain.com`
   - Enable SSL/TLS
   - Configure reverse proxy

2. **DNS Configuration**:
   ```
   A Record: api.yourdomain.com → Your VPS IP
   ```

## 🔄 Deployment Workflow

### Automatic Deployment Process

1. **Developer pushes code** to `final-project` or `main` branch
2. **GitHub Actions triggers**:
   - Runs tests
   - Builds Docker image
   - Pushes to registry
   - Triggers Jenkins
3. **Jenkins Pipeline executes**:
   - Pulls latest image
   - Runs integration tests
   - Performs security scans
   - Deploys via Coolify API
4. **Coolify handles deployment**:
   - Pulls new image
   - Updates containers
   - Runs health checks
   - Routes traffic

### Manual Deployment

```bash
# Build and push manually
docker build -t ghcr.io/ffigoperdana/go-dts-chapter3:manual .
docker push ghcr.io/ffigoperdana/go-dts-chapter3:manual

# Trigger Jenkins deployment
curl -X POST \
  -H "Authorization: Bearer YOUR_JENKINS_TOKEN" \
  "https://jenkins.egodev.tech/job/mygram-deployment/buildWithParameters?IMAGE_TAG=manual"
```

## 🧪 Testing Strategy

### Local Testing
```bash
# Unit tests
go test ./...

# Integration tests with Docker
docker-compose -f docker-compose.test.yml up -d
go test ./tests/integration/...
docker-compose -f docker-compose.test.yml down
```

### Staging Environment Testing
- Automatic deployment to staging on `develop` branch
- Integration tests run in Jenkins
- Manual QA testing environment

### Production Testing
- Smoke tests after deployment
- Health check monitoring
- Performance testing (optional)

## 📊 Monitoring & Observability

### Health Endpoints
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check (includes DB)
- `GET /health/live` - Liveness check

### Logs & Metrics
- Application logs via Docker
- Coolify monitoring dashboard
- Jenkins build logs
- GitHub Actions logs

## 🔒 Security Considerations

### Secrets Management
- Use environment variables for sensitive data
- Store secrets in GitHub Secrets
- Use Jenkins credential store
- Coolify environment variable encryption

### Container Security
- Non-root user in Docker
- Minimal base image (scratch)
- Security scanning in CI/CD
- Regular dependency updates

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**:
   ```bash
   # Check go.mod dependencies
   go mod tidy
   go mod verify
   
   # Test Docker build
   docker build --no-cache -t test .
   ```

2. **Database Connection Issues**:
   ```bash
   # Test database connectivity
   docker-compose up postgres
   # Check connection string in environment variables
   ```

3. **Health Check Failures**:
   ```bash
   # Test health endpoints
   curl http://localhost:8080/health
   curl http://localhost:8080/health/ready
   ```

4. **Deployment Failures**:
   - Check Jenkins logs
   - Verify Coolify configuration
   - Check environment variables
   - Verify database migration status

### Rollback Procedure

1. **Automatic Rollback** (in Jenkins):
   - Failed health checks trigger rollback
   - Previous working image restored

2. **Manual Rollback**:
   ```bash
   # Deploy previous version
   curl -X POST \
     -H "Authorization: Bearer YOUR_JENKINS_TOKEN" \
     "https://jenkins.egodev.tech/job/mygram-deployment/buildWithParameters?IMAGE_TAG=previous_working_tag"
   ```

## 📈 Performance & Scaling

### Resource Requirements
- **Minimum**: 512MB RAM, 1 CPU core
- **Recommended**: 1GB RAM, 2 CPU cores
- **Database**: 1GB RAM, 20GB storage

### Scaling Options
- Horizontal scaling via Coolify
- Load balancing configuration
- Database read replicas
- Caching with Redis

## 🎯 Portfolio Benefits

This deployment setup demonstrates:
- **DevOps Expertise**: Complete CI/CD pipeline
- **Cloud Architecture**: Modern deployment patterns
- **Security Best Practices**: Secrets management, scanning
- **Monitoring & Observability**: Health checks, logging
- **Scalability**: Container orchestration
- **Professional Workflow**: Code quality, testing, deployment automation

## 📝 Next Steps

1. **Set up monitoring alerts**
2. **Implement automated backups**
3. **Add performance monitoring**
4. **Set up log aggregation**
5. **Implement blue-green deployments**
6. **Add API rate limiting**
7. **Set up SSL certificate auto-renewal**

---

**🚀 Your Go social media API is now ready for professional deployment!**