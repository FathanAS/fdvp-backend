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
          // Ambil file JSON yang tadi kita taruh di root
          const serviceAccountPath = resolve('./serviceAccountKey.json');
          
          admin.initializeApp({
            credential: admin.credential.cert(require(serviceAccountPath)),
          });
        }
        return admin.firestore(); // Kita export Firestore-nya langsung
      },
    },
  ],
  exports: ['FIREBASE_CONNECTION'], // Izinkan module lain pakai provider ini
})
export class FirebaseModule {}