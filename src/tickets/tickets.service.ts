import { Inject, Injectable } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class TicketsService {
    constructor(@Inject('FIREBASE_CONNECTION') private firestore: Firestore) { }

    async create(createTicketDto: CreateTicketDto) {
        const ticketRef = await this.firestore.collection('tickets').add({
            ...createTicketDto,
            status: 'open',
            createdAt: new Date().toISOString(),
            priority: this.determinePriority(createTicketDto.targetDepartment)
        });
        return { id: ticketRef.id, message: 'Ticket created successfully' };
    }

    private determinePriority(dept: string): string {
        if (dept.includes('Owner')) return 'high';
        if (dept.includes('Superadmin')) return 'medium';
        return 'normal';
    }

    async findAll(role: string) {
        let query: FirebaseFirestore.Query = this.firestore.collection('tickets').orderBy('createdAt', 'desc');

        // ROLE-BASED ACCESS CONTROL (RBAC) FOR TICKETS
        // "Gak bocor ke yang lain, kecuali owner"

        if (role === 'owner' || role === 'access_owner') {
            // Owner sees EVERYTHING. No filter needed.
        }
        else if (role === 'superadmin') {
            // Superadmin sees only tickets explicitly targeting them.
            // Strict mode to prevent "leaking" of General Admin tickets if that's the intent, 
            // or maybe they want to see General too. 
            // But usually "System Ops" is a specific channel.
            // Let's filter strictly for now based on "gak bocor".
            query = query.where('targetDepartment', '==', 'Superadmin (System Ops)');
        }
        else if (role === 'admin' || role === 'staff') {
            // Admins/Staff only see General Administration tickets.
            query = query.where('targetDepartment', '==', 'General Administration');
        }
        else {
            // Other roles (e.g. user) see nothing or throw error (Controller handles restriction, but safer here too)
            return [];
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
}
