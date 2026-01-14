
export type Role = 'driver' | 'passenger' | 'admin';
export type Direction = 'QN-DN' | 'DN-QN';

export interface Location {
  lat: number;
  lng: number;
  name: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  email?: string;
  photoURL?: string;
  role?: Role;
  createdAt: number;
}

export interface TimeSlot {
  id: string;
  time: string; // ví dụ: "05:00", "06:30"
}

export interface Passenger {
  id: string;
  userId: string;
  name: string;
  phone: string;
  pickupLocation: Location;
  pickupTime: string; // Giờ hiển thị
  timeSlotId: string; // ID của khung giờ đã chọn
  notes: string;
  status: 'pending' | 'booked' | 'completed';
  driverId?: string;
  createdAt: number;
  completedAt?: number; // Thời điểm hoàn thành thực tế
}

export interface Seat {
  id: number;
  passenger?: Passenger;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  carModel: string;
  totalSeats: number;
  direction: Direction;
  departureTime?: string; // Giờ khởi hành của tài xế (TimeSlot ID)
  currentLocation: Location;
  seats: Seat[];
}

export interface SwapSuggestion {
  fromDriverId: string;
  toDriverId: string;
  passengerId: string;
  reason: string;
}
