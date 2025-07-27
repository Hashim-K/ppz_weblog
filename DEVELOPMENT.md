# Development Guide

This guide covers Docker development, CI/CD, and deployment for the Paparazzi UAV Log Parser system.

## 🐳 Docker Development

### Prerequisites
- Docker and Docker Compose installed
- Git hooks configured (optional but recommended)

### Quick Start with Docker

#### Production Build
```bash
# Build and run both services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
```

#### Development Mode
```bash
# Run in development mode with hot reload
docker-compose -f docker-compose.dev.yml up --build

# Or run services separately
docker-compose -f docker-compose.dev.yml up backend-dev
docker-compose -f docker-compose.dev.yml up frontend-dev
```

### Individual Service Management

#### Frontend Only
```bash
# Build frontend image
docker build -f frontend/.docker/Dockerfile.live -t ppz-weblog-frontend ./frontend

# Run frontend container
docker run -p 3000:3000 ppz-weblog-frontend
```

#### Backend Only
```bash
# Build backend image
docker build -f backend/.docker/Dockerfile.live -t ppz-weblog-backend ./backend

# Run backend container with volume mounts
docker run -p 8000:8000 \
  -v $(pwd)/backend/input:/app/input \
  -v $(pwd)/backend/output:/app/output \
  ppz-weblog-backend
```

### Health Checks

Both services include health checks:
- Frontend: `http://localhost:3000/api/health`
- Backend: `http://localhost:8000/health`

## 🔧 Git Hooks Setup

### Frontend Hooks
```bash
cd frontend
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
```

### Backend Hooks
```bash
cd backend
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks

# Install development dependencies for hooks
pip install black isort flake8 mypy pytest
```

### What the Hooks Do

**Frontend (`frontend/.githooks/pre-commit`):**
- Auto-formats code with Prettier
- Runs ESLint checks
- Validates TypeScript types
- Attempts production build
- Stages formatting changes automatically

**Backend (`backend/.githooks/pre-commit`):**
- Formats Python code with Black
- Sorts imports with isort
- Runs Flake8 linting
- Performs mypy type checking
- Runs tests (if available)
- Validates FastAPI app imports

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow

The `.github/workflows/ci-cd.yml` file defines a comprehensive pipeline:

#### 1. Frontend CI
- **Linting**: ESLint checks
- **Type Checking**: TypeScript validation
- **Build**: Next.js production build
- **Caching**: Bun dependencies

#### 2. Backend CI
- **Formatting**: Black and isort checks
- **Linting**: Flake8 validation
- **Type Checking**: mypy validation
- **Import Testing**: FastAPI app validation
- **Tests**: pytest execution (if tests exist)

#### 3. Security Scanning
- **Trivy**: Vulnerability scanning
- **SARIF Upload**: Results to GitHub Security tab

#### 4. Docker Image Building
- **Multi-platform**: AMD64 and ARM64 support
- **Registry**: GitHub Container Registry (ghcr.io)
- **Caching**: GitHub Actions cache
- **Tagging**: Branch-based and SHA-based tags

#### 5. Deployment
- **Staging**: Placeholder for deployment logic
- **Production**: Triggered on main branch pushes

### Triggering the Pipeline

```bash
# Trigger CI on feature branch
git checkout -b feature/my-feature
git commit -m "Add new feature"
git push origin feature/my-feature

# Create pull request to trigger full CI

# Deploy to production
git checkout main
git merge feature/my-feature
git push origin main  # Triggers build and deploy
```

### Container Registry

Images are published to GitHub Container Registry:
- Frontend: `ghcr.io/{owner}/ppz_weblog-frontend:latest`
- Backend: `ghcr.io/{owner}/ppz_weblog-backend:latest`

## 📦 Deployment

### Environment Variables

#### Frontend
- `NODE_ENV`: production/development
- `NEXT_TELEMETRY_DISABLED`: 1 (to disable Next.js telemetry)

#### Backend
- `PYTHONPATH`: /app
- `PYTHONDONTWRITEBYTECODE`: 1
- `PYTHONUNBUFFERED`: 1

### Volume Mounts

The backend requires persistent volumes for:
- `/app/input`: Upload directory for log files
- `/app/output`: Processed session data
- `/app/processed_logs`: Archive of original files

### Production Deployment Example

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    image: ghcr.io/{owner}/ppz_weblog-backend:latest
    ports:
      - "8000:8000"
    volumes:
      - /data/ppz-weblog/input:/app/input
      - /data/ppz-weblog/output:/app/output
      - /data/ppz-weblog/processed_logs:/app/processed_logs
    restart: unless-stopped

  frontend:
    image: ghcr.io/{owner}/ppz_weblog-frontend:latest
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped
```

### Kubernetes Deployment

```yaml
# k8s-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ppz-weblog-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ppz-weblog-backend
  template:
    metadata:
      labels:
        app: ppz-weblog-backend
    spec:
      containers:
      - name: backend
        image: ghcr.io/{owner}/ppz_weblog-backend:latest
        ports:
        - containerPort: 8000
        volumeMounts:
        - name: data-volume
          mountPath: /app/input
          subPath: input
        - name: data-volume
          mountPath: /app/output
          subPath: output
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: ppz-weblog-data
```

## 🛠️ Development Commands

### Docker Commands
```bash
# Build images
docker-compose build

# Run with logs
docker-compose up

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes (careful!)
docker-compose down -v

# Rebuild and run
docker-compose up --build --force-recreate
```

### Debugging
```bash
# Access running container
docker-compose exec backend bash
docker-compose exec frontend sh

# View container logs
docker logs ppz_weblog_backend_1
docker logs ppz_weblog_frontend_1

# Check container health
docker inspect --format='{{.State.Health.Status}}' ppz_weblog_backend_1
```

## 🔍 Troubleshooting

### Common Issues

#### Frontend Build Failures
- Check Node.js version compatibility
- Ensure all dependencies are installed
- Verify TypeScript configuration
- Check for ESLint errors

#### Backend Import Errors
- Verify Python version (3.11+ required)
- Check all dependencies in requirements.txt
- Ensure PYTHONPATH is set correctly
- Validate FastAPI app structure

#### Docker Build Issues
- Check .dockerignore files
- Verify base image availability
- Ensure sufficient disk space
- Check Docker daemon status

#### Health Check Failures
- Verify service ports are exposed
- Check network connectivity between services
- Ensure health endpoints are implemented
- Validate environment variables

### Performance Optimization

#### Frontend
- Enable Next.js standalone output
- Use Bun for faster builds
- Implement proper caching strategies
- Optimize bundle size

#### Backend
- Use uvicorn with appropriate worker settings
- Implement proper async/await patterns
- Optimize file I/O operations
- Use appropriate logging levels

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
