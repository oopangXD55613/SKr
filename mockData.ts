import { User, Venue, Booking } from './types';

export const MOCK_USERS: User[] = [
  {
    id: 'u-teacher-1',
    name: 'ครูศิริพร ใจดี',
    username: 'siriporn.j',
    role: 'teacher',
    department: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    email: 'siriporn.j@skr.ac.th',
    phone: '081-234-5678'
  },
  {
    id: 'u-teacher-2',
    name: 'ครูธนากร กิจการ',
    username: 'thanakorn.k',
    role: 'teacher',
    department: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    email: 'thanakorn.k@skr.ac.th',
    phone: '082-345-6789'
  },
  {
    id: 'u-teacher-3',
    name: 'ครูประสิทธิ์ วงศ์วิวัฒน์',
    username: 'prasit.w',
    role: 'teacher',
    department: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    email: 'prasit.w@skr.ac.th',
    phone: '083-456-7890'
  },
  {
    id: 'u-admin-1',
    name: 'นายวิโรจน์ อาคารชัย',
    username: 'admin.viroj',
    role: 'admin',
    department: 'งานบริหารอาคารสถานที่และสภาพแวดล้อม',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    email: 'viroj.a@skr.ac.th',
    phone: '042-711234 ต่อ 105'
  }
];

export const MOCK_VENUES: Venue[] = [
  {
    id: 'v1',
    name: 'หอประชุมรวมใจ 100 ปี สกลราชฯ',
    code: 'AUD-100',
    building: 'อาคาร 9 (หอประชุมเฉลิมพระเกียรติ)',
    capacity: 1200,
    description: 'หอประชุมใหญ่ปรับอากาศ พร้อมเวทีขนาดใหญ่ ระบบไฟ แสง สี เสียง และโปรเจกเตอร์ 4K เหมาะสำหรับกิจกรรมโรงเรียน พิธีการ และการประชุมใหญ่',
    amenities: ['เครื่องปรับอากาศ', 'ระบบเครื่องเสียงคอนเสิร์ต', 'ไมโครโฟนไร้สาย 8 ตัว', 'จอ LED ขนาดใหญ่', 'ห้องรับรอง VIP'],
    type: 'hall'
  },
  {
    id: 'v2',
    name: 'ห้องประชุมทองกวาว',
    code: 'CONF-TG',
    building: 'อาคาร 1 ชั้น 2',
    capacity: 60,
    description: 'ห้องประชุมแบบบอร์ดรูม โต๊ะประชุมรูปตัว U พร้อมไมค์ประจำที่นั่งและระบบ Video Conference เหมาะสำหรับการประชุมกลุ่มสาระฯ หรือคณะกรรมการ',
    amenities: ['ไมโครโฟนตั้งโต๊ะ 30 จุด', 'จอ Smart TV 85 นิ้ว', 'ระบบ Zoom Room', 'เครื่องปรับอากาศ'],
    type: 'meeting'
  },
  {
    id: 'v3',
    name: 'ลานกิจกรรมโดม 70 ปี สกลราชฯ',
    code: 'DOME-70',
    building: 'ลานอเนกประสงค์กลางแจ้งมีหลังคา',
    capacity: 2500,
    description: 'โดมกีฬาและกิจกรรมอเนกประสงค์ในร่ม มีพัดลมไอน้ำ อัฒจันทร์รอบทิศทาง เหมาะสำหรับกิจกรรมหน้าเสาธง นิทรรศการ และการแข่งขันกีฬา',
    amenities: ['หลังคาโดมกันแดด-ฝน', 'อัฒจันทร์เชียร์', 'ระบบเสียงกระจายข่าว', 'สนามบาสเกตบอล/วอลเลย์บอล'],
    type: 'outdoor'
  },
  {
    id: 'v4',
    name: 'ห้อง Smart Classroom 521',
    code: 'SC-521',
    building: 'อาคาร 5 ชั้น 2',
    capacity: 45,
    description: 'ห้องเรียนอัจฉริยะ โต๊ะเก้าอี้ปรับเปลี่ยนรูปแบบได้ พร้อม Interactive Flat Panel และแล็ปท็อปประจำกลุ่ม',
    amenities: ['Interactive Display 75 นิ้ว', 'Wi-Fi 6 ความเร็วสูง', 'เต้ารับไฟฟ้ารายโต๊ะ', 'เครื่องปรับอากาศ'],
    type: 'classroom'
  },
  {
    id: 'v5',
    name: 'สนามฟุตบอลและลู่วิ่งมาตรฐาน',
    code: 'STAD-01',
    building: 'สนามกีฬาโรงเรียนสกลราชวิทยานุกุล',
    capacity: 1500,
    description: 'สนามฟุตบอลหญ้าจริงขนาดมาตรฐาน พร้อมลู่วิ่งยางสังเคราะห์ 8 ช่องวิ่ง เหมาะสำหรับกีฬาสีและกิจกรรมกลางแจ้งขนาดใหญ่',
    amenities: ['อัฒจันทร์ประธาน', 'ไฟสปอร์ตไลท์ส่องสว่าง', 'ห้องเปลี่ยนเสื้อผ้าและห้องน้ำ'],
    type: 'outdoor'
  }
];

