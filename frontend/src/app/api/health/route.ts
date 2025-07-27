import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if we can connect to the backend
    const backendHealth = await fetch('http://localhost:8000/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const isBackendHealthy = backendHealth.ok;

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      backend: {
        status: isBackendHealthy ? 'healthy' : 'unhealthy',
        url: 'http://localhost:8000',
      },
      frontend: {
        status: 'healthy',
        version: process.env.npm_package_version || 'unknown',
      },
    });
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        backend: {
          status: 'unreachable',
          url: 'http://localhost:8000',
        },
        frontend: {
          status: 'healthy',
          version: process.env.npm_package_version || 'unknown',
        },
      },
      { status: 503 }
    );
  }
}
