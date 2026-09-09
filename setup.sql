-- ====================================================================
-- ระบบจองสถานที่ โรงเรียนสกลราชวิทยานุกุล (Sakonraj Booking System)
-- ไฟล์ setup.sql เวอร์ชันระบบจริง (Production Database Schema)
-- ====================================================================

-- 1. ล้างตารางและฟังก์ชันเดิม (ถ้ามี)
DROP TABLE IF EXISTS public.system_notifications CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.venues CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE IF EXISTS public.booking_status CASCADE;
DROP TYPE IF EXISTS public.venue_status CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- 2. สร้าง ENUM Types
CREATE TYPE public.user_role AS ENUM ('teacher', 'admin');
CREATE TYPE public.booking_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.venue_status AS ENUM ('available', 'maintenance');

-- 3. ตาราง PROFILES (เก็บข้อมูลครูและแอดมิน ด้วยรหัสบัตรประชาชน และวันเกิด)
CREATE TABLE public.profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id  VARCHAR(13) UNIQUE NOT NULL,      -- Username: รหัสบัตรประชาชน 13 หลัก
    password    VARCHAR(20) NOT NULL,              -- Password: วัน/เดือน/ปีเกิด เช่น 15/08/2530
    full_name   TEXT NOT NULL,
    role        public.user_role NOT NULL DEFAULT 'teacher',
    department  TEXT DEFAULT 'กลุ่มสาระการเรียนรู้',
    avatar_url  TEXT,
    phone       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ตาราง VENUES (สถานที่ของโรงเรียน พร้อมสถานะปิดปรับปรุง)
