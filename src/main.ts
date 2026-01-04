import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { credential } from 'firebase-admin';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Izinkan Frontend Next.js mengakses Backend ini
  app.enableCors({
    origin: 'http://localhost:3000', // Sesuaikan dengan URL frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 2. Ubah Port ke 3001 (agar tidak bentrok dengan Next.js)
  await app.listen(3001);
  console.log(`Backend FDVP berjalan di: http://localhost:3001`);
}
bootstrap();