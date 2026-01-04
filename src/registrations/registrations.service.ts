import { Inject, Injectable } from '@nestjs/common';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { Firestore } from 'firebase-admin/firestore';

@Injectable()
export class RegistrationsService {
  // AMBIL PESERTA BERDASARKAN EVENT ID
  async findByEvent(eventId: string) {
    const snapshot = await this.firestore.collection('registrations')
      .where('eventId', '==', eventId)
      .get();

    if (snapshot.empty) return [];

    // Kita ambil juga data usernya biar Admin tau namanya siapa
    const participants = await Promise.all(snapshot.docs.map(async (doc) => {
      const regData = doc.data();

      // Ambil detail user dari koleksi 'users'
      const userSnap = await this.firestore.collection('users').doc(regData.userId).get();
      const userData = userSnap.exists ? userSnap.data() : {};

      return {
        registrationId: doc.id,
        userId: regData.userId,
        registrationDate: regData.registrationDate,
        status: regData.status,
        // Data User Gabungan
        displayName: userData?.displayName || userData?.username || 'Unknown',
        email: userData?.email || regData.userEmail || '-',
        job: userData?.job || '-',
        instagram: userData?.instagram || '-'
      };
    }));

    return participants;
  }
  constructor(@Inject('FIREBASE_CONNECTION') private firestore: Firestore) { }

  async create(createRegistrationDto: CreateRegistrationDto) {
    // 1. Cek apakah user sudah pernah daftar di event ini (Mencegah duplikat)
    const check = await this.firestore.collection('registrations')
      .where('eventId', '==', createRegistrationDto.eventId)
      .where('userId', '==', createRegistrationDto.userId)
      .get();

    if (!check.empty) {
      throw new Error('Anda sudah terdaftar di event ini!');
    }

    // 2. Simpan pendaftaran baru
    const docRef = await this.firestore.collection('registrations').add({
      ...createRegistrationDto,
      registrationDate: new Date().toISOString(),
      status: 'booked' // Status Awal (Belum Scan)
    });

    return {
      status: 'success',
      id: docRef.id,
      message: 'Pendaftaran berhasil!'
    };
  }

  async findByUser(userId: string) {
    // 1. Ambil data pendaftaran user ini
    const snapshot = await this.firestore.collection('registrations')
      .where('userId', '==', userId)
      .get();

    if (snapshot.empty) return [];

    // 2. Loop setiap pendaftaran, lalu ambil detail Event-nya (Manual Join)
    const myTickets = await Promise.all(snapshot.docs.map(async (doc) => {
      const regData = doc.data();

      // Ambil data Event berdasarkan eventId yang ada di tiket
      const eventSnap = await this.firestore.collection('events').doc(regData.eventId).get();
      const eventData = eventSnap.exists ? eventSnap.data() : null;

      if (!eventData) return null; // Jika event dihapus, return null agar bisa difilter

      return {
        registrationId: doc.id,
        status: regData.status,
        registrationDate: regData.registrationDate,
        // Gabungkan data event (jika eventnya masih ada)
        eventTitle: eventData?.title || 'Unknown Event',
        eventImage: eventData?.imageHeader || '',
        eventDate: eventData?.date || '',
        eventLocation: eventData?.location || '',
        eventId: regData.eventId,
      };
    }));

    // Filter out null values (where event was deleted)
    return myTickets.filter(ticket => ticket !== null);
  }

  // Bisa tambahkan findAllByEvent untuk Admin melihat peserta nanti

  // VALIDASI CHECK-IN (SCAN QR)
  async validateCheckIn(registrationId: string) {
    const docRef = this.firestore.collection('registrations').doc(registrationId);
    const doc = await docRef.get();

    // 1. Cek Apakah Tiket Ada?
    if (!doc.exists) {
      throw new Error('TIKET TIDAK DITEMUKAN / TIDAK VALID');
    }

    const data = doc.data();
    if (!data) throw new Error('DATA TIKET TIDAK VALID');

    // 2. Cek Apakah Statusnya Cancelled?
    if (data.status === 'cancelled') {
      throw new Error('TIKET SUDAH DIBATALKAN');
    }

    // 3. Cek Apakah Sudah Dipakai? (Mencegah Tiket Ganda)
    if (data.status === 'confirmed') {
      // Kita kembalikan detailnya tapi kasih tau sudah dipakai
      return {
        valid: false,
        message: 'TIKET SUDAH DIGUNAKAN SEBELUMNYA!',
        user: await this.getUserDetail(data.userId), // Helper ambil nama user
        eventId: data.eventId
      };
    }

    // 4. JIKA VALID: Update status jadi 'confirmed' (Hadir)
    await docRef.update({
      status: 'confirmed',
      checkInTime: new Date().toISOString()
    });

    return {
      valid: true,
      message: 'CHECK-IN BERHASIL',
      user: await this.getUserDetail(data!.userId),
      eventId: data!.eventId
    };
  }

  // Helper kecil untuk ambil nama user (biar panitia bisa sapa)
  private async getUserDetail(userId: string) {
    const userSnap = await this.firestore.collection('users').doc(userId).get();
    return userSnap.exists ? userSnap.data() : { displayName: 'Unknown' };
  }
}