CREATE TABLE public.venues (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL,
    code        TEXT UNIQUE,
    building    TEXT,
    capacity    INT CHECK (capacity > 0),
    description TEXT,
    status      public.venue_status NOT NULL DEFAULT 'available', -- 'available' หรือ 'maintenance'
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ตาราง BOOKINGS (การจองสถานที่)
CREATE TABLE public.bookings (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venue_id         BIGINT NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    purpose          TEXT NOT NULL,
    attendees_count  INT DEFAULT 1 CHECK (attendees_count > 0),
    booking_date     DATE NOT NULL,
    start_time       TIME NOT NULL,
    end_time         TIME NOT NULL,
    status           public.booking_status NOT NULL DEFAULT 'pending',
    reviewed_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    is_read          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_time_order CHECK (end_time > start_time)
);

-- 6. ตาราง SYSTEM_NOTIFICATIONS (การแจ้งเตือนเรื่องสถานที่สำหรับคุณครูทุกคน)
CREATE TABLE public.system_notifications (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'venue_update', -- 'venue_added', 'venue_maintenance', 'general'
    venue_id    BIGINT REFERENCES public.venues(id) ON DELETE SET NULL,
    created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. สร้าง INDEXES เพื่อความรวดเร็ว
CREATE INDEX idx_profiles_citizen ON public.profiles (citizen_id);
CREATE INDEX idx_bookings_date ON public.bookings (booking_date, venue_id);
CREATE INDEX idx_bookings_user ON public.bookings (user_id);
CREATE INDEX idx_bookings_status ON public.bookings (status);

-- 8. ใส่ข้อมูลเริ่มต้นผู้ใช้งาน (User & Admin Accounts)
INSERT INTO public.profiles (id, citizen_id, password, full_name, role, department, avatar_url, phone) VALUES
    -- แอดมินงานอาคารสถานที่
    ('44444444-4444-4444-4444-444444444444', '1479900123456', '01/01/2525', 'นายวิโรจน์ อาคารชัย', 'admin', 'งานบริหารอาคารสถานที่และสภาพแวดล้อม', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', '042-711234 ต่อ 105'),
    
    -- ครูศิริพร (มีประวัติผลการจอง)
    ('11111111-1111-1111-1111-111111111111', '1479900234567', '15/08/2530', 'ครูศิริพร ใจดี', 'teacher', 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', '081-234-5678'),
    
    -- ครูธนากร (มีคำขอทับซ้อนกับครูประสิทธิ์)
    ('22222222-2222-2222-2222-222222222222', '1479900345678', '20/04/2533', 'ครูธนากร กิจการ', 'teacher', 'กลุ่มสาระการเรียนรู้ภาษาไทย', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', '082-345-6789'),
    
    -- ครูประสิทธิ์
    ('33333333-3333-3333-3333-333333333333', '1479900456789', '05/12/2528', 'ครูประสิทธิ์ วงศ์วิวัฒน์', 'teacher', 'กลุ่มสาระการเรียนรู้คณิตศาสตร์', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', '083-456-7890');

-- 9. ใส่ข้อมูลสถานที่เริ่มต้น (Venues)
INSERT INTO public.venues (name, code, building, capacity, description, status, is_active) VALUES
    ('หอประชุมรวมใจ 100 ปี สกลราชฯ', 'AUD-100', 'อาคาร 9 (หอประชุมเฉลิมพระเกียรติ)', 1200, 'หอประชุมใหญ่ปรับอากาศ พร้อมเวที แสง สี เสียง และจอภาพ 4K', 'available', TRUE),
    ('ห้องประชุมทองกวาว', 'CONF-TG', 'อาคาร 1 ชั้น 2', 60, 'ห้องประชุมบอร์ดรูม โต๊ะประชุมตัว U พร้อมระบบ Video Conference', 'available', TRUE),
    ('ลานกิจกรรมโดม 70 ปี สกลราชฯ', 'DOME-70', 'ลานอเนกประสงค์กลางแจ้งมีหลังคา', 2500, 'โดมกีฬาและกิจกรรมอเนกประสงค์ในร่ม มีพัดลมไอน้ำ อัฒจันทร์', 'available', TRUE),
    ('ห้อง Smart Classroom 521', 'SC-521', 'อาคาร 5 ชั้น 2', 45, 'ห้องเรียนอัจฉริยะ โต๊ะเก้าอี้ปรับได้ พร้อม Interactive Display', 'available', TRUE);

-- 10. ใส่ข้อมูลการจองจำลองในระบบ (Bookings)
INSERT INTO public.bookings (venue_id, user_id, purpose, attendees_count, booking_date, start_time, end_time, status, reviewed_by, rejection_reason, is_read) VALUES
    -- เคสทับซ้อน 12 ก.ย. 2569 ที่ หอประชุม 100 ปี
    (1, '22222222-2222-2222-2222-222222222222', 'การประกวดสุนทรพจน์และความสามารถทางภาษาไทย สัปดาห์ส่งเสริมวัฒนธรรม', 350, '2026-09-12', '08:30:00', '11:30:00', 'pending', NULL, NULL, FALSE),
    (1, '33333333-3333-3333-3333-333333333333', 'ค่ายฝึกทักษะคณิตศาสตร์โอลิมปิกวิชาการและเตรียมสอบ สอวน. ม.ปลาย', 280, '2026-09-12', '09:30:00', '12:30:00', 'pending', NULL, NULL, FALSE),
    
    -- เคสไม่อนุมัติ (แสดงเหตุผลและชื่อแอดมิน)
    (1, '11111111-1111-1111-1111-111111111111', 'การอบรมเชิงปฏิบัติการสะเต็มศึกษา (STEM Workshop) ม.ต้น', 200, '2026-09-08', '09:00:00', '12:00:00', 'rejected', '44444444-4444-4444-4444-444444444444', 'เนื่องจากช่วงเวลาดังกล่าวตรงกับพิธีมอบทุนการศึกษาประจำปีของโรงเรียน ซึ่งต้องใช้พื้นที่หอประชุมเต็มรูปแบบ จึงจำเป็นต้องขอปฏิเสธคำขอนี้ ขอความกรุณาเลื่อนวันจัดกิจกรรมหรือเลือกใช้ห้อง Smart Classroom 521 แทน', FALSE),
    
    -- เคสอนุมัติแล้ว
    (2, '11111111-1111-1111-1111-111111111111', 'การประชุมคณะกรรมการพัฒนาหลักสูตรวิทยาศาสตร์ระดับชั้น ม.ปลาย', 25, '2026-09-10', '13:00:00', '16:00:00', 'approved', '44444444-4444-4444-4444-444444444444', NULL, FALSE),
    
    -- เคสรออนุมัติปกติ
    (3, '22222222-2222-2222-2222-222222222222', 'จัดนิทรรศการสัปดาห์วันภาษาไทยแห่งชาติ และการแสดงละครวรรณคดี', 800, '2026-09-15', '08:00:00', '15:30:00', 'pending', NULL, NULL, FALSE);

-- 11. ใส่ข้อมูลการแจ้งเตือนระบบเริ่มต้น (System Notifications)
INSERT INTO public.system_notifications (title, message, type, venue_id, created_by) VALUES
    ('ยินดีต้อนรับสู่ระบบจองสถานที่', 'ระบบจองและบริหารจัดการสถานที่โรงเรียนสกลราชวิทยานุกุล เปิดให้บริการอย่างเป็นทางการ', 'general', NULL, '44444444-4444-4444-4444-444444444444');

-- 12. เปิดสิทธิ์ RLS (Row Level Security) แบบ Fully Permissive สำหรับ Web Application
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_profiles_ops" ON public.profiles FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "allow_all_venues_ops" ON public.venues FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "allow_all_bookings_ops" ON public.bookings FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "allow_all_notifications_ops" ON public.system_notifications FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- 13. เปิดใช้งาน Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.venues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_notifications;
