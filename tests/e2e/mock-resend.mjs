// Stand-in for Resend's HTTP API during e2e runs (RESEND_API_URL points here). Records every
// email it is sent; GET /emails returns them, newest last. Never used outside tests.
import { createServer } from 'node:http';

const port = Number(process.env.MOCK_RESEND_PORT ?? 3999);
const emails = [];

createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/emails') {
    let body = '';
    request.on('data', (chunk) => (body += chunk));
    request.on('end', () => {
      emails.push({ authorization: request.headers.authorization ?? null, ...JSON.parse(body) });
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ id: `mock-${emails.length}` }));
    });
    return;
  }
  if (request.method === 'GET' && request.url === '/emails') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(emails));
    return;
  }
  response.writeHead(request.url === '/health' ? 200 : 404);
  response.end();
}).listen(port, '127.0.0.1');
