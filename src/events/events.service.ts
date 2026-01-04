import { Inject, Injectable } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { Firestore } from 'firebase-admin/firestore';

@Injectable()
export class EventsService {
  constructor(@Inject('FIREBASE_CONNECTION') private firestore: Firestore) { }

  // --- HELPER: LOG ACTIVITY DENGAN NAMA ADMIN ---
  private async logActivity(action: string, description: string, adminId: string) {
    let adminName = 'Unknown Admin';

    // 1. Cari Nama Admin di Database Users
    if (adminId) {
      const userSnap = await this.firestore.collection('users').doc(adminId).get();
      if (userSnap.exists) {
        const userData = userSnap.data();
        // Ambil nama (prioritas: displayName -> username -> email -> 'Admin')
        adminName = userData?.displayName || userData?.username || userData?.email || 'Admin';
      }
    }

    // 2. Simpan ke Log
    await this.firestore.collection('activity_logs').add({
      action,
      description,
      adminName,
      adminId: adminId || null,
      timestamp: new Date().toISOString(),
      type: 'admin_action'
    });
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

  // 1. CREATE EVENT (Sudah ada createdBy di DTO)
  async create(createEventDto: CreateEventDto) {
    const docRef = await this.firestore.collection('events').add({
      ...createEventDto,
      imageHeader: createEventDto.imageHeader || null,
      createdAt: new Date().toISOString(),
    });

    // Panggil log dengan ID pembuat
    await this.logActivity('CREATE', `Membuat event: "${createEventDto.title}"`, createEventDto.createdBy);

    return { status: 'success', id: docRef.id };
  }

  // LOGIKA AMBIL SEMUA EVENT
  // LOGIKA AMBIL SEMUA EVENT (Updated: Support Search & Filter)
  async findAll(query?: { search?: string; status?: string }) {
    let collectionRef: FirebaseFirestore.Query = this.firestore.collection('events');

    // Filter by Status (Exact Match)
    if (query?.status && query.status !== 'All') {
      collectionRef = collectionRef.where('status', '==', query.status);
    }

    const snapshot = await collectionRef.get();

    // Mapping Data
    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        imageHeader: data.imageHeader || null
      };
    });

    // Filter by Search (Client-side filtering for flexibility)
    if (query?.search) {
      const lowerSearch = query.search.toLowerCase();
      return events.filter(event =>
        (event['title'] || '').toLowerCase().includes(lowerSearch) ||
        (event['description'] || '').toLowerCase().includes(lowerSearch) ||
        (event['location'] || '').toLowerCase().includes(lowerSearch)
      );
    }

    return events;
  }
  async findOne(id: string) {
    const doc = await this.firestore.collection('events').doc(id).get();

    if (!doc.exists) {
      throw new Error('Event tidak ditemukan!');
    }

    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      imageHeader: data?.imageHeader || null
    };
  }
  // 2. UPDATE EVENT (Kita butuh param tambahan: adminId)
  async update(id: string, updateEventDto: any, adminId: string) { // Tambah param adminId
    // Sanitize imageHeader if present
    const cleanUpdateData = { ...updateEventDto };
    if (cleanUpdateData.imageHeader !== undefined) {
      cleanUpdateData.imageHeader = cleanUpdateData.imageHeader || null;
    }

    await this.firestore.collection('events').doc(id).update({
      ...cleanUpdateData,
      updatedAt: new Date().toISOString()
    });

    const title = updateEventDto.title ? `"${updateEventDto.title}"` : 'sebuah event';
    await this.logActivity('UPDATE', `Mengubah data event: ${title}`, adminId);

    return { message: 'Event berhasil diupdate' };
  }

  // 3. REMOVE EVENT (Kita butuh param tambahan: adminId)
  async remove(id: string, adminId: string) { // Tambah param adminId
    const doc = await this.firestore.collection('events').doc(id).get();
    const title = doc.exists ? doc.data()?.title : 'Unknown Event';

    await this.firestore.collection('events').doc(id).delete();

    await this.logActivity('DELETE', `Menghapus event: "${title}"`, adminId);

    return { message: 'Event berhasil dihapus' };
  }
}