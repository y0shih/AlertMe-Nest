import { handler } from '../src/main';

async function run() {
    try {
        const res = await handler({ httpMethod: 'GET', path: '/' }, {} as any);
        console.log('handler returned', typeof res);
    } catch (err) {
        console.error('handler threw', err);
        process.exitCode = 1;
    }
}

run();
