import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@Inject('FIREBASE_CONNECTION') private firestore: Firestore) { }

  // 1. UPDATE PROFILE & LOKASI
  async update(id: string, updateUserDto: UpdateUserDto) {
    // A. VALIDASI UNIQUE DISPLAY NAME
    if (updateUserDto.displayName) {
      const snapshot = await this.firestore.collection('users')
        .where('displayName', '==', updateUserDto.displayName)
        .get();

      // Cek apakah ada user LAIN (bukan diri sendiri) yang punya nama sama
      const duplicateUser = snapshot.docs.find(doc => doc.id !== id);

      if (duplicateUser) {
        throw new BadRequestException('Display Name sudah digunakan! Harap pilih nama lain.');
      }
    }

    // Sanitize photoURL if it exists in DTO
    const cleanData = { ...updateUserDto };
    if (cleanData.photoURL !== undefined) {
      cleanData.photoURL = cleanData.photoURL || null;
    }

    await this.firestore.collection('users').doc(id).update({
      ...cleanData,
      updatedAt: new Date().toISOString(),
    });
    return { message: 'Profil berhasil diperbarui!' };
  }

  // 2. CARI ORANG DI SEKITAR (Radius dalam KM)
  async findNearby(lat: number, long: number, excludeUserId: string, radiusKm: number = 50) {
    const snapshot = await this.firestore.collection('users').get();
    const nearbyUsers: Record<string, any>[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();

      // Leadership roles to exclude (Security Filter)
      const leadershipRoles = ['owner', 'administrator', 'superadmin', 'admin', 'staff', 'manager', 'founder', 'co-founder', 'executive'];
      const userRole = (data.role || 'user').toLowerCase();

      // LOGIKA FILTER BARU:
      // 1. Cek apakah user punya lokasi
      // 2. Cek apakah ID dokumen BUKAN ID user yang sedang mencari (excludeUserId)
      // 3. Cek apakah role BUKAN leadership
      if (data.latitude && data.longitude && doc.id !== excludeUserId && !leadershipRoles.includes(userRole)) {

        // Parse coordinate database (jaga-jaga kalau string)
        const dbLat = parseFloat(data.latitude);
        const dbLong = parseFloat(data.longitude);

        const distanceKm = this.getDistanceFromLatLonInKm(lat, long, dbLat, dbLong);

        // Hapus syarat "distance > 0.01" karena kita sudah filter by ID
        // Jadi kalau ada orang lain yang berdiri tepat di titik sama (0 km), tetap terdeteksi.
        if (distanceKm <= radiusKm) {

          // Format Jarak: Jika < 1 km tampilkan Meter
          let distanceLabel = "";
          if (distanceKm < 1) {
            distanceLabel = Math.round(distanceKm * 1000) + " m";
          } else {
            distanceLabel = distanceKm.toFixed(1) + " km";
          }

          nearbyUsers.push({
            id: doc.id,
            displayName: data.displayName || data.username,
            job: data.job || 'Member',
            instagram: data.instagram || '',
            distance: distanceLabel,
            distanceVal: distanceKm, // Simpan value asli untuk sorting
            role: data.role,
            photoURL: data.photoURL || null // <--- ADD THIS
          });
        }
      }
    });

    return nearbyUsers.sort((a, b) => a.distanceVal - b.distanceVal);
  }

  // 1. AMBIL MEMBER TERBARU (Untuk Landing Page)
  async getPublicMembers(limitNum: number = 8) {
    const snapshot = await this.firestore.collection('users')
      .orderBy('createdAt', 'desc') // Urutkan dari yang paling baru daftar
      .limit(limitNum)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        displayName: data.displayName || data.username || 'Member',
        job: data.job || 'Newbie',
        photoURL: data.photoURL || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        province: data.province || null,
        city: data.city || null,
        role: data.role || 'user',
      };
    });
  }

  // 2. HITUNG TOTAL MEMBER (Exclude Leadership)
  async countTotal() {
    // Role yang dianggap Leadership / Staff
    const leadershipRoles = ['owner', 'administrator', 'superadmin', 'admin', 'staff', 'manager'];

    // Gunakan filter not-in untuk mengecualikan leadership
    // Note: Pastikan field 'role' ada pada semua doc user. 
    // Jika ada user lama tanpa field role, query ini mungkin mengabaikannya (tergantung behavior firestore).
    // Alternatif aman: Hitung manual atau pastikan data bersih.
    const snapshot = await this.firestore.collection('users')
      .where('role', 'not-in', leadershipRoles)
      .count()
      .get();

    return { total: snapshot.data().count };
  }

  // 3. GLOBAL SEARCH MEMBER (Filter by Name or Job)
  async search(keyword: string, role: string) { // <--- Tambah param role
    const snapshot = await this.firestore.collection('users').get();

    // Mapping data
    const allUsers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        displayName: data.displayName || data.username || 'No Name',
        job: data.job || 'Member',
        photoURL: data.photoURL || null,
        instagram: data.instagram || '',
        searchableName: (data.displayName || data.username || '').toLowerCase(),
        searchableJob: (data.job || '').toLowerCase(),
        // Simpan role asli untuk filter exact match (opsional) atau pakai searchableJob
        originalJob: data.job || '',
        role: data.role || 'user',
        province: data.province || null,
        city: data.city || null,
      };
    });

    // FILTER LOGIC
    return allUsers.filter(user => {
      // 1. Filter Keyword (Nama ATAU Job) - Jika keyword kosong, anggap TRUE (lolos)
      const matchesKeyword = keyword
        ? user.searchableName.includes(keyword.toLowerCase()) || user.searchableJob.includes(keyword.toLowerCase())
        : true;

      // 2. Filter Role (Multi-Select Support)
      let matchesRole = true;
      if (role && role !== 'All') {
        const targetRoles = role.toLowerCase().split(',').filter(Boolean); // Split comma & remove empty
        // Cek apakah job user mengandung SALAH SATU dari role yang dipilih
        matchesRole = targetRoles.some(target => user.searchableJob.includes(target));
      }

      return matchesKeyword && matchesRole;
    }).slice(0, 50); // Limit hasil agar tidak terlalu berat
  }

  // RUMUS MATEMATIKA MENGHITUNG JARAK (HAVERSINE)
  private getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius bumi dalam km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  // 4. FIND ONE & INCREMENT VISITOR
  async findOne(id: string, viewerId?: string) {
    const userRef = this.firestore.collection('users').doc(id);

    // Increment visitor count ONLY if viewer is NOT the owner
    if (viewerId !== id) {
      await userRef.update({
        visitorCount: FieldValue.increment(1)
      }).catch(() => {
        // Ignore error if user doesn't exist
      });
    }

    const doc = await userRef.get();
    if (!doc.exists) return null;

    return { id: doc.id, ...doc.data() };
  }

  // 5. DELETE USER (Admin Operation)
  async deleteUser(userId: string) {
    const userRef = this.firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new BadRequestException('User not found');
    }

    const userData = userDoc.data();
    await userRef.delete();

    return {
      message: 'User deleted successfully',
      deletedUser: {
        id: userId,
        displayName: userData?.displayName || userData?.email || 'Unknown',
        email: userData?.email,
        role: userData?.role || 'user'
      }
    };
  }

  // 6. UPDATE USER ROLE (Admin Operation)
  async updateRole(userId: string, newRole: string) {
    const userRef = this.firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new BadRequestException('User not found');
    }

    const oldRole = userDoc.data()?.role || 'user';

    await userRef.update({
      role: newRole,
      updatedAt: new Date().toISOString(),
    });

    return {
      message: 'User role updated successfully',
      user: {
        id: userId,
        displayName: userDoc.data()?.displayName || userDoc.data()?.email,
        email: userDoc.data()?.email,
        oldRole,
        newRole,
      }
    };
  }

  // 7. SAVE FCM TOKEN
  async saveFcmToken(userId: string, token: string) {
    if (!token) return;
    const userRef = this.firestore.collection('users').doc(userId);
    // Gunakan arrayUnion agar tidak duplikat
    await userRef.update({
      fcmTokens: FieldValue.arrayUnion(token)
    });
    return { message: 'Token saved' };
  }

  // 8. SEND PUSH NOTIFICATION
  async sendPushNotification(recipientId: string, title: string, body: string, dataPayload: any = {}) {
    try {
      const userDoc = await this.firestore.collection('users').doc(recipientId).get();
      const userData = userDoc.data();
      const tokens = userData?.fcmTokens || [];

      if (!tokens || tokens.length === 0) return;

      const admin = await import('firebase-admin');

      // DATA-ONLY PAYLOAD (Hybrid Sync Strategy)
      // This forces the Service Worker to handle the display, ensuring consistency.
      const message = {
        tokens: tokens,
        data: {
          title,
          body,
          type: 'chat_message',
          click_action: '/chat',
          timestamp: new Date().toISOString(),
          ...dataPayload
        },
        android: { priority: 'high' as const },
        webpush: {
          headers: {
            Urgency: "high",
            TTL: "86400" // 24 hours
          },
          fcmOptions: {
            link: "/chat"
          }
        }
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      // Cleanup invalid tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });
        if (failedTokens.length > 0) {
          await this.firestore.collection('users').doc(recipientId).update({
            fcmTokens: FieldValue.arrayRemove(...failedTokens)
          });
        }
      }

    } catch (error) {
      console.error("FCM Send Error:", error);
    }
  }
}
