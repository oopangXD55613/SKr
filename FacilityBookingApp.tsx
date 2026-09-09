import React, { useState, useMemo, useEffect } from 'react';
import { User, Booking, Venue, BookingStatus, ConflictGroup, Role } from './types';
import { MOCK_USERS, MOCK_VENUES, INITIAL_BOOKINGS } from './mockData';
import { supabase } from './supabaseClient';

// Helper function to check if two time ranges overlap (HH:mm format)
export function isTimeOverlapping(startA: string, endA: string, startB: string, endB: string): boolean {
  return !(endA <= startB || startA >= endB);
}

export const FacilityBookingApp: React.FC = () => {
  // --- Global State ---
  const [currentUser, setCurrentUser] = useState<User | null>(MOCK_USERS[0]); // Default to Teacher ศิริพร for quick demo
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [venues] = useState<Venue[]>(MOCK_VENUES);

  // Calendar State (September 2026)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(8); // 8 = September (0-indexed)
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-12'); // Default to conflict day for demo

  // Modals
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState<boolean>(false);
  const [isAdminDayModalOpen, setIsAdminDayModalOpen] = useState<boolean>(false);
  const [isTeacherNotifOpen, setIsTeacherNotifOpen] = useState<boolean>(false);
  const [rejectingBooking, setRejectingBooking] = useState<Booking | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'mine' | 'conflicts'>('all');

  // Quick Booking Form State
  const [newVenueId, setNewVenueId] = useState<string>(MOCK_VENUES[0].id);
  const [newDate, setNewDate] = useState<string>('2026-09-16');
  const [newStartTime, setNewStartTime] = useState<string>('09:00');
  const [newEndTime, setNewEndTime] = useState<string>('12:00');
  const [newPurpose, setNewPurpose] = useState<string>('');
  const [newAttendees, setNewAttendees] = useState<number>(50);
  const [newEquipment, setNewEquipment] = useState<string[]>([]);
  const [bookingConflictWarning, setBookingConflictWarning] = useState<string | null>(null);

  // --- Automatic Teacher Notification on Login ---
  useEffect(() => {
    if (currentUser && currentUser.role === 'teacher') {
      // Find updated bookings for this teacher that they haven't acknowledged yet
      const unacknowledged = bookings.filter(
        b => b.userId === currentUser.id && 
             (b.status === 'rejected' || b.status === 'approved') && 
             b.hasBeenNotifiedToTeacher === false
      );
      if (unacknowledged.length > 0) {
        setIsTeacherNotifOpen(true);
      }
    }
  }, [currentUser]);

  // Check conflict in real-time when teacher fills quick booking form
  useEffect(() => {
    if (!newVenueId || !newDate || !newStartTime || !newEndTime) {
      setBookingConflictWarning(null);
      return;
    }
    const conflict = bookings.find(
      b => b.date === newDate &&
           b.venueId === newVenueId &&
           b.status !== 'rejected' &&
           isTimeOverlapping(newStartTime, newEndTime, b.startTime, b.endTime)
    );
    if (conflict) {
      setBookingConflictWarning(
        `คำเตือน: มีรายการจองของ "${conflict.userName}" (${conflict.startTime} - ${conflict.endTime} น.) ในช่วงเวลาเดียวกันนี้แล้ว คำขอนี้จะเข้าสู่ระบบการตรวจสอบความทับซ้อน`
      );
    } else {
      setBookingConflictWarning(null);
    }
  }, [newVenueId, newDate, newStartTime, newEndTime, bookings]);

  // --- Conflict Detection Engine ---
  // Groups pending bookings by (date + venue) with overlapping time
  const conflictGroups = useMemo<ConflictGroup[]>(() => {
    const groups: ConflictGroup[] = [];
    // Group active (pending/approved) bookings by date and venue
    const activeBookings = bookings.filter(b => b.status === 'pending');
    
    // Group map: key = `${b.date}_${b.venueId}`
    const byDateVenue = new Map<string, Booking[]>();
    activeBookings.forEach(b => {
      const key = `${b.date}_${b.venueId}`;
      if (!byDateVenue.has(key)) {
        byDateVenue.set(key, []);
      }
      byDateVenue.get(key)!.push(b);
    });

    byDateVenue.forEach((items, key) => {
      if (items.length > 1) {
        // Check for pairwise overlaps
        const conflictingInThisGroup = new Set<Booking>();
        for (let i = 0; i < items.length; i++) {
          for (let j = i + 1; j < items.length; j++) {
            if (isTimeOverlapping(items[i].startTime, items[i].endTime, items[j].startTime, items[j].endTime)) {
              conflictingInThisGroup.add(items[i]);
              conflictingInThisGroup.add(items[j]);
            }
          }
        }

        if (conflictingInThisGroup.size > 1) {
          const first = items[0];
          const sortedList = Array.from(conflictingInThisGroup).sort((a, b) => a.startTime.localeCompare(b.startTime));
          const minStart = sortedList[0].startTime;
          const maxEnd = sortedList.reduce((max, cur) => cur.endTime > max ? cur.endTime : max, sortedList[0].endTime);

          groups.push({
            venueId: first.venueId,
            venueName: first.venueName,
            date: first.date,
            timeRange: `${minStart} - ${maxEnd} น.`,
            bookings: sortedList
          });
        }
      }
    });

    return groups;
  }, [bookings]);

  // Dates that have conflicts
  const conflictDates = useMemo(() => {
    return new Set(conflictGroups.map(g => g.date));
  }, [conflictGroups]);

  // Dates that have pending bookings
  const pendingDates = useMemo(() => {
    return new Set(bookings.filter(b => b.status === 'pending').map(b => b.date));
  }, [bookings]);

  // Teacher notifications list
  const teacherNotifications = useMemo(() => {
    if (!currentUser || currentUser.role !== 'teacher') return [];
    return bookings.filter(b => b.userId === currentUser.id && (b.status === 'approved' || b.status === 'rejected'));
  }, [bookings, currentUser]);

  const unreadNotificationCount = useMemo(() => {
    if (!currentUser || currentUser.role !== 'teacher') return 0;
    return bookings.filter(b => b.userId === currentUser.id && b.hasBeenNotifiedToTeacher === false).length;
  }, [bookings, currentUser]);

  // --- Handlers ---
  const handleAcknowledgeNotifications = () => {
    if (!currentUser) return;
    setBookings(prev =>
      prev.map(b => (b.userId === currentUser.id ? { ...b, hasBeenNotifiedToTeacher: true } : b))
    );
    setIsTeacherNotifOpen(false);
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newPurpose.trim()) return;

    const venue = venues.find(v => v.id === newVenueId);
    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userDepartment: currentUser.department,
      venueId: newVenueId,
      venueName: venue ? venue.name : 'สถานที่โรงเรียน',
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      purpose: newPurpose,
      attendeesCount: Number(newAttendees) || 1,
      equipment: newEquipment,
      status: 'pending',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      hasBeenNotifiedToTeacher: true
    };

    setBookings(prev => [newBooking, ...prev]);
    setIsQuickBookingOpen(false);
    setNewPurpose('');
    setNewEquipment([]);
    alert('ส่งคำขอจองสถานที่สำเร็จ! กรุณารอการพิจารณาอนุมัติจากงานอาคารสถานที่');
  };

  const handleApproveBooking = (bookingId: string) => {
    const adminName = currentUser?.name || 'นายวิโรจน์ อาคารชัย (หัวหน้างานอาคารสถานที่)';
    setBookings(prev =>
      prev.map(b => {
        if (b.id === bookingId) {
          return {
            ...b,
            status: 'approved',
            respondedByAdminName: adminName,
            respondedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
            hasBeenNotifiedToTeacher: false // Trigger notification for teacher
          };
        }
        return b;
      })
    );
  };

  const openRejectModal = (booking: Booking) => {
    setRejectingBooking(booking);
    setRejectionReasonInput('');
  };

  const handleConfirmReject = () => {
    if (!rejectingBooking || !rejectionReasonInput.trim()) return;
    const adminName = currentUser?.name || 'นายวิโรจน์ อาคารชัย (หัวหน้างานอาคารสถานที่)';

    setBookings(prev =>
      prev.map(b => {
        if (b.id === rejectingBooking.id) {
          return {
            ...b,
            status: 'rejected',
            rejectionReason: rejectionReasonInput.trim(),
            respondedByAdminName: adminName,
            respondedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
            hasBeenNotifiedToTeacher: false // Prompt teacher notification!
          };
        }
        return b;
      })
    );

    setRejectingBooking(null);
    setRejectionReasonInput('');
  };

  // Calendar Day Generation for Month (September 2026)
  const calendarDays = useMemo(() => {
    const days = [];
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // Sunday = 0
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Pad empty slots before day 1
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, dateStr: '' });
    }

    // Actual month days
    for (let d = 1; d <= totalDays; d++) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
      days.push({ dayNumber: d, dateStr });
    }
    return days;
  }, [currentYear, currentMonth]);

  // Selected date bookings
  const selectedDateBookings = useMemo(() => {
    return bookings.filter(b => b.date === selectedDate);
  }, [bookings, selectedDate]);

  // Conflicting bookings on selected date
  const selectedDateConflicts = useMemo(() => {
    return conflictGroups.filter(g => g.date === selectedDate);
  }, [conflictGroups, selectedDate]);

  // =========================================================================
  // VIEW: Dual Login Modal / Switcher Screen (If logged out)
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-red-950 via-red-900 to-slate-900 p-4 font-sans antialiased text-slate-800">
        {/* School Watermark Background */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-10">
          <svg className="w-[700px] h-[700px] text-white" viewBox="0 0 200 200" fill="currentColor">
            <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="6 4" />
            <circle cx="100" cy="100" r="75" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M100 25 L120 70 L170 70 L130 100 L145 150 L100 120 L55 150 L70 100 L30 70 L80 70 Z" fill="currentColor" opacity="0.4" />
            <text x="100" y="180" textAnchor="middle" fontSize="11" fill="currentColor" fontWeight="bold">โรงเรียนสกลราชวิทยานุกุล</text>
          </svg>
        </div>

        <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-red-100 overflow-hidden">
          {/* Top Brand Header */}
          <div className="bg-gradient-to-r from-red-800 to-red-900 p-6 text-white text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white text-red-800 shadow-lg mb-3 ring-4 ring-red-300/30">
              {/* School Emblem Placeholder Icon */}
              <span className="font-extrabold text-2xl tracking-tighter">ส.ร.น.</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">ระบบจองสถานที่โรงเรียน</h1>
            <p className="text-red-100 text-sm mt-0.5">โรงเรียนสกลราชวิทยานุกุล</p>
            <div className="inline-block mt-2 px-3 py-0.5 bg-red-700/60 rounded-full text-xs text-red-200 border border-red-500/30">
              Sakonrajwittayanukul School Facility Booking
            </div>
          </div>

          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-slate-800">เข้าสู่ระบบ (Dual Login)</h2>
              <p className="text-xs text-slate-500 mt-1">เลือกบทบาทหรือบัญชีตัวอย่างเพื่อทดสอบระบบได้ทันที</p>
            </div>

            {/* Quick Demo Selector */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                คลิกเลือกบัญชีทดสอบด่วน:
              </div>

              {/* Teacher 1: Siriporn (Has pending rejection notif) */}
              <button
                onClick={() => setCurrentUser(MOCK_USERS[0])}
                className="w-full text-left p-3.5 rounded-xl border border-red-100 bg-red-50/50 hover:bg-red-100/70 hover:border-red-300 transition flex items-center gap-3.5 group"
              >
                <img src={MOCK_USERS[0].avatar} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-red-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800 group-hover:text-red-900">{MOCK_USERS[0].name}</span>
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[11px] font-medium rounded-full">ครู</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{MOCK_USERS[0].department}</p>
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium mt-0.5">
                    🔔 มีแจ้งเตือนการไม่อนุมัติ (Rejection Alert) รอแสดงผล
                  </span>
                </div>
              </button>

              {/* Teacher 2: Thanakorn (Has conflict item) */}
              <button
                onClick={() => setCurrentUser(MOCK_USERS[1])}
                className="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition flex items-center gap-3.5 group"
              >
                <img src={MOCK_USERS[1].avatar} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-300" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800">{MOCK_USERS[1].name}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-medium rounded-full">ครู</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{MOCK_USERS[1].department}</p>
                  <span className="text-[11px] text-red-600">⚠️ มีรายการจองทับซ้อนวันที่ 12 ก.ย.</span>
                </div>
              </button>

              {/* Admin: Viroj */}
              <button
                onClick={() => setCurrentUser(MOCK_USERS[3])}
                className="w-full text-left p-3.5 rounded-xl border-2 border-red-700 bg-gradient-to-r from-red-900 to-red-800 text-white hover:brightness-110 shadow-md transition flex items-center gap-3.5 group"
              >
                <img src={MOCK_USERS[3].avatar} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{MOCK_USERS[3].name}</span>
                    <span className="px-2 py-0.5 bg-white text-red-900 text-[11px] font-bold rounded-full shadow-sm">แอดมิน</span>
                  </div>
                  <p className="text-xs text-red-200 truncate">{MOCK_USERS[3].department}</p>
                  <span className="text-[11px] text-amber-300 font-medium">🛡️ ตรวจสอบคำขอ & จัดการการจองทับซ้อน</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN APPLICATION LAYOUT (Logged In)
  // =========================================================================
  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="min-h-screen relative bg-slate-50 font-sans text-slate-800 antialiased selection:bg-red-200 selection:text-red-900">
      {/* Subtle School Watermark (Fixed Background) */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-[0.03] overflow-hidden"
        aria-hidden="true"
      >
        <svg className="w-[900px] h-[900px] text-red-900" viewBox="0 0 200 200" fill="currentColor">
          <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle cx="100" cy="100" r="85" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M100 20 L120 70 L175 75 L135 110 L145 165 L100 135 L55 165 L65 110 L25 75 L80 70 Z" fill="currentColor" />
          <circle cx="100" cy="100" r="30" fill="white" />
          <text x="100" y="105" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor">ส.ร.น.</text>
        </svg>
      </div>

      {/* =========================================================================
          TOP NAVIGATION HEADER
      ========================================================================== */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-red-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Left: School Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-800 to-red-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-red-900/20 ring-2 ring-red-200">
              ส.ร.น.
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  ระบบจองสถานที่
                </h1>
                <span className="hidden sm:inline-block px-2.5 py-0.5 bg-red-50 text-red-700 text-xs font-semibold rounded-full border border-red-200">
                  สกลราชวิทยานุกุล
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold rounded-full shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Supabase Live</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">Sakonrajwittayanukul Facility Reservation System</p>
            </div>
          </div>

          {/* Right: Actions & User Info */}
          <div className="flex items-center gap-3">
            {/* Quick Booking Button (Primary Red CTA for Teachers) */}
            {!isAdmin && (
              <button
                onClick={() => setIsQuickBookingOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-800 hover:bg-red-700 active:bg-red-900 text-white text-sm font-semibold rounded-xl shadow-sm transition hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                <span>จองสถานที่ด่วน</span>
              </button>
            )}

            {/* Teacher Notification Bell */}
            {!isAdmin && (
              <button
                onClick={() => setIsTeacherNotifOpen(true)}
                title="การแจ้งเตือนผลการจอง"
                className="relative p-2.5 text-slate-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex items-center justify-center rounded-full h-5 w-5 bg-red-600 text-[10px] font-bold text-white">
                      {unreadNotificationCount}
                    </span>
                  </span>
                )}
              </button>
            )}

            {/* Role & User Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <img src={currentUser.avatar} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-red-100" />
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  {currentUser.name}
                  {isAdmin ? (
                    <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.2 rounded-full font-semibold">แอดมิน</span>
                  ) : (
                    <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.2 rounded-full font-medium">ครู</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{currentUser.department}</div>
              </div>
            </div>

            {/* Switch User / Logout Button */}
            <button
              onClick={() => setCurrentUser(null)}
              title="สลับบัญชี / ออกจากระบบ"
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition flex items-center gap-1"
            >
              <span>สลับโหมด</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          PAGE BODY / DASHBOARD
      ========================================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Banner: Mode Explanation & Demo Shortcuts */}
        <div className="mb-6 p-4 rounded-2xl bg-white border border-red-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isAdmin ? 'bg-red-900 text-white' : 'bg-red-100 text-red-800'}`}>
              {isAdmin ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {isAdmin ? 'แผงควบคุมแอดมิน (Admin Dashboard)' : 'หน้าปฏิทินและระบบจองของครู (Teacher Dashboard)'}
                </span>
                {conflictGroups.length > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">
                    ⚠️ ตรวจพบ {conflictGroups.length} ข้อขัดแย้ง
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {isAdmin
                  ? 'ตรวจสอบคำขอจอง อนุมัติ/ไม่อนุมัติ และจัดการการจองทับซ้อน (Conflict Resolution) พร้อมระบุเหตุผล'
                  : 'ตรวจสอบตารางการใช้สถานที่ของทุกคนแบบเรียลไทม์ และส่งคำขอจองสถานที่ด่วน'}
              </p>
            </div>
          </div>

          {/* Quick toggle to switch role right from the bar */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">สลับบทบาทจำลอง:</span>
            <button
              onClick={() => setCurrentUser(MOCK_USERS[0])}
              className={`px-3 py-1.5 rounded-lg border font-medium transition ${
                currentUser.id === MOCK_USERS[0].id
                  ? 'bg-red-800 text-white border-red-800 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              ครูศิริพร (มีแจ้งเตือน)
            </button>
            <button
              onClick={() => setCurrentUser(MOCK_USERS[3])}
              className={`px-3 py-1.5 rounded-lg border font-medium transition ${
                currentUser.id === MOCK_USERS[3].id
                  ? 'bg-red-800 text-white border-red-800 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              แอดมินวิโรจน์
            </button>
          </div>
        </div>

        {/* =========================================================================
            CALENDAR CONTROLS & HEADER
        ========================================================================== */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-800">
                กันยายน 2569 (September 2026)
              </h2>
              <span className="px-2.5 py-0.5 bg-red-50 text-red-800 rounded-full text-xs font-semibold">
                ภาคเรียนที่ 1/2569
              </span>
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600">อนุมัติแล้ว</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                <span className="text-slate-600">รออนุมัติ</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <span className="text-slate-600">ไม่อนุมัติ</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-600 ring-2 ring-red-300"></span>
                <span className="font-bold text-red-700">จองทับซ้อน (Conflict)</span>
              </span>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-xs font-bold text-slate-600 py-3">
            <div className="text-red-700">อาทิตย์ (Sun)</div>
            <div>จันทร์ (Mon)</div>
            <div>อังคาร (Tue)</div>
            <div>พุธ (Wed)</div>
            <div>พฤหัสบดี (Thu)</div>
            <div>ศุกร์ (Fri)</div>
            <div className="text-red-700">เสาร์ (Sat)</div>
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-50/30">
            {calendarDays.map((item, index) => {
              if (!item.dayNumber) {
                return <div key={`empty-${index}`} className="min-h-[115px] bg-slate-50/50 p-2"></div>;
              }

              const dateBookings = bookings.filter(b => b.date === item.dateStr);
              const hasPending = dateBookings.some(b => b.status === 'pending');
              const hasConflict = conflictDates.has(item.dateStr);
              const isSelected = selectedDate === item.dateStr;

              return (
                <div
                  key={item.dateStr}
                  onClick={() => {
                    setSelectedDate(item.dateStr);
                    if (isAdmin) {
                      setIsAdminDayModalOpen(true);
                    }
                  }}
                  className={`min-h-[115px] p-2 transition cursor-pointer relative group flex flex-col justify-between ${
                    isSelected ? 'bg-red-50/60 ring-2 ring-red-700 ring-inset' : 'hover:bg-white bg-white/70'
                  }`}
                >
                  {/* Date Header inside cell */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition ${
                        isSelected
                          ? 'bg-red-800 text-white'
                          : 'text-slate-700 group-hover:bg-slate-100'
                      }`}
                    >
                      {item.dayNumber}
                    </span>

                    {/* Notification badges for Admin */}
                    <div className="flex items-center gap-1">
                      {hasConflict && (
                        <span
                          title="มีคำขอจองทับซ้อนกัน!"
                          className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-md animate-pulse shadow-sm flex items-center gap-0.5"
                        >
                          ⚠️ ชนกัน
                        </span>
                      )}
                      {isAdmin && hasPending && !hasConflict && (
                        <span
                          title="มีรายการรออนุมัติ"
                          className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-200"
                        ></span>
                      )}
                    </div>
                  </div>

                  {/* Booking items list inside day cell */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {dateBookings.slice(0, 2).map(b => (
                      <div
                        key={b.id}
                        className={`text-[11px] px-2 py-1 rounded-lg truncate border font-medium flex items-center justify-between ${
                          b.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : b.status === 'rejected'
                            ? 'bg-rose-50 text-rose-800 border-rose-200 line-through opacity-75'
                            : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}
                        title={`${b.venueName} (${b.startTime}-${b.endTime} น.) - ${b.userName}`}
                      >
                        <span className="truncate">{b.venueName}</span>
                        <span className="text-[9px] opacity-75 ml-1">{b.startTime}</span>
                      </div>
                    ))}

                    {dateBookings.length > 2 && (
                      <div className="text-[10px] text-slate-400 text-center font-medium">
                        +{dateBookings.length - 2} รายการเพิ่มเติม
                      </div>
                    )}
                  </div>

                  {/* Bottom Day Status Indicator */}
                  {dateBookings.length === 0 && (
                    <div className="text-[10px] text-slate-300 text-center italic">ว่าง</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            DAY DETAILS PANEL (Below Calendar)
        ========================================================================== */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-red-800 uppercase tracking-wide">รายการจองประจำวัน</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">คลิกวันที่ในปฏิทินเพื่อเลือกวัน</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                วันที่ {selectedDate}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => setIsAdminDayModalOpen(true)}
                  className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>เปิดโหมดจัดการรายวัน (Admin Modal)</span>
                </button>
              )}
            </div>
          </div>

          {/* CONFLICT ALERT BANNER FOR SELECTED DAY */}
          {selectedDateConflicts.length > 0 && (
            <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-400 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-600 text-white rounded-xl shadow-sm mt-0.5">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-red-900">
                    ตรวจพบการจองทับซ้อนในวันนี้! (Booking Conflicts Detected)
                  </h4>
                  <p className="text-xs text-red-700 mt-0.5">
                    มีผู้ยื่นคำขอจองสถานที่เดียวกันในช่วงเวลาคาบเกี่ยวกัน แอดมินต้องเป็นผู้พิจารณาอนุมัติเพียงรายการเดียว หรือขอให้ปรับเปลี่ยนเวลา
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setIsAdminDayModalOpen(true)}
                      className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-lg shadow-sm transition"
                    >
                      จัดการข้อขัดแย้งเดี๋ยวนี้ →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bookings List for Selected Date */}
          <div className="mt-6">
            {selectedDateBookings.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-700">ไม่มีรายการจองในวันที่ {selectedDate}</p>
                <p className="text-xs text-slate-400 mt-1">สถานที่ทั้งหมดพร้อมเปิดให้จองใช้งาน</p>
                {!isAdmin && (
                  <button
                    onClick={() => {
                      setNewDate(selectedDate);
                      setIsQuickBookingOpen(true);
                    }}
                    className="mt-4 px-4 py-2 bg-red-800 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition"
                  >
                    + จองสถานที่ในวันนี้
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedDateBookings.map(booking => {
                  const isConflictItem = selectedDateConflicts.some(g =>
                    g.bookings.some(b => b.id === booking.id)
                  );

                  return (
                    <div
                      key={booking.id}
                      className={`p-5 rounded-2xl border transition relative overflow-hidden ${
                        isConflictItem
                          ? 'border-red-400 bg-red-50/40 ring-1 ring-red-400'
                          : booking.status === 'approved'
                          ? 'border-emerald-200 bg-white hover:border-emerald-300'
                          : booking.status === 'rejected'
                          ? 'border-slate-200 bg-slate-50/60 opacity-80'
                          : 'border-amber-200 bg-white hover:border-amber-300'
                      }`}
                    >
                      {/* Top Row: Venue & Status Badge */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-slate-900">{booking.venueName}</span>
                            {isConflictItem && (
                              <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full">
                                ชนเวลา
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>เวลา: {booking.startTime} - {booking.endTime} น.</span>
                          </p>
                        </div>

                        {/* Status Chip */}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            booking.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : booking.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {booking.status === 'approved' ? 'อนุมัติแล้ว' : booking.status === 'rejected' ? 'ไม่อนุมัติ' : 'รออนุมัติ'}
                        </span>
                      </div>

                      {/* Purpose */}
                      <div className="my-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-700">
                        <span className="font-semibold text-slate-900 block mb-0.5">วัตถุประสงค์:</span>
                        {booking.purpose}
                      </div>

                      {/* User Info & Meta */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-red-100 text-red-800 font-bold flex items-center justify-center text-[10px]">
                            {booking.userName.charAt(0)}
                          </span>
                          <div>
                            <span className="font-medium text-slate-800">{booking.userName}</span>
                            <span className="text-[10px] text-slate-400 block">{booking.userDepartment}</span>
                          </div>
                        </div>
                        <div className="text-right text-[11px]">
                          <span>ผู้เข้าร่วม: {booking.attendeesCount} คน</span>
                        </div>
                      </div>

                      {/* If rejected, show reason and respondent */}
                      {booking.status === 'rejected' && booking.rejectionReason && (
                        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                          <div className="font-bold flex items-center gap-1.5 text-rose-800">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>เหตุผลที่ถูกปฏิเสธ:</span>
                          </div>
                          <p className="mt-1 text-slate-700">{booking.rejectionReason}</p>
                          {booking.respondedByAdminName && (
                            <p className="mt-1 text-[11px] text-slate-500">
                              ผู้ตอบกลับ: <span className="font-medium text-slate-800">{booking.respondedByAdminName}</span>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Admin Quick Action Buttons inside Card */}
                      {isAdmin && booking.status === 'pending' && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                          <button
                            onClick={() => openRejectModal(booking)}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold rounded-lg transition"
                          >
                            ไม่อนุมัติ...
                          </button>
                          <button
                            onClick={() => handleApproveBooking(booking.id)}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                          >
                            อนุมัติคำขอ
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* =========================================================================
          MODAL 1: TEACHER NOTIFICATION POPUP ( เด้งเมื่อครูล็อกอินหากมีผลอนุมัติ/ไม่อนุมัติ )
      ========================================================================== */}
      {isTeacherNotifOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-red-100 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-800 to-red-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold">แจ้งเตือนสถานะการจองสถานที่</h3>
                  <p className="text-xs text-red-100">โรงเรียนสกลราชวิทยานุกุล</p>
                </div>
              </div>
              <button
                onClick={handleAcknowledgeNotifications}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Notifications Content (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {teacherNotifications.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  ไม่มีการแจ้งเตือนใหม่ในขณะนี้
                </div>
              ) : (
                teacherNotifications.map(item => (
                  <div
                    key={item.id}
                    className={`p-5 rounded-2xl border ${
                      item.status === 'rejected'
                        ? 'bg-rose-50/70 border-rose-300 text-slate-800'
                        : 'bg-emerald-50/70 border-emerald-300 text-slate-800'
                    }`}
                  >
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          item.status === 'rejected'
                            ? 'bg-rose-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {item.status === 'rejected' ? '❌ ผลการพิจารณา: ไม่อนุมัติ' : '✅ ผลการพิจารณา: อนุมัติแล้ว'}
                      </span>
                      <span className="text-[11px] text-slate-400">{item.respondedAt || item.createdAt}</span>
                    </div>

                    <h4 className="font-bold text-base text-slate-900 mt-1">{item.venueName}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      วันที่ {item.date} เวลา {item.startTime} - {item.endTime} น.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      <span className="font-semibold">กิจกรรม:</span> {item.purpose}
                    </p>

                    {/* REJECTION SPECIAL DETAILS: เหตุผล และชื่อแอดมิน */}
                    {item.status === 'rejected' && (
                      <div className="mt-4 p-3.5 bg-white rounded-xl border border-rose-200 shadow-sm">
                        <div className="text-xs font-bold text-rose-800 mb-1 flex items-center gap-1">
                          <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>เหตุผลที่ถูกปฏิเสธคำขอ:</span>
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-normal bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
                          {item.rejectionReason || 'ไม่ได้ระบุเหตุผล'}
                        </p>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            ผู้พิจารณาคำขอ: <strong className="text-slate-800 font-semibold">{item.respondedByAdminName || 'งานบริหารอาคารสถานที่'}</strong>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* APPROVED DETAILS */}
                    {item.status === 'approved' && (
                      <div className="mt-3 p-3 bg-white rounded-xl border border-emerald-200 text-xs text-emerald-900">
                        <span>คำขอได้รับการอนุมัติเรียบร้อย เจ้าหน้าที่เตรียมความพร้อมสถานที่ตามเวลาดังกล่าว</span>
                        <div className="mt-1 text-[11px] text-slate-500">
                          ผู้อนุมัติ: <strong className="text-slate-800">{item.respondedByAdminName}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleAcknowledgeNotifications}
                className="px-6 py-2.5 bg-red-800 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
              >
                รับทราบทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: QUICK BOOKING MODAL ( "จองสถานที่ด่วน" )
      ========================================================================== */}
      {isQuickBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-red-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[95vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-800 to-red-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold">แบบฟอร์มจองสถานที่ด่วน</h3>
                  <p className="text-xs text-red-100">ผู้ขอจอง: {currentUser?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickBookingOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateBooking} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Conflict Warning Preview */}
              {bookingConflictWarning && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <span className="text-base">⚠️</span>
                  <div className="leading-relaxed">{bookingConflictWarning}</div>
                </div>
              )}

              {/* Venue Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เลือกสถานที่ <span className="text-red-600">*</span>
                </label>
                <select
                  value={newVenueId}
                  onChange={e => setNewVenueId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                  required
                >
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.building} - ความจุ {v.capacity} คน)
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วันที่ต้องการใช้งาน <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                  required
                />
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เวลาเริ่มต้น <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={e => setNewStartTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เวลาสิ้นสุด <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={e => setNewEndTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                    required
                  />
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วัตถุประสงค์การใช้งาน / ชื่องาน <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={newPurpose}
                  onChange={e => setNewPurpose(e.target.value)}
                  rows={3}
                  placeholder="ระบุรายละเอียดกิจกรรม เช่น การประชุมผู้ปกครอง, ค่ายติวโอลิมปิก, กิจกรรมสัปดาห์วิทยาศาสตร์..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                  required
                />
              </div>

              {/* Attendees */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  จำนวนผู้เข้าร่วมโดยประมาณ (คน)
                </label>
                <input
                  type="number"
                  min="1"
                  max="3000"
                  value={newAttendees}
                  onChange={e => setNewAttendees(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                />
              </div>

              {/* Equipment Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  อุปกรณ์ที่ต้องการขอใช้งานเพิ่มเติม
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['จอ LED / โปรเจกเตอร์', 'ไมโครโฟนไร้สาย', 'เครื่องปรับอากาศ', 'โต๊ะ-เก้าอี้เสริม', 'ระบบถ่ายทอดสด (Live Stream)'].map(item => (
                    <label key={item} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newEquipment.includes(item)}
                        onChange={e => {
                          if (e.target.checked) {
                            setNewEquipment(prev => [...prev, item]);
                          } else {
                            setNewEquipment(prev => prev.filter(x => x !== item));
                          }
                        }}
                        className="rounded text-red-700 focus:ring-red-600"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsQuickBookingOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-semibold transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-red-800 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  ยืนยันการส่งคำขอจอง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: ADMIN DAY DETAILS & CONFLICT RESOLUTION MODAL (Scrollable)
      ========================================================================== */}
      {isAdminDayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-red-100 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-900 to-red-800 p-5 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">จัดการคำขอจองประจำวัน</h3>
                  <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full">
                    {selectedDate}
                  </span>
                </div>
                <p className="text-xs text-red-200 mt-0.5">
                  ระบบตรวจสอบความทับซ้อนและอนุมัติการใช้สถานที่ (Conflict Resolution Center)
                </p>
              </div>
              <button
                onClick={() => setIsAdminDayModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* SECTION: CONFLICT RESOLUTION CARDS (Grouped conflicting requests) */}
              {selectedDateConflicts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-600 animate-ping"></span>
                    <h4 className="text-base font-bold text-red-900">
                      รายการที่มีการจองทับซ้อน (Conflict Alert - ต้องตัดสินใจ)
                    </h4>
                  </div>

                  {selectedDateConflicts.map((group, gIdx) => (
                    <div
                      key={`conflict-group-${gIdx}`}
                      className="p-5 rounded-2xl border-2 border-red-400 bg-red-50/50 shadow-md space-y-4"
                    >
                      {/* Conflict Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-red-200 gap-2">
                        <div>
                          <div className="text-xs font-bold text-red-600 uppercase tracking-wide">
                            ⚠️ ตรวจพบสถานที่และเวลาคาบเกี่ยวกัน
                          </div>
                          <div className="text-base font-extrabold text-red-950">
                            {group.venueName}
                          </div>
                        </div>
                        <div className="text-xs font-bold text-red-800 bg-red-100 px-3 py-1 rounded-full border border-red-300">
                          ช่วงเวลาที่ชนกัน: {group.timeRange}
                        </div>
                      </div>

                      <p className="text-xs text-red-700">
                        มีคำขอที่แข่งขันกันจำนวน <strong>{group.bookings.length} รายการ</strong> ด้านล่างนี้ กรุณาพิจารณาอนุมัติคำขอที่เหมาะสมที่สุดเพียง 1 รายการ และปฏิเสธรายการอื่นพร้อมระบุเหตุผล
                      </p>

                      {/* Side-by-side or stacked conflicting cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {group.bookings.map((item, idx) => (
                          <div
                            key={item.id}
                            className="p-4 rounded-xl bg-white border border-red-200 shadow-sm flex flex-col justify-between"
                          >
                            <div>
                              {/* Request Index badge */}
                              <div className="flex items-center justify-between mb-2">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                                  คำขอที่ {idx + 1} • ส่งเมื่อ {item.createdAt}
                                </span>
                                <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">
                                  ⏰ {item.startTime} - {item.endTime} น.
                                </span>
                              </div>

                              {/* Teacher info */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-7 h-7 rounded-full bg-red-800 text-white text-xs font-bold flex items-center justify-center">
                                  {item.userName.charAt(0)}
                                </span>
                                <div>
                                  <div className="font-bold text-sm text-slate-900">{item.userName}</div>
                                  <div className="text-[11px] text-slate-500">{item.userDepartment}</div>
                                </div>
                              </div>

                              {/* Purpose */}
                              <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 my-2">
                                <strong className="text-slate-900 block mb-0.5">วัตถุประสงค์:</strong>
                                {item.purpose}
                              </div>

                              <div className="text-[11px] text-slate-500 mb-3">
                                <span>จำนวนผู้เข้าร่วม: <strong>{item.attendeesCount}</strong> คน</span>
                                {item.equipment.length > 0 && (
                                  <span className="block mt-0.5 text-slate-400">
                                    อุปกรณ์: {item.equipment.join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions for this conflicting item */}
                            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                              <button
                                onClick={() => openRejectModal(item)}
                                className="flex-1 py-2 px-3 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold rounded-xl transition"
                              >
                                ❌ ไม่อนุมัติ
                              </button>
                              <button
                                onClick={() => handleApproveBooking(item.id)}
                                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                              >
                                ✅ อนุมัติคำขอนี้
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION: ALL BOOKINGS OF THE DAY */}
              <div className="space-y-3">
                <h4 className="text-base font-bold text-slate-900">
                  รายการจองทั้งหมดในวันที่ {selectedDate} ({selectedDateBookings.length} รายการ)
                </h4>

                {selectedDateBookings.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm border rounded-2xl bg-slate-50">
                    ไม่มีรายการจองในวันนี้
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateBookings.map(b => (
                      <div
                        key={b.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{b.venueName}</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                b.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : b.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {b.status === 'approved' ? 'อนุมัติแล้ว' : b.status === 'rejected' ? 'ไม่อนุมัติ' : 'รออนุมัติ'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600">
                            ช่วงเวลา: <strong className="text-slate-800">{b.startTime} - {b.endTime} น.</strong> • ผู้ขอ: {b.userName} ({b.userDepartment})
                          </div>
                          <div className="text-xs text-slate-500">
                            กิจกรรม: {b.purpose} (ผู้เข้าร่วม {b.attendeesCount} คน)
                          </div>

                          {b.status === 'rejected' && b.rejectionReason && (
                            <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200 mt-1">
                              <strong>เหตุผลที่ไม่อนุมัติ:</strong> {b.rejectionReason} (โดย {b.respondedByAdminName})
                            </div>
                          )}
                        </div>

                        {/* Admin Action */}
                        {b.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openRejectModal(b)}
                              className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold rounded-lg transition"
                            >
                              ไม่อนุมัติ...
                            </button>
                            <button
                              onClick={() => handleApproveBooking(b.id)}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                            >
                              อนุมัติ
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsAdminDayModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: MANDATORY REJECTION REASON MODAL ( บังคับพิมพ์เหตุผลก่อนกดยืนยัน )
      ========================================================================== */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="bg-rose-800 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold">ระบุเหตุผลที่ไม่อนุมัติคำขอ</h3>
                  <p className="text-xs text-rose-200">จำเป็นต้องระบุเพื่อให้ครูผู้ขอทราบเหตุผล</p>
                </div>
              </div>
              <button
                onClick={() => setRejectingBooking(null)}
                className="text-white/80 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Target booking summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                <div className="font-bold text-slate-900">{rejectingBooking.venueName}</div>
                <div>ผู้ขอ: <strong>{rejectingBooking.userName}</strong> ({rejectingBooking.userDepartment})</div>
                <div>วันที่: {rejectingBooking.date} เวลา: {rejectingBooking.startTime} - {rejectingBooking.endTime} น.</div>
                <div className="truncate text-slate-500 mt-0.5">กิจกรรม: {rejectingBooking.purpose}</div>
              </div>

              {/* Textarea for Rejection Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เหตุผลในการไม่อนุมัติ <span className="text-rose-600">* (จำเป็นต้องกรอก)</span>
                </label>
                <textarea
                  value={rejectionReasonInput}
                  onChange={e => setRejectionReasonInput(e.target.value)}
                  rows={4}
                  placeholder="พิมพ์เหตุผลที่ปฏิเสธ เช่น สถานที่ถูกใช้ในกิจกรรมหลักของโรงเรียน หรือแนะนำให้ยื่นขอใช้ห้องอื่น..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:border-transparent"
                  required
                />
                <div className="flex items-center justify-between text-[11px] mt-1">
                  <span className={rejectionReasonInput.trim().length < 5 ? 'text-rose-600 font-semibold' : 'text-emerald-600'}>
                    {rejectionReasonInput.trim().length < 5 ? 'กรุณากรอกเหตุผลอย่างน้อย 5 ตัวอักษร' : '✓ ข้อมูลครบถ้วน'}
                  </span>
                  <span className="text-slate-400">{rejectionReasonInput.length} ตัวอักษร</span>
                </div>
              </div>

              {/* Quick Preset Buttons for rapid testing */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1">เลือกข้อความสำเร็จรูปเพื่อความรวดเร็ว:</div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'เวลาทับซ้อนกับกิจกรรมหลักของโรงเรียนตามปฏิทินปฏิบัติงาน',
                    'ขออนุมัติให้อีกคำขอที่ยื่นก่อนหน้า ขออภัยในความไม่สะดวก',
                    'สถานที่อยู่ระหว่างการซ่อมบำรุงระบบเครื่องปรับอากาศและระบบไฟ',
                    'ขอความกรุณาประสานงานเพื่อเลื่อนเวลาใช้งานเป็นช่วงบ่าย'
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setRejectionReasonInput(preset)}
                      className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                    >
                      + {preset.substring(0, 28)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingBooking(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-semibold transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={rejectionReasonInput.trim().length < 5}
                  onClick={handleConfirmReject}
                  className={`px-6 py-2 rounded-xl text-sm font-bold shadow-sm transition ${
                    rejectionReasonInput.trim().length >= 5
                      ? 'bg-rose-700 hover:bg-rose-800 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  ยืนยันการไม่อนุมัติคำขอ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilityBookingApp;
