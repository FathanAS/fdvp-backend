import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';

export interface ActivityLogDto {
    action: string;
    description: string;
    performedBy?: string;
    performedById?: string;
    targetId?: string;
    targetType?: 'user' | 'event' | 'admin' | 'other';
    metadata?: Record<string, any>;
}

@Injectable()
export class ActivityLoggerService {
    constructor(@Inject('FIREBASE_CONNECTION') private firestore: Firestore) { }

    /**
     * Log an activity to Firestore activity_logs collection
     * @param logData - Activity log data
     */
    async log(logData: ActivityLogDto): Promise<void> {
        try {
            // Resolve performer name if performedById is provided
            let performedBy = logData.performedBy || 'System';

            if (logData.performedById) {
                const userDoc = await this.firestore
                    .collection('users')
                    .doc(logData.performedById)
                    .get();

                if (userDoc.exists) {
                    const userData = userDoc.data();
                    performedBy = userData?.displayName || userData?.email || userData?.username || 'Admin';
                }
            }

            // Save to activity logs
            await this.firestore.collection('activity_logs').add({
                action: logData.action,
                description: logData.description,
                performedBy,
                performedById: logData.performedById || null,
                targetId: logData.targetId || null,
                targetType: logData.targetType || 'other',
                metadata: logData.metadata || {},
                timestamp: new Date().toISOString(),
                type: 'admin_action',
            });

            console.log(`[ACTIVITY LOG] ${logData.action}: ${logData.description}`);
        } catch (error) {
            console.error('[ACTIVITY LOGGER ERROR]', error);
            // Don't throw - logging should not break the main operation
        }
    }

    /**
     * Log user-related activities
     */
    async logUserActivity(
        action: 'CREATE_USER' | 'UPDATE_USER' | 'DELETE_USER' | 'UPDATE_ROLE',
        userId: string,
        performedById: string,
        details: { oldValue?: any; newValue?: any; userName?: string; userEmail?: string }
    ): Promise<void> {
        const descriptions = {
            CREATE_USER: `Created new user: ${details.userName || details.userEmail || userId}`,
            UPDATE_USER: `Updated user: ${details.userName || details.userEmail || userId}`,
            DELETE_USER: `Deleted user: ${details.userName || details.userEmail || userId} (Role: ${details.oldValue || 'user'})`,
            UPDATE_ROLE: `Changed role of ${details.userName || details.userEmail || userId} from '${details.oldValue}' to '${details.newValue}'`,
        };

        await this.log({
            action,
            description: descriptions[action],
            performedById,
            targetId: userId,
            targetType: 'user',
            metadata: details,
        });
    }

    /**
     * Log event-related activities
     */
    async logEventActivity(
        action: 'CREATE_EVENT' | 'UPDATE_EVENT' | 'DELETE_EVENT',
        eventId: string,
        performedById: string,
        details: { eventTitle?: string;[key: string]: any }
    ): Promise<void> {
        const descriptions = {
            CREATE_EVENT: `Created event: "${details.eventTitle || eventId}"`,
            UPDATE_EVENT: `Updated event: "${details.eventTitle || eventId}"`,
            DELETE_EVENT: `Deleted event: "${details.eventTitle || eventId}"`,
        };

        await this.log({
            action,
            description: descriptions[action],
            performedById,
            targetId: eventId,
            targetType: 'event',
            metadata: details,
        });
    }

    /**
     * Get recent activity logs
     */
    async getRecentLogs(limit: number = 50): Promise<any[]> {
        const snapshot = await this.firestore
            .collection('activity_logs')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
    }

    /**
     * Get activity logs filtered by type
     */
    async getLogsByType(targetType: string, limit: number = 50): Promise<any[]> {
        const snapshot = await this.firestore
            .collection('activity_logs')
            .where('targetType', '==', targetType)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
    }
}
