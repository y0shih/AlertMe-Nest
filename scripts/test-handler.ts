import * as http from 'http';

// Use require() to avoid default interop issues under ts-node
const mod = require('../src/main');
const handler: any = mod && (mod.default ?? mod);

async function run() {
    console.log('Loaded module keys:', Object.keys(mod || {}));
    console.log('Resolved handler type:', typeof handler);
    // Start a temporary HTTP server that delegates to the exported handler
    const server = http.createServer((req, res) => {
        // handler might return a promise or handle the response directly
        try {
            const maybePromise = handler(req as any, res as any);
            if (maybePromise && typeof (maybePromise as any).catch === 'function') {
                (maybePromise as any).catch((err: any) => {
                    console.error('handler threw', err);
                    try { res.statusCode = 500; res.end('Internal Server Error'); } catch (_) { }
                });
            }
        } catch (err) {
            console.error('handler sync threw', err);
            try { res.statusCode = 500; res.end('Internal Server Error'); } catch (_) { }
        }
    });

    await new Promise<void>((resolve, reject) => {
        server.listen(0, '127.0.0.1', () => resolve());
        server.on('error', (e) => reject(e));
    });

    const port = (server.address() as any).port;
    console.log('Test server listening on port', port);

    try {
        await new Promise<void>((resolve, reject) => {
            const req = http.request({ hostname: '127.0.0.1', port, path: '/', method: 'GET' }, (res) => {
                let body = '';
                res.on('data', (chunk) => (body += chunk));
                res.on('end', () => {
                    console.log('Response status:', res.statusCode);
                    console.log('Response body length:', body.length);
                    resolve();
                });
            });
            req.on('error', (e) => reject(e));
            req.end();
        });
    } finally {
        server.close();
    }

    console.log('handler completed');
}

run().catch((err) => {
    console.error('test runner error', err);
    process.exitCode = 1;
});
