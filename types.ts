export type Role = 'teacher' | 'admin';
export type VenueStatus = 'available' | 'maintenance';
export type BookingStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  citizenId: string;       // เลขบัตรประชาชน 13 หลัก (Username)
  password?: string;       // วัน/เดือน/ปีเกิด เช่น 15/08/2530 (Password)
  name: string;
  role: Role;
  department: string;
  avatar: string;
  phone?: string;
  email?: string;
}

export interface Venue {
  id: number;
  name: string;
  code: string;
  building: string;
  capacity: number;
  description: string;
  status: VenueStatus;     // 'available' หรือ 'maintenance'
  isActive: boolean;
}

export interface Booking {
  id: number;
  userId: string;
  userName: string;
  userDepartment: string;
  venueId: number;
  venueName: string;
  date: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:mm'
  endTime: string; // 'HH:mm'
  purpose: string;
  attendeesCount: number;
  status: BookingStatus;
  createdAt: string;
  rejectionReason?: string;
  respondedByAdminName?: string;
  respondedAt?: string;
  hasBeenNotifiedToTeacher?: boolean;
}

export interface ConflictGroup {
  venueId: number;
  venueName: string;
  date: string;
  timeRange: string;
  bookings: Booking[];
}

export interface SystemNotification {
  id: number;
  title: string;
  message: string;
  type: 'venue_added' | 'venue_maintenance' | 'general';
  venueId?: number;
  createdAt: string;
}
