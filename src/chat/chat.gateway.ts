import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, OnModuleInit } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';

@WebSocketGateway({
  cors: {
    origin: '*', // Izinkan semua frontend (bisa diperketat nanti)
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Server;

  constructor(@Inject('FIREBASE_CONNECTION') private firestore: Firestore) { }

  // RESET STATUS SAAT SERVER RESTART
  async onModuleInit() {
    try {
      const onlineUsers = await this.firestore.collection('users').where('isOnline', '==', true).get();
      if (!onlineUsers.empty) {
        const batch = this.firestore.batch();
        onlineUsers.docs.forEach(doc => {
          batch.update(doc.ref, { isOnline: false, lastSeen: new Date().toISOString() });
        });
        await batch.commit();
        console.log(`[ChatGateway] Reset ${onlineUsers.size} users to offline status.`);
      }
    } catch (error) {
      console.error('[ChatGateway] Error resetting user status:', error);
    }
  }

  // Tracking koneksi aktif per user (userId -> Set<socketId>)
  private activeConnections = new Map<string, Set<string>>();

  // A. HANDLE KONEKSI (User Online)
  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      // 1. Tambahkan ke tracking connections
      if (!this.activeConnections.has(userId)) {
        this.activeConnections.set(userId, new Set());
      }
      this.activeConnections.get(userId)!.add(client.id);

      // 2. JOIN ROOM PRIBADI
      client.join(userId);
      client.join('global');

      // 3. Update Status Online HANYA jika ini koneksi pertama
      if (this.activeConnections.get(userId)!.size === 1) {
        await this.firestore.collection('users').doc(userId).set({
          isOnline: true
        }, { merge: true });

        // Broadcast user status online
        client.broadcast.emit('userStatus', { userId, isOnline: true });
        console.log(`User ${userId} came online`);
      }
    }
  }

  // B. HANDLE DISCONNECT (User Offline/Tutup Web)
  async handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      // 1. Hapus dari tracking connections
      if (this.activeConnections.has(userId)) {
        this.activeConnections.get(userId)!.delete(client.id);

        // Jika set kosong, berarti user benar-benar offline (semua tab tertutup)
        if (this.activeConnections.get(userId)!.size === 0) {
          this.activeConnections.delete(userId);

          // Update status Offline & Last Seen
          await this.firestore.collection('users').doc(userId).set({
            isOnline: false,
            lastSeen: new Date().toISOString()
          }, { merge: true });

          // Broadcast user status offline
          client.broadcast.emit('userStatus', { userId, isOnline: false, lastSeen: new Date().toISOString() });
          console.log(`User ${userId} went offline`);
        }
      }
    }
  }

  // 1. JOIN ROOM (Saat user klik tombol chat)
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.roomId);
    console.log(`Client ${client.id} joined room ${data.roomId}`);

    // FETCH CHAT HISTORY (Load chat lama)
    // Note: Pastikan index Firestore dibuat untuk query: collection: messages, fields: roomId (Asc), createdAt (Asc)
    const snapshot = await this.firestore.collection('messages')
      .where('roomId', '==', data.roomId)
      .orderBy('createdAt', 'asc')
      .get();

    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id || doc.id,
        ...data
      };
    });

    // Kirim history HANYA ke user yang baru join
    client.emit('loadPreviousMessages', messages);
  }

  // 2. SEND MESSAGE (Saat user kirim pesan)
  @SubscribeMessage('sendMessage')
  async handleMessage(@MessageBody() payload: any) {
    const { id, roomId, senderId, text, senderName } = payload;
    let { senderPhoto } = payload;

    // OPTIMISASI: Fetch Photo terbaru dari DB untuk memastikan Google Photo muncul
    // Client mungkin mengirim string kosong jika state belum sync
    try {
      const userDoc = await this.firestore.collection('users').doc(senderId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.photoURL) {
          senderPhoto = userData.photoURL;
        }
      }
    } catch (error) {
      console.log('Error fetching sender photo for notification:', error);
    }

    const messageData = {
      id,
      roomId,
      senderId,
      senderName,
      senderPhoto: senderPhoto || null,
      text,
      isRead: false,
      createdAt: new Date().toISOString(),
      replyTo: payload.replyTo || null,
      replyToText: payload.replyToText || null,
    };

    // 1. SIMPAN PERMANEN
    await this.firestore.collection('messages').doc(id).set(messageData);

    // 1.5 UPDATE CONVERSATION (INBOX)
    const [userA, userB] = roomId.split('_');
    const recipientId = userA === senderId ? userB : userA;

    const conversationData = {
      lastMessage: text,
      lastMessageId: id,
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update Inbox Pengirim
    await this.firestore.collection('conversations').doc(senderId).collection('active').doc(recipientId).set({
      ...conversationData,
      partnerId: recipientId,
      uid: recipientId
    }, { merge: true });

    // Update Inbox Penerima
    await this.firestore.collection('conversations').doc(recipientId).collection('active').doc(senderId).set({
      ...conversationData,
      partnerId: senderId,
      partnerName: senderName || "Unknown",
      partnerPhoto: senderPhoto || "", // Pastikan foto terbaru tersimpan di inbox lawan
      uid: senderId
    }, { merge: true });

    // 2. KIRIM KE PENERIMA (DI DALAM ROOM CHAT)
    this.server.to(roomId).emit('receiveMessage', messageData);

    // 3. KIRIM NOTIFIKASI
    if (recipientId) {
      const socketsInRoom = await this.server.in(roomId).fetchSockets();
      const isRecipientInRoom = socketsInRoom.some((s: any) => s.handshake.query.userId === recipientId);

      if (!isRecipientInRoom) {
        this.server.to(recipientId).emit('receiveNotification', {
          senderName,
          senderPhoto, // Foto dari DB (pasti ada jika user punya)
          text,
          senderId,
          roomId
        });
      }
    }
  }

  // 3. READ MESSAGE (Saat user membuka chat / scroll) - Fitur Checklist Biru
  @SubscribeMessage('readMessage')
  async handleReadMessage(@MessageBody() payload: { roomId: string; userId: string; messageIds: string[] }) {
    // payload.userId adalah si PEMBACA (Penerima)

    // Batch update di Firestore (Tandai as Read)
    const batch = this.firestore.batch();

    payload.messageIds.forEach(msgId => {
      const ref = this.firestore.collection('messages').doc(msgId);
      batch.update(ref, { isRead: true });
    });

    await batch.commit();

    // Beritahu PENGIRIM bahwa pesan sudah dibaca
    // Emit ke Room agar UI pengirim berubah jadi Biru
    this.server.to(payload.roomId).emit('messagesReadUpdate', {
      messageIds: payload.messageIds
    });
  }

  // 4. TYPING INDICATOR
  @SubscribeMessage('typing')
  handleTyping(@MessageBody() payload: { roomId: string; userId: string; isTyping: boolean }) {
    // Broadcast ke semua orang di room KECUALI pengirim
    // "User X sedang mengetik..."
    this.server.to(payload.roomId).emit('displayTyping', {
      userId: payload.userId,
      isTyping: payload.isTyping
    });
  }

  // 5. BROADCAST (Admin Only)
  @SubscribeMessage('broadcastMessage')
  broadcastMessage(@MessageBody() data: { message: string, senderName: string }) {
    console.log(`[BROADCAST] ${data.senderName}: ${data.message}`);
    this.server.to('global').emit('receiveNotification', {
      senderName: `📢 ${data.senderName}`,
      senderPhoto: 'https://cdn-icons-png.flaticon.com/512/3222/3222252.png', // Megaphone Icon
      text: data.message,
      senderId: 'system-broadcast',
      roomId: 'global',
      createdAt: new Date().toISOString()
    });
  }

  // 6. EDIT MESSAGE (Real-time sync)
  @SubscribeMessage('editMessage')
  handleEditMessage(@MessageBody() payload: { roomId: string; messageId: string; newText: string }) {
    this.server.to(payload.roomId).emit('messageEdited', {
      messageId: payload.messageId,
      newText: payload.newText
    });
  }

  // 7. DELETE MESSAGES (Real-time sync)
  @SubscribeMessage('deleteMessages')
  handleDeleteMessages(@MessageBody() payload: { roomId: string; messageIds: string[] }) {
    this.server.to(payload.roomId).emit('messageDeleted', {
      messageIds: payload.messageIds
    });
  }
}