export const INITIAL_BOOKINGS: Booking[] = [
  // 1. เคสการจองทับซ้อน (Conflict Cases) วันที่ 12 ก.ย. 2026 ที่ หอประชุมรวมใจ 100 ปี
  {
    id: 'bk-conf-1',
    userId: 'u-teacher-2',
    userName: 'ครูธนากร กิจการ',
    userDepartment: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
    venueId: 'v1',
    venueName: 'หอประชุมรวมใจ 100 ปี สกลราชฯ',
    date: '2026-09-12',
    startTime: '08:30',
    endTime: '11:30',
    purpose: 'การประกวดสุนทรพจน์และความสามารถทางภาษาไทย สัปดาห์ส่งเสริมวัฒนธรรม',
    attendeesCount: 350,
    equipment: ['ไมโครโฟนไร้สาย 4 ตัว', 'จอ LED หน้าเวที', 'เครื่องปรับอากาศ'],
    status: 'pending',
    createdAt: '2026-09-08 08:15'
  },
  {
    id: 'bk-conf-2',
    userId: 'u-teacher-3',
    userName: 'ครูประสิทธิ์ วงศ์วิวัฒน์',
    userDepartment: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
    venueId: 'v1',
    venueName: 'หอประชุมรวมใจ 100 ปี สกลราชฯ',
    date: '2026-09-12',
    startTime: '09:30',
    endTime: '12:30',
    purpose: 'ค่ายฝึกทักษะคณิตศาสตร์โอลิมปิกวิชาการและเตรียมสอบ สอวน. ม.ปลาย',
    attendeesCount: 280,
    equipment: ['โปรเจกเตอร์ฉายโจทย์', 'โต๊ะเก้าอี้จัดสอบ 280 ชุด', 'ไมโครโฟน'],
    status: 'pending',
    createdAt: '2026-09-08 09:40'
  },

  // 2. เคสที่ถูก "ไม่อนุมัติ" (เพื่อทดสอบ Teacher Notification System ที่ต้องแสดงเหตุผล และชื่อแอดมิน)
  {
    id: 'bk-notif-rejected',
    userId: 'u-teacher-1',
    userName: 'ครูศิริพร ใจดี',
    userDepartment: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
    venueId: 'v1',
    venueName: 'หอประชุมรวมใจ 100 ปี สกลราชฯ',
    date: '2026-09-08',
    startTime: '09:00',
    endTime: '12:00',
    purpose: 'การอบรมเชิงปฏิบัติการสะเต็มศึกษา (STEM Workshop) ม.ต้น',
    attendeesCount: 200,
    equipment: ['จอ LED', 'ปลั๊กพ่วง 20 จุด'],
    status: 'rejected',
    createdAt: '2026-09-04 14:20',
    rejectionReason: 'เนื่องจากช่วงเวลาดังกล่าวตรงกับพิธีมอบทุนการศึกษาประจำปีของโรงเรียน ซึ่งต้องใช้พื้นที่หอประชุมเต็มรูปแบบ จึงจำเป็นต้องขอปฏิเสธคำขอนี้ ขอความกรุณาเลื่อนวันจัดกิจกรรมหรือเลือกใช้ห้อง Smart Classroom 521 แทน',
    respondedByAdminName: 'นายวิโรจน์ อาคารชัย (หัวหน้างานอาคารสถานที่)',
    respondedAt: '2026-09-06 10:30',
    hasBeenNotifiedToTeacher: false // จำลองว่ายังไม่ได้เปิดอ่านแจ้งเตือน เพื่อให้เด้ง Modal เมื่อครูศิริพรล็อกอิน
  },

  // 3. เคสที่ "อนุมัติแล้ว" (Approved)
  {
    id: 'bk-approved-1',
    userId: 'u-teacher-1',
    userName: 'ครูศิริพร ใจดี',
    userDepartment: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
    venueId: 'v2',
    venueName: 'ห้องประชุมทองกวาว',
    date: '2026-09-10',
    startTime: '13:00',
    endTime: '16:00',
    purpose: 'การประชุมคณะกรรมการพัฒนาหลักสูตรวิทยาศาสตร์ระดับชั้น ม.ปลาย',
    attendeesCount: 25,
    equipment: ['Smart TV', 'ไมค์ประจำที่นั่ง'],
    status: 'approved',
    createdAt: '2026-09-05 11:00',
    respondedByAdminName: 'นายวิโรจน์ อาคารชัย (หัวหน้างานอาคารสถานที่)',
    respondedAt: '2026-09-05 15:10',
    hasBeenNotifiedToTeacher: false // จะเด้งแจ้งเตือนอนุมัติให้ครูศิริพรเห็นด้วย
  },

  // 4. เคสรออนุมัติปกติ (ไม่มีข้อขัดแย้ง)
  {
    id: 'bk-pending-normal',
    userId: 'u-teacher-2',
    userName: 'ครูธนากร กิจการ',
    userDepartment: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
    venueId: 'v3',
    venueName: 'ลานกิจกรรมโดม 70 ปี สกลราชฯ',
    date: '2026-09-15',
    startTime: '08:00',
    endTime: '15:30',
    purpose: 'จัดนิทรรศการสัปดาห์วันภาษาไทยแห่งชาติ และการแสดงละครวรรณคดี',
    attendeesCount: 800,
    equipment: ['เครื่องเสียงโดม', 'เวทีเคลื่อนที่', 'เต็นท์นิทรรศการ 10 หลัง'],
    status: 'pending',
    createdAt: '2026-09-07 16:30'
  },

  // 5. รายการอนุมัติอื่นในปฏิทิน
  {
    id: 'bk-approved-2',
    userId: 'u-teacher-3',
    userName: 'ครูประสิทธิ์ วงศ์วิวัฒน์',
    userDepartment: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
    venueId: 'v4',
    venueName: 'ห้อง Smart Classroom 521',
    date: '2026-09-18',
    startTime: '10:00',
    endTime: '12:00',
    purpose: 'การสอบแข่งขันแก้ปัญหาคณิตศาสตร์ออนไลน์ระดับภาคตะวันออกเฉียงเหนือ',
    attendeesCount: 40,
    equipment: ['Interactive Display', 'Wi-Fi 6', 'ปลั๊กชาร์จ'],
    status: 'approved',
    createdAt: '2026-09-06 09:15',
    respondedByAdminName: 'นายวิโรจน์ อาคารชัย (หัวหน้างานอาคารสถานที่)',
    respondedAt: '2026-09-07 08:30',
    hasBeenNotifiedToTeacher: true
  }
];
