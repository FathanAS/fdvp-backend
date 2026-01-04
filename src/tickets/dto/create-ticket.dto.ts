export class CreateTicketDto {
    subject: string;
    message: string;
    targetDepartment: string; // 'General Administration', 'Superadmin (System Ops)', 'Executive Office (Owner)'
    userId?: string;
    email?: string;
    displayName?: string;
}
