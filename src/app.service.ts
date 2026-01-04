import { Injectable, Inject } from '@nestjs/common';
import { Firestore, FieldValue } from 'firebase-admin/firestore';

@Injectable()
export class AppService {
  constructor(@Inject('FIREBASE_CONNECTION') private firestore: Firestore) { }

  getHello(): string {
    return 'Hello World!';
  }

  async checkHealth() {
    const start = Date.now();
    try {
      // 1. Cek Koneksi Database (Coba baca 1 dokumen simple)
      await this.firestore.collection('users').limit(1).get();

      // 2. Hitung Latency (Waktu proses)
      const latency = Date.now() - start;

      return {
        status: 'UP',
        health: latency < 500 ? 100 : 80,
        latency: `${latency}ms`,
        database: 'Connected'
      };
    } catch (error) {
      return {
        status: 'DOWN',
        health: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getDataVisitor() {
    const statsRef = this.firestore.collection('metadata').doc('stats');

    // Atomically increment the visitor count
    try {
      await statsRef.update({
        visitorCount: FieldValue.increment(1)
      });
    } catch (e) {
      // If doc doesn't exist, create it
      await statsRef.set({ visitorCount: 1 }, { merge: true });
    }

    const doc = await statsRef.get();
    return { count: doc.data()?.visitorCount || 0 };
  }
}
