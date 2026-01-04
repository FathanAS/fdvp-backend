import { Controller, Get, Delete, Param, Inject, Query, Body, Patch } from '@nestjs/common';
import { Firestore, FieldValue } from 'firebase-admin/firestore';

@Controller('chat')
export class ChatController {
    constructor(@Inject('FIREBASE_CONNECTION') private firestore: Firestore) { }

    // 1. GET HISTORY (Dengan Filter "Delete for Me")
    @Get('history/:roomId')
    async getChatHistory(@Param('roomId') roomId: string, @Query('userId') userId: string) {
        try {
            const snapshot = await this.firestore.collection('messages')
                .where('roomId', '==', roomId)
                .orderBy('createdAt', 'asc')
                .get();

            // Filter manual: Jangan tampilkan pesan jika ID user ada di array 'deletedBy'
            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((msg: any) => !msg.deletedBy?.includes(userId)); // <--- LOGIKA BARU

        } catch (error) {
            console.error(error);
            return [];
        }
    }

    // 2. DELETE FOR ME (Tandai pesan sebagai terhapus untuk user ini saja)
    @Delete('history/:roomId')
    async deleteHistory(@Param('roomId') roomId: string, @Query('userId') userId: string) {
        try {
            const snapshot = await this.firestore.collection('messages')
                .where('roomId', '==', roomId)
                .get();

            if (snapshot.empty) return { message: 'Chat kosong.' };

            const batch = this.firestore.batch();

            snapshot.docs.forEach((doc) => {
                // Alih-alih delete, kita update array deletedBy
                // arrayUnion memastikan ID tidak duplikat
                batch.update(doc.ref, {
                    deletedBy: FieldValue.arrayUnion(userId)
                });
            });

            await batch.commit();
            return { message: 'Chat berhasil dihapus untuk Anda.' };

        } catch (error) {
            console.error(error);
            return { message: 'Gagal menghapus chat.' };
        }
    }

    // 3. SYNC CONVERSATIONS (MIGRATION TOOL)
    // Panggil sekali untuk memunculkan chat lama di list "My Chats"
    @Get('sync-conversations')
    async syncConversations() {
        try {
            const allMessages = await this.firestore.collection('messages').get();
            const batch = this.firestore.batch();
            let opCount = 0;





            // REFINED STRATEGY: Group in memory to find real last message
            const conversationsMap = new Map<string, any>();
            // Key: "userId_partnerId", Value: LastMessageData

            for (const doc of allMessages.docs) {
                const msg = doc.data();
                const { senderId, roomId, text, createdAt, senderName, senderPhoto } = msg;
                if (!roomId || !senderId) continue;
                const [userA, userB] = roomId.split('_');
                const recipientId = userA === senderId ? userB : userA;

                // Key untuk Sender
                const keySender = `${senderId}_${recipientId}`;
                const currSender = conversationsMap.get(keySender);
                if (!currSender || new Date(createdAt) > new Date(currSender.timestamp)) {
                    conversationsMap.set(keySender, {
                        userId: senderId,
                        partnerId: recipientId,
                        partnerName: "User", // Placeholder, sulit dapat nama recipient dari msg sender
                        partnerPhoto: "",
                        lastMessage: text,
                        timestamp: createdAt,
                        uid: recipientId
                    });
                }

                // Key untuk Recipient
                const keyRecipient = `${recipientId}_${senderId}`;
                const currRecipient = conversationsMap.get(keyRecipient);
                if (!currRecipient || new Date(createdAt) > new Date(currRecipient.timestamp)) {
                    conversationsMap.set(keyRecipient, {
                        userId: recipientId,
                        partnerId: senderId,
                        partnerName: senderName,
                        partnerPhoto: senderPhoto,
                        lastMessage: text,
                        timestamp: createdAt,
                        uid: senderId
                    });
                }
            }

            // Commit ke Firestore
            conversationsMap.forEach((data, key) => {
                const { userId, partnerId, ...rest } = data;
                const ref = this.firestore.collection('conversations').doc(userId).collection('active').doc(partnerId);
                batch.set(ref, rest, { merge: true });
                opCount++;
            });

            await batch.commit();
            return { message: `Synced ${opCount} conversation entries.` };

        } catch (error) {
            console.error(error);
            return { error: error.message };
        }
    }

    // 4. DELETE SELECTED MESSAGES (Bulk Delete)
    @Delete('messages')
    async deleteMessages(@Body() body: { messageIds: string[]; userId: string }) {
        const { messageIds, userId } = body;

        if (!messageIds || messageIds.length === 0) {
            return { message: 'No messages to delete' };
        }

        try {
            const batch = this.firestore.batch();

            for (const msgId of messageIds) {
                const msgRef = this.firestore.collection('messages').doc(msgId);
                const msgDoc = await msgRef.get();

                if (!msgDoc.exists) continue;

                const msgData = msgDoc.data();

                // Authorization: Only allow deleting own messages
                if (!msgData || msgData.senderId !== userId) {
                    return { error: 'Unauthorized: You can only delete your own messages' };
                }

                // Add to deletedBy array (soft delete)
                batch.update(msgRef, {
                    deletedBy: FieldValue.arrayUnion(userId)
                });
            }

            await batch.commit();
            return { message: `Successfully deleted ${messageIds.length} messages` };

        } catch (error) {
            console.error(error);
            return { error: 'Failed to delete messages' };
        }
    }

    // 5. EDIT MESSAGE
    @Patch('messages/:id')
    async editMessage(@Param('id') messageId: string, @Body() body: { text: string; userId: string }) {
        const { text, userId } = body;

        if (!text || !text.trim()) {
            return { error: 'Message text cannot be empty' };
        }

        try {
            const msgRef = this.firestore.collection('messages').doc(messageId);
            const msgDoc = await msgRef.get();

            if (!msgDoc.exists) {
                return { error: 'Message not found' };
            }

            const msgData = msgDoc.data();

            // Authorization: Only allow editing own messages
            if (!msgData || msgData.senderId !== userId) {
                return { error: 'Unauthorized: You can only edit your own messages' };
            }

            // Update message text and add edited flag
            await msgRef.update({
                text: text.trim(),
                editedAt: new Date().toISOString(),
                isEdited: true
            });

            return {
                message: 'Message updated successfully',
                data: {
                    id: messageId,
                    text: text.trim(),
                    editedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error(error);
            return { error: 'Failed to update message' };
        }
    }
}
