import client from 'prom-client';

client.collectDefaultMetrics({ prefix: 'newsops_' });

export const httpRequests = new client.Counter({
  name: 'newsops_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});

export const responseTime = new client.Histogram({
  name: 'newsops_http_request_duration_ms',
  help: 'Request duration in milliseconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [50, 100, 200, 300, 500, 1000, 2000]
});

export const metricsRegistry = client.register;
