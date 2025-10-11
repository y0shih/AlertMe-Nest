import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import * as express from 'express';
import { Server } from 'http';

let cachedServer: Server;

export default async function handler(req: any, res: any) {
  if (!cachedServer) {
    const app = express();
    const adapter = new ExpressAdapter(app);
    const nestApp = await NestFactory.create(AppModule, adapter);
    await nestApp.init();
    cachedServer = app.listen();
  }

  return cachedServer.emit('request', req, res);
}
