export class CreateRegistrationDto {
  eventId: string;
  userId: string;
  userEmail: string; // Opsional: untuk memudahkan admin menghubungi
  registrationDate: string;
  status: string; // 'confirmed', 'pending', dll
}