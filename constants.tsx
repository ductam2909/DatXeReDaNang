
import { Driver, Passenger, Location } from './types';

export const LOCATIONS = {
  TAM_KY: { lat: 15.567, lng: 108.481, name: "Tam Kỳ" } as Location,
  HOI_AN: { lat: 15.880, lng: 108.338, name: "Hội An" } as Location,
  DIEN_BAN: { lat: 15.885, lng: 108.232, name: "Điện Bàn" } as Location,
  DA_NANG: { lat: 16.054, lng: 108.202, name: "Đà Nẵng" } as Location,
};

export const MOCK_DRIVERS: Driver[] = [
  {
    id: "d1",
    name: "Nguyễn Văn A",
    phone: "0901234567",
    carModel: "Toyota Vios",
    totalSeats: 4,
    direction: "QN-DN",
    currentLocation: LOCATIONS.TAM_KY,
    seats: Array(4).fill(null).map((_, i) => ({ id: i + 1 })),
  },
  {
    id: "d2",
    name: "Trần Văn B",
    phone: "0907654321",
    carModel: "Hyundai Accent",
    totalSeats: 5,
    direction: "DN-QN",
    currentLocation: LOCATIONS.DA_NANG,
    seats: Array(5).fill(null).map((_, i) => ({ id: i + 1 })),
  },
];

export const MOCK_PASSENGERS: Passenger[] = [
  {
    id: "p1",
    userId: "mock-user-1",
    name: "Lê Thị C",
    phone: "0911223344",
    pickupLocation: LOCATIONS.HOI_AN,
    pickupTime: "08:00",
    // Fix: Add missing timeSlotId
    timeSlotId: "ts1",
    notes: "Có mang theo hành lý cồng kềnh",
    status: "pending",
    createdAt: Date.now(),
  },
  {
    id: "p2",
    userId: "mock-user-2",
    name: "Phạm Văn D",
    phone: "0933445566",
    pickupLocation: LOCATIONS.DIEN_BAN,
    pickupTime: "08:15",
    // Fix: Add missing timeSlotId
    timeSlotId: "ts2",
    notes: "Đón tại cổng khu công nghiệp",
    status: "pending",
    createdAt: Date.now(),
  },
];
