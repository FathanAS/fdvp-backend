import { Inject, Injectable } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';

@Injectable()
export class DashboardService {
    constructor(@Inject('FIREBASE_CONNECTION') private firestore: Firestore) { }

    async getStats() {
        // 1. Count Users
        const usersSnap = await this.firestore.collection('users').count().get();

        // 2. Count Active Events
        const eventsSnap = await this.firestore.collection('events').count().get();

        // 3. Count Registrations (Total Tickets)
        const regSnap = await this.firestore.collection('event_registrations').count().get();

        // 4. Count Chat Messages (Activity)
        const msgSnap = await this.firestore.collection('messages').count().get();

        return {
            totalUsers: usersSnap.data().count,
            totalEvents: eventsSnap.data().count,
            totalRegistrations: regSnap.data().count,
            totalMessages: msgSnap.data().count,
        };
    }

    async getRecentActivity() {
        // Logs from Events Service (activity_logs) or System logs
        const snapshot = await this.firestore.collection('activity_logs')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    async getChartData() {
        // Example: Users grouped by Month (Requires createdAt field on Users)
        // Since Firestore aggregation by date is hard, we might fetch last 100 users and group in JS for MVP
        const snapshot = await this.firestore.collection('users')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        // Group by Month/Year
        const grouped = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.createdAt) {
                const date = new Date(data.createdAt);
                const key = `${date.getFullYear()}-${date.getMonth() + 1}`; // YYYY-M
                grouped[key] = (grouped[key] || 0) + 1;
            }
        });

        return Object.keys(grouped).map(key => ({
            name: key,
            value: grouped[key]
        })).reverse();
    }
}
