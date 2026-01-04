import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { credential } from 'firebase-admin';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Izinkan Frontend Next.js mengakses Backend ini
  app.enableCors({
    origin: true, // Mengizinkan semua domain sementara (untuk debugging). Nanti bisa diganti ke URL Vercel spesifik.
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 2. Ubah Port agar dinamis (Wajib untuk Railway)
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend FDVP berjalan di: http://localhost:${port}`);
}
bootstrap();