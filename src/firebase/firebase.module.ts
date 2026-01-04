import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { resolve } from 'path';

@Global() // Agar module ini bisa dipakai di seluruh aplikasi
@Module({
  providers: [
    {
      provide: 'FIREBASE_CONNECTION',
      useFactory: () => {
        // Mencegah error inisialisasi ganda saat hot-reload
        if (!admin.apps.length) {
          let credential;

          // Cek apakah ada environment variable (Production / Railway)
          if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            try {
              const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
              credential = admin.credential.cert(serviceAccount);
            } catch (error) {
              console.error('Gagal parsing FIREBASE_SERVICE_ACCOUNT:', error);
              throw error;
            }
          } else {
            // Fallback ke file lokal (Development)
            const serviceAccountPath = resolve('./serviceAccountKey.json');
            credential = admin.credential.cert(require(serviceAccountPath));
          }

          admin.initializeApp({
            credential,
          });
        }
        return admin.firestore(); // Kita export Firestore-nya langsung
      },
    },
  ],
  exports: ['FIREBASE_CONNECTION'], // Izinkan module lain pakai provider ini
})
export class FirebaseModule { }