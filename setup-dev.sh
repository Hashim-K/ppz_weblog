#!/bin/bash

# Setup script for Paparazzi UAV Log Parser development environment
# This script configures git hooks and installs necessary dependencies

echo "🚀 Setting up Paparazzi UAV Log Parser development environment..."
echo "=================================================================="

# Get the root directory of the repository
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

# Configure git hooks
echo ""
echo "🔧 Configuring Git hooks..."
if [ -d ".githooks" ]; then
    git config core.hooksPath .githooks
    chmod +x .githooks/pre-commit
    echo "✅ Git hooks configured successfully."
    echo "📍 Hooks path set to: .githooks"
else
    echo "❌ .githooks directory not found."
    exit 1
fi

# Backend setup
if [ -d "backend" ]; then
    echo ""
    echo "🐍 Setting up Backend environment..."
    cd backend
    
    echo "📦 Installing Python dependencies..."
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
        echo "✅ Backend dependencies installed."
    else
        echo "⚠️ requirements.txt not found in backend directory."
    fi
    
    echo "🛠️ Installing development tools..."
    pip install black isort flake8 mypy pytest autoflake
    echo "✅ Development tools installed."
    
    cd "$REPO_ROOT"
else
    echo "⚠️ Backend directory not found."
fi

# Frontend setup
if [ -d "frontend" ]; then
    echo ""
    echo "🌐 Setting up Frontend environment..."
    cd frontend
    
    # Check if Bun is installed
    if ! command -v bun &> /dev/null; then
        echo "❌ Bun not found. Please install Bun first:"
        echo "   curl -fsSL https://bun.sh/install | bash"
        echo "   # Then restart your terminal or source your shell profile"
        exit 1
    fi
    
    echo "📦 Installing frontend dependencies..."
    bun install
    echo "✅ Frontend dependencies installed."
    
    cd "$REPO_ROOT"
else
    echo "⚠️ Frontend directory not found."
fi

echo ""
echo "🎉 Development environment setup complete!"
echo "=================================================="
echo ""
echo "📚 Next steps:"
echo "1. Make changes to your code"
echo "2. Stage your changes: git add ."
echo "3. Commit your changes: git commit -m 'Your message'"
echo "4. The pre-commit hook will automatically run and ensure code quality"
echo ""
echo "🔧 Manual tools usage:"
echo "Backend:"
echo "  cd backend"
echo "  black . --line-length=88    # Format code"
echo "  isort . --profile black     # Sort imports"
echo "  flake8 .                    # Lint code"
echo "  mypy .                      # Type checking"
echo ""
echo "Frontend:"
echo "  cd frontend"
echo "  bunx prettier --write .     # Format code"
echo "  bun run lint                # Lint code"
echo "  bun tsc --noEmit           # Type checking"
echo "  bun run build              # Build application"
echo ""
echo "🐳 Docker commands:"
echo "  docker-compose up --build           # Production build"
echo "  docker-compose -f docker-compose.dev.yml up  # Development mode"
echo ""
echo "Happy coding! 🚀"
