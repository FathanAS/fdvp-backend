export class UpdateUserDto {
  displayName?: string;
  job?: string;
  bio?: string;
  instagram?: string;
  latitude?: number;  // Koordinat Lokasi
  longitude?: number; // Koordinat Lokasi
  province?: string;
  city?: string;
  photoURL?: string | null;
}