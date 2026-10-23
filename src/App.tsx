import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowDownLeft,
  Bell,
  BookOpen,
  Bus,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock3,
  DoorOpen,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Menu,
  Minus,
  Monitor,
  Plus,
  QrCode,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import './App.css'

type Locale = 'ar' | 'en'
type Role = 'faculty' | 'student' | 'maintenance' | 'transport' | 'lab'
type Page =
  | 'dashboard'
  | 'planner'
  | 'catalog'
  | 'resources'
  | 'requests'
  | 'department'
  | 'maintenance'
  | 'transport'
  | 'notifications'
  | 'profile'
type RequestStatus = 'submitted' | 'review' | 'approved' | 'rejected' | 'completed' | 'cancelled'
type Service = 'room' | 'laboratory' | 'maintenance' | 'transport'
type Layout = 'classroom' | 'exam' | 'u-shape' | 'workshop'
type CollegeId = 'engineering' | 'computer-science' | 'science-arts'

type College = {
  id: CollegeId
  nameAr: string
  nameEn: string
  url: string
}

type Room = {
  id: string
  collegeId: CollegeId
  nameAr: string
  nameEn: string
  building: string
  floor: number
  kind: 'classroom' | 'hall' | 'laboratory' | 'meeting'
  capacity: number
  seatsPerRow: number
  rows: number
  equipment: string[]
  available: boolean
}

type NavRequest = {
  id: string
  collegeId: CollegeId
  service: Service
  title: string
  resource: string
  date: string
  time: string
  attendees: number
  status: RequestStatus
  owner: string
  department: string
  notes?: string
  attachmentName?: string
  attachmentData?: string
  comments?: string[]
}

type AppNotification = {
  id: string
  collegeId?: CollegeId
  text?: string
  messageKey?: string
  timeKey: string
  tone: string
}

type UserProfile = {
  id: number
  username: string
  full_name: string
  role: Role
  university_id: string | null
  college: string | null
  department: string | null
  specialization: string | null
  job_title: string | null
  mobile: string
  email: string
  photo_data: string | null
  permissions: string[]
}

type ApiResponse<T> = T & { message?: string }

async function apiRequest<T>(path: string, token: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const result = await response.json() as ApiResponse<T>
  if (!response.ok) throw new Error(result.message || `Request failed (${response.status})`)
  return result
}

const colleges: College[] = [
  { id: 'engineering', nameAr: 'كلية الهندسة', nameEn: 'College of Engineering', url: 'https://portal.nu.edu.sa/web/college-engineering' },
  { id: 'computer-science', nameAr: 'كلية علوم الحاسب ونظم المعلومات', nameEn: 'College of Computer Science and Information Systems', url: 'https://portal.nu.edu.sa/web/computer-science-college' },
  { id: 'science-arts', nameAr: 'كلية العلوم والآداب', nameEn: 'College of Science and Arts', url: 'https://portal.nu.edu.sa/web/science-and-arts-najran-college' },
]

const rooms: Room[] = [
  { id: 'C-204', collegeId: 'engineering', nameAr: 'قاعة التعلم النشط', nameEn: 'Active Learning Room', building: 'مبنى الكلية', floor: 2, kind: 'classroom', capacity: 36, seatsPerRow: 9, rows: 4, equipment: ['Projector', 'Whiteboard', 'Video conference'], available: true },
  { id: 'A-101', collegeId: 'engineering', nameAr: 'قاعة المحاضرات ١', nameEn: 'Lecture Hall 1', building: 'مبنى الكلية', floor: 1, kind: 'hall', capacity: 120, seatsPerRow: 12, rows: 8, equipment: ['Projector', 'Microphone', 'Whiteboard'], available: true },
  { id: 'E-LAB1', collegeId: 'engineering', nameAr: 'مختبر الهندسة التطبيقي', nameEn: 'Engineering Practice Lab', building: 'مبنى الكلية', floor: 3, kind: 'laboratory', capacity: 28, seatsPerRow: 7, rows: 4, equipment: ['Computers', 'Projector', 'Whiteboard'], available: true },
  { id: 'C-110', collegeId: 'engineering', nameAr: 'قاعة المحاضرات ٢', nameEn: 'Lecture Hall 2', building: 'مبنى الكلية', floor: 1, kind: 'hall', capacity: 80, seatsPerRow: 10, rows: 8, equipment: ['Projector', 'Microphone', 'Whiteboard'], available: true },
  { id: 'CS-312', collegeId: 'computer-science', nameAr: 'مختبر الحاسب ٣', nameEn: 'Computer Lab 3', building: 'مبنى الكلية', floor: 3, kind: 'laboratory', capacity: 28, seatsPerRow: 7, rows: 4, equipment: ['Computers', 'Projector', 'Whiteboard'], available: true },
  { id: 'CS-208', collegeId: 'computer-science', nameAr: 'قاعة مشاريع الحاسب', nameEn: 'Computing Projects Room', building: 'مبنى الكلية', floor: 2, kind: 'classroom', capacity: 32, seatsPerRow: 8, rows: 4, equipment: ['Computers', 'Display', 'Whiteboard'], available: true },
  { id: 'CS-105', collegeId: 'computer-science', nameAr: 'قاعة الاجتماعات التقنية', nameEn: 'Technology Seminar Room', building: 'مبنى الكلية', floor: 1, kind: 'meeting', capacity: 24, seatsPerRow: 6, rows: 4, equipment: ['Display', 'Video conference', 'Whiteboard'], available: true },
  { id: 'SA-114', collegeId: 'science-arts', nameAr: 'مختبر العلوم', nameEn: 'Science Teaching Lab', building: 'مبنى الكلية', floor: 1, kind: 'laboratory', capacity: 26, seatsPerRow: 7, rows: 4, equipment: ['Computers', 'Projector', 'Whiteboard'], available: true },
  { id: 'SA-202', collegeId: 'science-arts', nameAr: 'قاعة دراسية متعددة الاستخدام', nameEn: 'Flexible Teaching Room', building: 'مبنى الكلية', floor: 2, kind: 'classroom', capacity: 40, seatsPerRow: 10, rows: 4, equipment: ['Projector', 'Whiteboard', 'Video conference'], available: true },
  { id: 'SA-101', collegeId: 'science-arts', nameAr: 'قاعة المحاضرات الكبرى', nameEn: 'Main Lecture Room', building: 'مبنى الكلية', floor: 1, kind: 'hall', capacity: 90, seatsPerRow: 10, rows: 9, equipment: ['Projector', 'Microphone', 'Whiteboard'], available: true },
]

function readStoredCollege(): CollegeId {
  try {
    const stored = localStorage.getItem('navu-college')
    if (colleges.some((college) => college.id === stored)) return stored as CollegeId
  } catch {
    // Keep the default demo college when browser storage is unavailable.
  }
  return 'engineering'
}

function readStoredRooms(): Room[] {
  try {
    const stored = localStorage.getItem('navu-resources')
    if (stored) {
      const parsed: unknown = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        const storedRooms = parsed as Room[]
        return rooms.map((seed) => {
          const saved = storedRooms.find((item) => item.id === seed.id)
          return saved ? {
            ...seed,
            capacity: Number.isFinite(saved.capacity) && saved.capacity > 0 ? saved.capacity : seed.capacity,
            available: typeof saved.available === 'boolean' ? saved.available : seed.available,
          } : seed
        })
      }
    }
  } catch {
    // Use the included inventory when browser storage cannot be read.
  }
  return rooms
}

const dateAfter = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const timeAsMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

const translations: Record<Locale, Record<string, string>> = {
  en: {
    brand: 'NavU', subtitle: 'UNIVERSITY SERVICES', campus: 'Najran University', campusOnline: 'Campus services', shortcuts: 'SHORTCUTS', step: 'STEP', services: 'SERVICES',
    college: 'College', chooseCollege: 'Choose college', visitCollege: 'Official college page',
    dashboard: 'Overview', planner: 'Room booking', catalog: 'Resource catalog', resources: 'Resource management', requests: 'My requests',
    department: 'Department desk', maintenance: 'Maintenance', transport: 'Transportation', notifications: 'Notifications',
    home: 'Welcome', overview: 'University services in one place.', demo: 'University services',
    faculty: 'Faculty member', student: 'Student', lab: 'Laboratory employee', maintenanceRole: 'Maintenance employee',
    transportRole: 'Transportation employee', role: 'Account', switchRole: 'Account',
    newBooking: 'Plan a room', roomRequestAction: 'Submit a room request', roomRequestForm: 'Room booking request', browse: 'Browse resources', totalRequests: 'Total requests', pending: 'Awaiting review',
    approved: 'Approved', completed: 'Completed', recent: 'Recent activity', seeAll: 'View all', quickActions: 'Quick actions',
    roomPlanner: 'Room booking', plannerIntro: 'Choose a college and room, then submit your booking request.',
    roomSelection: 'Choose a room', filters: 'Filters', allRooms: 'All room types', classroom: 'Classroom', hall: 'Lecture hall',
    laboratory: 'Laboratory', meeting: 'Meeting room', building: 'Building', floor: 'Floor', capacity: 'Capacity',
    seats: 'configured seats', attendees: 'Attendees', maxCapacity: 'Maximum capacity', remaining: 'Remaining seats',
    requested: 'Requested attendees', eventName: 'Course or event name', eventPlaceholder: 'e.g. Design thinking workshop',
    date: 'Date', startTime: 'Start time', endTime: 'End time', equipment: 'Required equipment', notes: 'Additional notes',
    notesPlaceholder: 'Anything else the department should know?', layout: 'Seating layout', reset: 'Reset layout',
    rows: 'Rows', seatsRow: 'Seats per row', classroomLayout: 'Classroom', examLayout: 'Examination',
    uShape: 'U-shaped', workshop: 'Workshop', preview: 'Room preview', door: 'Door', screen: 'Display screen',
    instructor: 'Instructor', walkway: 'Accessible walkway', submit: 'Submit booking request', unavailable: 'Unavailable for this time',
    available: 'Available', suggestions: 'Suggested alternatives', simulated: 'Choose a suitable available room.',
    useRoom: 'Preview this room', requestSubmitted: 'Request submitted', requestId: 'Your request ID',
    requestSearch: 'Search by ID, service, or resource', allStatuses: 'All statuses', submitted: 'Submitted',
    review: 'Under review', rejected: 'Rejected', cancelled: 'Cancelled', status: 'Status', request: 'Request',
    resource: 'Resource', owner: 'Requested by', actions: 'Actions', cancel: 'Cancel request',
    confirmCancel: 'Cancel this pending request?', noRequests: 'No requests match your search.',
    catalogIntro: 'Browse rooms and facilities by college.', searchResources: 'Search resources',
    resourceManagementTitle: 'Managed resources', resourceManagementIntro: 'Update room availability and capacity.',
    roomCapacity: 'Room capacity', resourceAvailability: 'Availability', makeAvailable: 'Set available', makeUnavailable: 'Set unavailable',
    attachment: 'Attach an image or PDF (up to 400 KB)',
    viewPlan: 'View room plan', qrInfo: 'Show QR resource info', qrDemo: 'Resource QR', resourceId: 'Resource ID',
    location: 'Location', maintenanceStatus: 'Maintenance status', good: 'No active issues', departmentTitle: 'Department service desk',
    departmentIntro: 'Review assigned requests and keep campus services moving.', incoming: 'Incoming requests',
    awaitingAction: 'Awaiting your action', utilization: 'Resource utilization', alerts: 'Maintenance alerts',
    reviewRequest: 'Review request', approve: 'Approve', reject: 'Reject', markComplete: 'Mark complete',
    comment: 'Department comment', commentPlaceholder: 'Add an update for the requester…', saveComment: 'Save comment',
    maintenanceTitle: 'Report a maintenance issue', resourceRoom: 'Room or resource ID', problem: 'Problem category',
    problemType: 'Select a category', electrical: 'Electrical', furniture: 'Furniture', equipmentIssue: 'Equipment',
    cleaning: 'Cleaning', priority: 'Priority', normal: 'Normal', urgent: 'Urgent', description: 'Describe the issue',
    sendReport: 'Submit maintenance request', transportTitle: 'Request campus transportation',
    pickup: 'Pickup location', destination: 'Destination', passengers: 'Number of passengers', purpose: 'Trip purpose',
    requestRide: 'Submit transport request', notificationsTitle: 'Updates and notifications', markRead: 'Mark all as read',
    notification1: 'Your request NU-24081 is under review.', notification2: 'The laboratory request was approved.',
    notification3: 'Maintenance request NU-24052 was completed.', justNow: 'Just now', earlier: 'Today · 10:42',
    search: 'Search', profile: 'My profile', signOut: 'Sign out', welcome: 'Welcome back',
    welcomeName: 'Welcome,', profileDetails: 'Personal details', fullName: 'Full name', universityId: 'University ID',
    specialization: 'Specialization', jobTitle: 'Job title', mobile: 'Mobile number', saveProfile: 'Save changes',
    profileSaved: 'Profile changes saved.', choosePhoto: 'Update profile photo', profileDepartment: 'College / department',
    profileRole: 'Role', emailAddress: 'Email address', maintenanceDept: 'Maintenance Department',
    transportDept: 'Transportation Department', laboratoryDept: 'Laboratory Department',
    unauthorizedPage: 'This page is not available for your account.',
    roomConflict: 'This room is unavailable or reserved during the selected time.', capacityWarning: 'Attendees exceed the available configured seats.',
    layoutWarning: 'Configured seating cannot exceed the supported room capacity.', selectRoom: 'Select a room to preview it.',
    clear: 'Clear filters', nextStep: 'Submit a request', kind: 'Type', equipmentCount: 'equipment items',
    costReview: 'Cost assessment', vehicleAssignment: 'Bus interior', noCost: 'Confirmed after request review',
    estimatedCost: 'Estimated cost', vehicle: 'Vehicle', driver: 'Driver', sampleOnly: 'University services',
    login: 'Sign in to NavU', email: 'Username', password: 'Password', loginButton: 'Sign in',
    loginNote: 'Sign in to continue to university services.',
    rememberMe: 'Remember me', forgotPassword: 'Forgot password?', forgotPasswordHelp: 'To reset your password, contact your university account administrator.',
    collegeForRequest: 'Event location', eventLocation: 'Event location', busInterior: 'Bus seating layout', busCapacity: 'Passenger seating',
    raiseTicket: 'Submit maintenance ticket', noMaintenanceTickets: 'No maintenance tickets have been submitted.',
    vehiclePending: 'Assigned after request review',
    maintenanceSummary: 'Maintenance ticket summary',
    invalidLogin: 'Username or password is incorrect.',
    footerCopyright: 'All rights reserved to the site developers YHAS',
    seatsLabel: 'seats', requestDetails: 'Request details', close: 'Close', add: 'Add', remove: 'Remove',
    approvalUpdated: 'Request status updated.', commentSaved: 'Comment saved.', submittedToast: 'Your request was added to tracking.',
    invalidSeats: 'Set the requested attendee count within the room capacity before submitting.',
    invalidTime: 'The end time must be later than the start time.',
    invalidAttendees: 'Enter at least one attendee.',
  },
  ar: {
    brand: 'NavU', subtitle: 'الخدمات الجامعية', campus: 'جامعة نجران', campusOnline: 'الخدمات الجامعية', shortcuts: 'اختصارات', step: 'الخطوة', services: 'الخدمات',
    college: 'الكلية', chooseCollege: 'اختر الكلية', visitCollege: 'صفحة الكلية الرسمية',
    dashboard: 'نظرة عامة', planner: 'حجز القاعات', catalog: 'دليل الموارد', resources: 'إدارة الموارد', requests: 'طلباتي',
    department: 'مكتب الأقسام', maintenance: 'الصيانة', transport: 'النقل', notifications: 'الإشعارات',
    home: 'مرحباً', overview: 'خدمات الجامعة في مكان واحد.', demo: 'الخدمات الجامعية',
    faculty: 'عضو هيئة تدريس', student: 'طالبة', lab: 'موظفة المختبرات', maintenanceRole: 'موظفة الصيانة',
    transportRole: 'موظفة النقل والحركة', role: 'الحساب', switchRole: 'الحساب',
    totalRequests: 'إجمالي الطلبات', pending: 'بانتظار المراجعة', approved: 'تمت الموافقة', completed: 'مكتملة',
    recent: 'النشاط الأخير', seeAll: 'عرض الكل', quickActions: 'إجراءات سريعة', newBooking: 'احجز قاعة',
    roomRequestAction: 'تقديم طلب حجز قاعة', roomRequestForm: 'نموذج طلب حجز قاعة',
    browse: 'استعراض الموارد', roomPlanner: 'حجز القاعات', plannerIntro: 'اختر الكلية والقاعة ثم أرسل طلب الحجز.',
    roomSelection: 'اختر قاعة', filters: 'التصفية', allRooms: 'كل الأنواع', classroom: 'قاعة دراسية', hall: 'قاعة محاضرات',
    laboratory: 'مختبر', meeting: 'قاعة اجتماعات', building: 'المبنى', floor: 'الطابق', capacity: 'السعة',
    seats: 'مقاعد مضبوطة', attendees: 'الحضور', maxCapacity: 'السعة القصوى', remaining: 'المقاعد المتبقية',
    requested: 'عدد الحضور المتوقع', eventName: 'اسم المقرر أو الفعالية', eventPlaceholder: 'مثال: ورشة التفكير التصميمي',
    date: 'التاريخ', startTime: 'وقت البدء', endTime: 'وقت الانتهاء', equipment: 'التجهيزات المطلوبة', notes: 'ملاحظات إضافية',
    notesPlaceholder: 'معلومات إضافية للقسم المختص', layout: 'ترتيب المقاعد', reset: 'إعادة الترتيب',
    rows: 'الصفوف', seatsRow: 'المقاعد في الصف', classroomLayout: 'دراسي', examLayout: 'اختبار',
    uShape: 'على شكل U', workshop: 'ورشة عمل', preview: 'معاينة القاعة', door: 'الباب', screen: 'الشاشة',
    instructor: 'منصة المحاضر', walkway: 'مسار مهيأ', submit: 'إرسال طلب الحجز', unavailable: 'غير متاحة في هذا الوقت',
    available: 'متاحة', suggestions: 'بدائل مقترحة', simulated: 'اختر القاعة المناسبة والمتاحة.',
    useRoom: 'معاينة القاعة', requestSubmitted: 'تم إرسال الطلب', requestId: 'رقم طلبك',
    requestSearch: 'ابحث بالرقم أو الخدمة أو المورد', allStatuses: 'كل الحالات', submitted: 'مُرسل',
    review: 'قيد المراجعة', rejected: 'مرفوض', cancelled: 'ملغي', status: 'الحالة', request: 'الطلب',
    resource: 'المورد', owner: 'مقدم الطلب', actions: 'الإجراءات', cancel: 'إلغاء الطلب',
    confirmCancel: 'هل تريد إلغاء هذا الطلب المعلق؟', noRequests: 'لا توجد طلبات تطابق البحث.',
    catalogIntro: 'استعرض القاعات والمرافق حسب الكلية.', searchResources: 'ابحث في الموارد',
    resourceManagementTitle: 'إدارة الموارد', resourceManagementIntro: 'حدّث توفر القاعات وسعتها.',
    roomCapacity: 'سعة القاعة', resourceAvailability: 'التوفر', makeAvailable: 'تعيين كمتاحة', makeUnavailable: 'تعيين كغير متاحة',
    attachment: 'إرفاق صورة أو PDF (حتى 400 كيلوبايت)',
    viewPlan: 'معاينة مخطط القاعة', qrInfo: 'عرض معلومات رمز المورد', qrDemo: 'رمز المورد', resourceId: 'معرّف المورد',
    location: 'الموقع', maintenanceStatus: 'حالة الصيانة', good: 'لا توجد أعطال مسجلة', departmentTitle: 'مكتب خدمات الأقسام',
    departmentIntro: 'راجع الطلبات المسندة إليك وساهم في استمرار الخدمات.', incoming: 'الطلبات الواردة',
    awaitingAction: 'بانتظار الإجراء', utilization: 'استخدام الموارد', alerts: 'تنبيهات الصيانة',
    reviewRequest: 'مراجعة الطلب', approve: 'موافقة', reject: 'رفض', markComplete: 'إكمال الطلب',
    comment: 'تعليق القسم', commentPlaceholder: 'أضف تحديثاً لمقدم الطلب…', saveComment: 'حفظ التعليق',
    maintenanceTitle: 'الإبلاغ عن عطل صيانة', resourceRoom: 'معرّف القاعة أو المورد', problem: 'فئة المشكلة',
    problemType: 'اختر الفئة', electrical: 'كهرباء', furniture: 'أثاث', equipmentIssue: 'أجهزة',
    cleaning: 'نظافة', priority: 'الأولوية', normal: 'عادي', urgent: 'عاجل', description: 'وصف المشكلة',
    sendReport: 'إرسال طلب الصيانة', transportTitle: 'طلب نقل داخل الجامعة',
    pickup: 'موقع الانطلاق', destination: 'الوجهة', passengers: 'عدد الركاب', purpose: 'الغرض من الرحلة',
    requestRide: 'إرسال طلب النقل', notificationsTitle: 'التحديثات والإشعارات', markRead: 'تحديد الكل كمقروء',
    notification1: 'طلبك NU-24081 قيد المراجعة.', notification2: 'تمت الموافقة على طلب المختبر.',
    notification3: 'اكتمل طلب الصيانة NU-24052.', justNow: 'الآن', earlier: 'اليوم · ١٠:٤٢',
    search: 'بحث', profile: 'الملف الشخصي', signOut: 'تسجيل الخروج', welcome: 'مرحباً بعودتك',
    welcomeName: 'مرحباً،', profileDetails: 'البيانات الشخصية', fullName: 'الاسم الكامل', universityId: 'الرقم الجامعي / الوظيفي',
    specialization: 'التخصص', jobTitle: 'المسمى الوظيفي', mobile: 'رقم الجوال', saveProfile: 'حفظ التغييرات',
    profileSaved: 'تم حفظ بيانات الملف الشخصي.', choosePhoto: 'تحديث الصورة الشخصية', profileDepartment: 'الكلية / القسم',
    profileRole: 'الدور', emailAddress: 'البريد الإلكتروني', maintenanceDept: 'قسم الصيانة',
    transportDept: 'قسم النقل والحركة', laboratoryDept: 'قسم المختبرات',
    unauthorizedPage: 'هذه الصفحة غير متاحة لهذا الحساب.',
    roomConflict: 'القاعة غير متاحة أو محجوزة في الوقت المحدد.', capacityWarning: 'عدد الحضور يتجاوز المقاعد المضبوطة المتاحة.',
    layoutWarning: 'عدد المقاعد يتجاوز السعة المدعومة للقاعة.', selectRoom: 'اختر قاعة لمعاينتها.',
    clear: 'مسح التصفية', nextStep: 'إرسال طلب', kind: 'النوع', equipmentCount: 'تجهيزات',
    costReview: 'تقييم التكلفة', vehicleAssignment: 'مخطط المقاعد داخل الحافلة', noCost: 'يُحدد بعد مراجعة الطلب',
    estimatedCost: 'التكلفة التقديرية', vehicle: 'المركبة', driver: 'السائق', sampleOnly: 'الخدمات الجامعية',
    login: 'تسجيل الدخول إلى NavU', email: 'اسم المستخدم', password: 'كلمة المرور', loginButton: 'تسجيل الدخول',
    loginNote: 'سجّل الدخول للمتابعة إلى الخدمات الجامعية.',
    rememberMe: 'تذكرني', forgotPassword: 'نسيت كلمة المرور؟', forgotPasswordHelp: 'لاستعادة كلمة المرور، تواصل مع مسؤول حسابك الجامعي.',
    collegeForRequest: 'مكان الفعالية', eventLocation: 'مكان الفعالية', busInterior: 'مخطط المقاعد داخل الحافلة', busCapacity: 'مقاعد الركاب',
    raiseTicket: 'رفع تذكرة صيانة', noMaintenanceTickets: 'لا توجد تذاكر صيانة مرفوعة.',
    vehiclePending: 'يُخصص بعد مراجعة الطلب',
    maintenanceSummary: 'ملخص تذاكر الصيانة',
    invalidLogin: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
    footerCopyright: 'جميع الحقوق محفوظة لمطوري الموقع YHAS',
    seatsLabel: 'مقعد', requestDetails: 'تفاصيل الطلب', close: 'إغلاق', add: 'إضافة', remove: 'إزالة',
    approvalUpdated: 'تم تحديث حالة الطلب.', commentSaved: 'تم حفظ التعليق.', submittedToast: 'تمت إضافة طلبك إلى سجل المتابعة.',
    invalidSeats: 'اضبط عدد الحضور ضمن سعة القاعة قبل إرسال الطلب.',
    invalidTime: 'يجب أن يكون وقت الانتهاء بعد وقت البدء.',
    invalidAttendees: 'أدخل عدد الحضور، ويجب أن يكون شخصاً واحداً على الأقل.',
  },
}

const roleNames: Record<Role, string> = {
  faculty: 'faculty', student: 'student', lab: 'lab', maintenance: 'maintenanceRole', transport: 'transportRole',
}

const statusNames: Record<RequestStatus, string> = {
  submitted: 'submitted', review: 'review', approved: 'approved', rejected: 'rejected', completed: 'completed', cancelled: 'cancelled',
}

const pageIcons = {
  dashboard: LayoutDashboard,
  planner: LayoutGrid,
  catalog: BookOpen,
  resources: Settings2,
  requests: ClipboardList,
  department: Settings2,
  maintenance: Wrench,
  transport: Bus,
  notifications: Bell,
  profile: UserRound,
}

const pageNames: Record<Page, string> = {
  dashboard: 'dashboard', planner: 'planner', catalog: 'catalog', resources: 'resources', requests: 'requests',
  department: 'department', maintenance: 'maintenance', transport: 'transport', notifications: 'notifications', profile: 'profile',
}

const statusClass: Record<RequestStatus, string> = {
  submitted: 'status-submitted', review: 'status-review', approved: 'status-approved',
  rejected: 'status-rejected', completed: 'status-completed', cancelled: 'status-cancelled',
}

function readRememberedUsername() {
  try {
    return localStorage.getItem('navu-remembered-username') ?? ''
  } catch {
    return ''
  }
}

function App() {
  const [locale, setLocale] = useState<Locale>('ar')
  const [role, setRole] = useState<Role>('student')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [apiToken, setApiToken] = useState('')
  const [profileMobile, setProfileMobile] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [selectedCollegeId, setSelectedCollegeId] = useState<CollegeId>(readStoredCollege)
  const [signedIn, setSignedIn] = useState(false)
  const [loginEmail, setLoginEmail] = useState(readRememberedUsername)
  const [loginPassword, setLoginPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(Boolean(readRememberedUsername()))
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const [loginMessage, setLoginMessage] = useState('')
  const [page, setPage] = useState<Page>('dashboard')
  const [requests, setRequests] = useState<NavRequest[]>([])
  const [resourceRooms, setResourceRooms] = useState<Room[]>(readStoredRooms)
  const [selectedRoomId, setSelectedRoomId] = useState('C-204')
  const [roomType, setRoomType] = useState('all')
  const [layout, setLayout] = useState<Layout>('classroom')
  const [rows, setRows] = useState(4)
  const [seatsPerRow, setSeatsPerRow] = useState(9)
  const [attendees, setAttendees] = useState(28)
  const [bookingDate, setBookingDate] = useState(dateAfter(1))
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('12:00')
  const [eventName, setEventName] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['Projector'])
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [toast, setToast] = useState('')
  const [selectedResource, setSelectedResource] = useState<Room | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<NavRequest | null>(null)
  const [requestFilter, setRequestFilter] = useState('')
  const [commentText, setCommentText] = useState('')
  const [commentRequestId, setCommentRequestId] = useState('')
  const [notificationRead, setNotificationRead] = useState(false)
  const [notificationItems, setNotificationItems] = useState<AppNotification[]>([])
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [maintenanceRoom, setMaintenanceRoom] = useState('')
  const [maintenanceCategory, setMaintenanceCategory] = useState('')
  const [maintenancePriority, setMaintenancePriority] = useState('normal')
  const [maintenanceDescription, setMaintenanceDescription] = useState('')
  const [maintenanceAttachment, setMaintenanceAttachment] = useState('')
  const [maintenanceAttachmentData, setMaintenanceAttachmentData] = useState('')
  const [pickup, setPickup] = useState('')
  const [destination, setDestination] = useState('')
  const [passengers, setPassengers] = useState(12)
  const [transportPurpose, setTransportPurpose] = useState('')
  const [transportDate, setTransportDate] = useState(dateAfter(2))
  const [transportTime, setTransportTime] = useState('08:30')

  const t = (key: string) => translations[locale][key] ?? key
  const canAccess = (target: Page) => Boolean(profile?.permissions.includes(`page:${target}`))
  const selectedCollege = colleges.find((item) => item.id === selectedCollegeId) ?? colleges[0]
  const accountName = profile?.full_name ?? loginEmail.trim()
  const room = resourceRooms.find((item) => item.id === selectedRoomId && item.collegeId === selectedCollegeId)
    ?? resourceRooms.find((item) => item.collegeId === selectedCollegeId)
    ?? resourceRooms[0]
  const configuredSeats = rows * seatsPerRow
  const safeSeats = Math.min(configuredSeats, room.capacity)
  const capacityExceeded = configuredSeats > room.capacity || attendees > room.capacity
  const isRoomUnavailableAtTime = (candidate: Room) => !candidate.available || requests.some((item) => {
    if (
      item.service !== 'room' ||
      item.resource !== candidate.id ||
      item.date !== bookingDate ||
      !['submitted', 'review', 'approved'].includes(item.status)
    ) return false
    const [reservedStart, reservedEnd] = item.time.split('–')
    if (!reservedStart || !reservedEnd || !reservedStart.includes(':') || !reservedEnd.includes(':')) return false
    return timeAsMinutes(startTime) < timeAsMinutes(reservedEnd) && timeAsMinutes(endTime) > timeAsMinutes(reservedStart)
  })
  const isReserved = isRoomUnavailableAtTime(room)
  const availableRooms = resourceRooms.filter((item) =>
    item.collegeId === selectedCollegeId &&
    item.id !== room.id &&
    item.capacity >= attendees &&
    (selectedEquipment.length === 0 || selectedEquipment.every((entry) => item.equipment.includes(entry))) &&
    item.available &&
    !requests.some((request) => {
      if (request.service !== 'room' || request.resource !== item.id || request.date !== bookingDate || !['submitted', 'review', 'approved'].includes(request.status)) return false
      const [reservedStart, reservedEnd] = request.time.split('–')
      return Boolean(reservedStart && reservedEnd && reservedStart.includes(':') && reservedEnd.includes(':') &&
        timeAsMinutes(startTime) < timeAsMinutes(reservedEnd) && timeAsMinutes(endTime) > timeAsMinutes(reservedStart))
    }),
  ).sort((left, right) => Number(right.building === room.building) - Number(left.building === room.building))
  const filteredRooms = resourceRooms.filter((item) => {
    if (item.collegeId !== selectedCollegeId) return false
    const matchesType = roomType === 'all' || item.kind === roomType
    const matchesSearch = `${item.id} ${item.nameAr} ${item.nameEn} ${item.building}`.toLowerCase().includes(searchText.toLowerCase())
    return matchesType && matchesSearch
  })
  const scopedRequests = useMemo(() => requests, [requests])
  const filteredRequests = useMemo(
    () =>
      scopedRequests.filter((item) => {
        const matchesSearch = `${item.id} ${item.title} ${item.resource} ${item.owner}`.toLowerCase().includes(requestFilter.toLowerCase())
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter
        return matchesSearch && matchesStatus
      }),
    [scopedRequests, requestFilter, statusFilter],
  )
  const activeCommentRequest = scopedRequests.find((item) => item.id === commentRequestId) ?? scopedRequests[0]

  useEffect(() => {
    try {
      localStorage.setItem('navu-resources', JSON.stringify(resourceRooms))
    } catch {
      setToast(locale === 'ar' ? 'تعذر حفظ بيانات الموارد محلياً.' : 'Could not save resource changes in browser storage.')
    }
  }, [resourceRooms, locale])

  useEffect(() => {
    try {
      localStorage.setItem('navu-college', selectedCollegeId)
    } catch {
      setToast(locale === 'ar' ? 'تعذر حفظ اختيار الكلية.' : 'Could not save the selected college.')
    }
  }, [selectedCollegeId, locale])

  useEffect(() => {
    if (signedIn && !profile?.permissions.includes(`page:${page}`)) {
      setPage('dashboard')
    }
  }, [page, signedIn, profile])

  useEffect(() => {
    const storedToken = sessionStorage.getItem('navu-session-token')
    if (!storedToken) return
    setApiToken(storedToken)
    void (async () => {
      try {
        const session = await apiRequest<{ profile: UserProfile }>('/auth/session', storedToken)
        const result = await apiRequest<{ requests: NavRequest[] }>('/requests', storedToken)
        setProfile(session.profile)
        setProfileMobile(session.profile.mobile)
        setRole(session.profile.role)
        setRequests(result.requests)
        setSignedIn(true)
      } catch {
        sessionStorage.removeItem('navu-session-token')
        setApiToken('')
      }
    })()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 3600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const changeRoom = (nextRoom: Room) => {
    setSelectedCollegeId(nextRoom.collegeId)
    setSelectedRoomId(nextRoom.id)
    setRows(nextRoom.rows)
    setSeatsPerRow(nextRoom.seatsPerRow)
    setLayout('classroom')
    setSelectedEquipment((previous) => previous.filter((item) => nextRoom.equipment.includes(item)))
  }

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginMessage('')
    try {
      const result = await apiRequest<{ token: string; profile: UserProfile }>('/auth/login', '', {
        method: 'POST',
        body: JSON.stringify({ username: loginEmail.trim(), password: loginPassword }),
      })
      sessionStorage.setItem('navu-session-token', result.token)
      setApiToken(result.token)
      setProfile(result.profile)
      setProfileMobile(result.profile.mobile)
      setRole(result.profile.role)
      setLoginEmail(result.profile.username)
      setLoginPassword('')
      setRequests((await apiRequest<{ requests: NavRequest[] }>('/requests', result.token)).requests)
      try {
        if (rememberMe) localStorage.setItem('navu-remembered-username', result.profile.username)
        else localStorage.removeItem('navu-remembered-username')
      } catch {
        setToast(locale === 'ar' ? 'تعذر حفظ اسم المستخدم في هذا المتصفح.' : 'Could not remember the username in this browser.')
      }
      setSignedIn(true)
      setPage('dashboard')
    } catch (error) {
      setLoginMessage(error instanceof Error ? error.message : t('invalidLogin'))
    }
  }

  const signOut = async () => {
    try {
      if (apiToken) await apiRequest('/auth/logout', apiToken, { method: 'POST' })
    } catch (error) {
      setToast(error instanceof Error ? error.message : t('signOut'))
    } finally {
      sessionStorage.removeItem('navu-session-token')
      setApiToken('')
      setProfile(null)
      setRequests([])
      setSignedIn(false)
      setLoginPassword('')
      setPage('dashboard')
    }
  }

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProfileSaving(true)
    try {
      const result = await apiRequest<{ profile: UserProfile }>('/profile', apiToken, {
        method: 'PATCH',
        body: JSON.stringify({ mobile: profileMobile }),
      })
      setProfile(result.profile)
      setToast(t('profileSaved'))
    } catch (error) {
      setToast(error instanceof Error ? error.message : t('profile'))
    } finally {
      setProfileSaving(false)
    }
  }

  const selectProfilePhoto = (file?: File) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 400 * 1024) {
      setToast(locale === 'ar' ? 'اختر صورة JPG أو PNG أو WebP لا يتجاوز حجمها 400 كيلوبايت.' : 'Choose a JPG, PNG, or WebP image under 400 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setToast(locale === 'ar' ? 'تعذرت قراءة الصورة.' : 'Could not read the image.')
        return
      }
      void apiRequest<{ profile: UserProfile }>('/profile', apiToken, {
        method: 'PATCH',
        body: JSON.stringify({ photoData: reader.result }),
      }).then((result) => setProfile(result.profile))
        .catch((error: unknown) => setToast(error instanceof Error ? error.message : t('profile')))
    }
    reader.onerror = () => setToast(locale === 'ar' ? 'تعذرت قراءة الصورة.' : 'Could not read the image.')
    reader.readAsDataURL(file)
  }

  const changeCollege = (collegeId: CollegeId) => {
    setSelectedCollegeId(collegeId)
    const firstRoom = resourceRooms.find((item) => item.collegeId === collegeId)
    if (firstRoom) {
      setSelectedRoomId(firstRoom.id)
      setRows(firstRoom.rows)
      setSeatsPerRow(firstRoom.seatsPerRow)
      setLayout('classroom')
      setSelectedEquipment([])
    }
    setSearchText('')
    setRoomType('all')
    setRequestFilter('')
    setStatusFilter('all')
  }

  const updateRoom = (id: string, changes: Partial<Room>) => {
    setResourceRooms((previous) => previous.map((item) => item.id === id ? { ...item, ...changes } : item))
  }

  const createRequestId = () => `NU-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`

  const addRequest = async (request: NavRequest) => {
    try {
      const result = await apiRequest<{ request: NavRequest }>('/requests', apiToken, {
        method: 'POST',
        body: JSON.stringify(request),
      })
      setRequests((previous) => [result.request, ...previous])
      setNotificationItems((previous) => [{ id: result.request.id, text: `${result.request.id}: ${t('submitted')}`, timeKey: 'justNow', tone: 'notification-blue' }, ...previous])
      setNotificationRead(false)
      setToast(`${t('submittedToast')} ${t('requestId')}: ${result.request.id}`)
      setPage('requests')
    } catch (error) {
      setToast(error instanceof Error ? error.message : t('noRequests'))
    }
  }

  const submitBooking = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!eventName.trim() || isReserved || capacityExceeded || attendees > safeSeats || attendees < 1 || timeAsMinutes(endTime) <= timeAsMinutes(startTime)) {
      if (capacityExceeded || attendees > safeSeats) setToast(t('invalidSeats'))
      else if (attendees < 1) setToast(t('invalidAttendees'))
      else if (timeAsMinutes(endTime) <= timeAsMinutes(startTime)) setToast(t('invalidTime'))
      return
    }
    addRequest({
      id: createRequestId(),
      collegeId: selectedCollegeId,
      service: room.kind === 'laboratory' ? 'laboratory' : 'room',
      title: eventName.trim(),
      resource: room.id,
      date: bookingDate,
      time: `${startTime}–${endTime}`,
      attendees,
      status: 'submitted',
      owner: accountName,
      department: room.kind === 'laboratory' ? 'Laboratories' : 'Facilities',
      notes: bookingNotes.trim() || undefined,
    })
    setBookingNotes('')
  }

  const submitMaintenance = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!maintenanceRoom.trim() || !maintenanceCategory || !maintenanceDescription.trim()) return
    addRequest({
      id: createRequestId(),
      collegeId: selectedCollegeId,
      service: 'maintenance',
      title: `${maintenanceCategory}: ${maintenanceDescription.trim()}`,
      resource: maintenanceRoom.trim(),
      date: dateAfter(0),
      time: maintenancePriority === 'urgent' ? 'Urgent' : 'Standard',
      attendees: 0,
      status: 'submitted',
      owner: accountName,
      department: 'Maintenance',
      ...(maintenanceAttachment ? { attachmentName: maintenanceAttachment, attachmentData: maintenanceAttachmentData } : {}),
    })
    setMaintenanceRoom('')
    setMaintenanceCategory('')
    setMaintenanceDescription('')
    setMaintenanceAttachment('')
    setMaintenanceAttachmentData('')
    setMaintenancePriority('normal')
  }

  const selectMaintenanceAttachment = (file?: File) => {
    setMaintenanceAttachment('')
    setMaintenanceAttachmentData('')
    if (!file) return
    if (file.size > 400 * 1024 || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setToast(locale === 'ar'
        ? 'اختر صورة أو ملف PDF لا يتجاوز حجمه 400 كيلوبايت.'
        : 'Choose an image or PDF no larger than 400 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setToast(locale === 'ar' ? 'تعذرت قراءة الملف المرفق.' : 'Could not read the selected file.')
        return
      }
      setMaintenanceAttachment(file.name)
      setMaintenanceAttachmentData(reader.result)
    }
    reader.onerror = () => setToast(locale === 'ar' ? 'تعذرت قراءة الملف المرفق.' : 'Could not read the selected file.')
    reader.readAsDataURL(file)
  }

  const submitTransport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!pickup.trim() || !destination.trim() || !transportPurpose.trim() || passengers < 1) return
    addRequest({
      id: createRequestId(),
      collegeId: selectedCollegeId,
      service: 'transport',
      title: transportPurpose.trim(),
      resource: `${pickup.trim()} → ${destination.trim()}`,
      date: transportDate,
      time: transportTime,
      attendees: passengers,
      status: 'submitted',
      owner: accountName,
      department: 'Transportation',
    })
    setPickup('')
    setDestination('')
    setTransportPurpose('')
  }

  const updateStatus = async (id: string, status: RequestStatus) => {
    try {
      const result = await apiRequest<{ request: NavRequest }>(`/requests/${encodeURIComponent(id)}`, apiToken, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setRequests((previous) => previous.map((item) => item.id === id ? result.request : item))
      setSelectedRequest((previous) => previous?.id === id ? result.request : previous)
      setNotificationItems((previous) => [{ id: `${id}-${status}`, text: `${id}: ${t(statusNames[status])}`, timeKey: 'justNow', tone: status === 'approved' || status === 'completed' ? 'notification-green' : 'notification-orange' }, ...previous])
      setNotificationRead(false)
      setToast(t('approvalUpdated'))
    } catch (error) {
      setToast(error instanceof Error ? error.message : t('approvalUpdated'))
    }
  }

  const saveComment = async () => {
    if (!commentText.trim()) return
    const targetId = activeCommentRequest?.id
    if (!targetId) return
    const comment = commentText.trim()
    try {
      const result = await apiRequest<{ request: NavRequest }>(`/requests/${encodeURIComponent(targetId)}`, apiToken, {
        method: 'PATCH',
        body: JSON.stringify({ comment }),
      })
      setRequests((previous) => previous.map((item) => item.id === targetId ? result.request : item))
      setSelectedRequest((previous) => previous?.id === targetId ? result.request : previous)
      setToast(t('commentSaved'))
      setCommentText('')
    } catch (error) {
      setToast(error instanceof Error ? error.message : t('commentSaved'))
    }
  }

  const navItems = (Object.keys(pageNames) as Page[])
    .filter((key) => canAccess(key))
    .map((key) => ({
      key,
      label: t(pageNames[key]),
      icon: pageIcons[key],
      group: ['dashboard', 'planner', 'catalog', 'requests'].includes(key) ? 'main' : 'services',
    }))

  const seatItems = useMemo(() => {
    const total = Math.min(safeSeats, 120)
    return Array.from({ length: total }, (_, index) => index)
  }, [safeSeats])

  const renderStatus = (status: RequestStatus) => (
    <span className={`status-pill ${statusClass[status]}`}>
      <span className="status-dot" />
      {t(statusNames[status])}
    </span>
  )

  const Metric = ({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: typeof Activity; tone: string }) => (
    <div className="metric-card">
      <span className={`metric-icon ${tone}`}><Icon size={19} /></span>
      <div><span className="metric-label">{label}</span><strong>{value}</strong></div>
    </div>
  )

  const RoomCard = ({ item, selected = false }: { item: Room; selected?: boolean }) => {
    const booked = isRoomUnavailableAtTime(item)
    return (
      <button type="button" className={`room-card ${selected ? 'room-card-selected' : ''}`} onClick={() => changeRoom(item)}>
        <div className="room-card-top">
          <span className="room-kind-icon"><LayoutGrid size={17} /></span>
          <span className={`room-availability ${booked || !item.available ? 'room-unavailable' : ''}`}><span />{booked || !item.available ? t('unavailable') : t('available')}</span>
        </div>
        <strong>{locale === 'ar' ? item.nameAr : item.nameEn}</strong>
        <span className="room-id">{item.id} <span>·</span> {item.building} · {t('floor')} {item.floor}</span>
        <div className="room-card-bottom"><span><Users size={14} /> {item.capacity} {t('seatsLabel')}</span><span>{item.equipment.length} {t('equipmentCount')}</span></div>
      </button>
    )
  }

  const requestTable = (departmentMode = false) => {
    const visibleRequests = departmentMode
      ? filteredRequests.filter((item) => profile?.permissions.includes(`request:read:${item.service}`))
      : filteredRequests
    return (
      <div className="table-wrap">
      <table className="request-table">
        <thead><tr>
          <th>{t('request')}</th><th>{t('resource')}</th><th>{t('date')}</th>
          {departmentMode && <th>{t('owner')}</th>}<th>{t('status')}</th><th>{t('actions')}</th>
        </tr></thead>
        <tbody>
          {visibleRequests.length ? visibleRequests.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.title}</strong><small>{item.id} · {colleges.find((college) => college.id === item.collegeId)?.[locale === 'ar' ? 'nameAr' : 'nameEn']}</small></td>
              <td>{item.resource}<small>{item.time} · {item.attendees ? `${item.attendees} ${t('attendees')}` : item.service}</small></td>
              <td>{item.date}</td>
              {departmentMode && <td>{item.owner}</td>}
              <td>{renderStatus(item.status)}</td>
              <td>
                <div className="table-actions">
                  <button className="icon-button" title={t('requestDetails')} onClick={() => setSelectedRequest(item)}><ClipboardList size={15} /></button>
                  {departmentMode && profile?.permissions.includes(`request:update:${item.service}`) && ['submitted', 'review'].includes(item.status) && <>
                    <button className="icon-button action-approve" title={t('approve')} onClick={() => updateStatus(item.id, 'approved')}><Check size={15} /></button>
                    <button className="icon-button action-reject" title={t('reject')} onClick={() => updateStatus(item.id, 'rejected')}><X size={15} /></button>
                  </>}
                  {departmentMode && profile?.permissions.includes(`request:update:${item.service}`) && item.status === 'approved' && <button className="button button-quiet" onClick={() => updateStatus(item.id, 'completed')}>{t('markComplete')}</button>}
                  {!departmentMode && profile?.permissions.includes('request:cancel:own') && item.owner === profile.full_name && ['submitted', 'review'].includes(item.status) && <button className="icon-button action-reject" title={t('cancel')} onClick={() => { if (window.confirm(t('confirmCancel'))) updateStatus(item.id, 'cancelled') }}><X size={15} /></button>}
                </div>
              </td>
            </tr>
          )) : <tr><td colSpan={departmentMode ? 6 : 5} className="empty-cell">{t('noRequests')}</td></tr>}
        </tbody>
      </table>
      </div>
    )
  }

  const dashboard = (
    <>
      <section className="welcome-card">
        <div className="welcome-copy">
          <span className="eyebrow"><Sparkles size={14} /> {t('eventLocation')}: {locale === 'ar' ? selectedCollege.nameAr : selectedCollege.nameEn}</span>
          <h1>{t('welcomeName')} {profile?.full_name}</h1>
          <p>{t('overview')}</p>
          <div className="welcome-actions">
            {canAccess('planner') && <button className="button button-primary" onClick={() => setPage('planner')}><Plus size={17} /> {t('newBooking')}</button>}
            {canAccess('catalog') && <button className="button button-light" onClick={() => setPage('catalog')}>{t('browse')} <ArrowDownLeft size={16} /></button>}
          </div>
        </div>
        <div className="welcome-illustration" aria-hidden="true">
          <div className="illus-sun" /><div className="illus-building"><span /><span /><span /><span /><span /><span /></div>
          <div className="illus-tree tree-one" /><div className="illus-tree tree-two" />
          <div className="illus-path" />          <div className="illus-label"><span className="live-dot" /> {t('campusOnline')}</div>
        </div>
      </section>
      <section className="metric-grid">
        <Metric label={t('totalRequests')} value={scopedRequests.length} icon={ClipboardList} tone="metric-purple" />
        <Metric label={t('pending')} value={scopedRequests.filter((item) => ['submitted', 'review'].includes(item.status)).length} icon={Clock3} tone="metric-amber" />
        <Metric label={t('approved')} value={scopedRequests.filter((item) => item.status === 'approved').length} icon={CheckCircle2} tone="metric-green" />
        <Metric label={t('completed')} value={scopedRequests.filter((item) => item.status === 'completed').length} icon={Activity} tone="metric-blue" />
      </section>
      <div className="content-grid dashboard-grid">
        <section className="panel recent-panel">
          <div className="section-heading"><div><span className="eyebrow">{t('recent')}</span><h2>{t('requests')}</h2></div><button className="text-button" onClick={() => setPage('requests')}>{t('seeAll')} <ChevronLeft size={16} /></button></div>
          {requestTable()}
        </section>
        <section className="panel quick-panel">
          <div className="section-heading"><div><span className="eyebrow">{t('shortcuts')}</span><h2>{t('quickActions')}</h2></div><span className="heading-icon"><Sparkles size={17} /></span></div>
          <div className="quick-action-list">
            {canAccess('planner') && <button onClick={() => setPage('planner')}><span className="quick-icon quick-indigo"><LayoutGrid size={18} /></span><span><strong>{t('roomPlanner')}</strong><small>{t('nextStep')}</small></span><ChevronLeft size={16} /></button>}
            {canAccess('maintenance') && <button onClick={() => setPage('maintenance')}><span className="quick-icon quick-orange"><Wrench size={18} /></span><span><strong>{t('maintenance')}</strong><small>{t('sendReport')}</small></span><ChevronLeft size={16} /></button>}
            {canAccess('transport') && <button onClick={() => setPage('transport')}><span className="quick-icon quick-blue"><Bus size={18} /></span><span><strong>{t('transport')}</strong><small>{t('requestRide')}</small></span><ChevronLeft size={16} /></button>}
          </div>
        </section>
      </div>
    </>
  )

  const planner = (
    <div className="page-stack">
      <div className="page-intro"><div><span className="eyebrow"><Sparkles size={14} /> {t('college')}</span><h1>{t('roomPlanner')}</h1><p>{t('plannerIntro')}</p></div><div className="planner-intro-actions"><button className="button button-primary" onClick={() => document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}><Plus size={16} /> {t('roomRequestAction')}</button><div className="intro-icon"><LayoutGrid size={24} /></div></div></div>
      <div className="planner-layout">
        <div className="planner-main">
          <section className="panel room-picker">
            <div className="section-heading"><div><span className="eyebrow">{t('step')} 01</span><h2>{t('roomSelection')}</h2></div><span className="panel-count">{rooms.length} {t('resource')}</span></div>
            <div className="filter-row">
              <label className="search-box"><Search size={16} /><input placeholder={t('searchResources')} value={searchText} onChange={(event) => setSearchText(event.target.value)} /></label>
              <select className="select-control" value={roomType} onChange={(event) => setRoomType(event.target.value)}>
                <option value="all">{t('allRooms')}</option>
                <option value="classroom">{t('classroom')}</option><option value="hall">{t('hall')}</option>
                <option value="laboratory">{t('laboratory')}</option><option value="meeting">{t('meeting')}</option>
              </select>
            </div>
            <div className="room-card-grid">{filteredRooms.map((item) => <RoomCard key={item.id} item={item} selected={item.id === room.id} />)}</div>
          </section>
          <section className="panel plan-panel">
            <div className="section-heading"><div><span className="eyebrow">{t('step')} 02 · {room.id}</span><h2>{t('preview')}: {locale === 'ar' ? room.nameAr : room.nameEn}</h2></div><button className="button button-quiet" onClick={() => { setRows(room.rows); setSeatsPerRow(room.seatsPerRow); setLayout('classroom') }}><Settings2 size={15} /> {t('reset')}</button></div>
            <div className="plan-toolbar">
              <div className="layout-switcher">
                {(['classroom', 'exam', 'u-shape', 'workshop'] as Layout[]).map((item) => <button key={item} className={layout === item ? 'layout-active' : ''} onClick={() => setLayout(item)}>{t(item === 'classroom' ? 'classroomLayout' : item === 'exam' ? 'examLayout' : item === 'u-shape' ? 'uShape' : 'workshop')}</button>)}
              </div>
              <span className="dimension-tag">8.4 × 6.2 m</span>
            </div>
            <div className={`floor-plan floor-${layout}`}>
              <span className="window-line window-top" /><span className="window-line window-left" />
              <div className="screen-area"><Monitor size={14} /> {t('screen')}</div>
              <div className="instructor-desk"><span />{t('instructor')}</div>
              <div className={`seat-grid seat-grid-${layout}`} style={{ '--seat-columns': Math.max(1, Math.min(seatsPerRow, 12)) } as CSSProperties}>
                {seatItems.map((seat) => <span className="seat-unit" key={seat}><span className="seat-back" /><span className="seat-desk" /></span>)}
              </div>
              <div className="walkway-label"><span />{t('walkway')}</div>
              <div className="door-label"><DoorOpen size={13} /> {t('door')}</div>
              <span className="plan-north">N</span>
            </div>
            <div className="plan-legend"><span><i className="legend-desk" /> {t('seatsLabel')}</span><span><i className="legend-screen" /> {t('screen')}</span><span><i className="legend-walk" /> {t('walkway')}</span><span>{room.building} · {t('floor')} {room.floor}</span></div>
          </section>
        </div>
        <aside className="planner-aside">
          <section className="panel capacity-panel">
            <div className="section-heading"><div><span className="eyebrow">{t('capacity')}</span><h2>{t('seats')}</h2></div><span className="capacity-icon"><Users size={17} /></span></div>
            <div className="capacity-figures"><strong>{safeSeats}</strong><span>/ {room.capacity} {t('seatsLabel')}</span></div>
            <div className="capacity-progress"><span style={{ width: `${Math.min(100, (safeSeats / room.capacity) * 100)}%` }} /></div>
            <div className="capacity-stats"><span>{t('requested')}<strong>{attendees}</strong></span><span>{t('remaining')}<strong>{Math.max(0, safeSeats - attendees)}</strong></span></div>
            {(capacityExceeded || attendees > safeSeats) && <div className="inline-warning"><AlertCircle size={15} />{t(configuredSeats > room.capacity ? 'layoutWarning' : 'capacityWarning')}</div>}
            {attendees < 1 && <div className="inline-warning"><AlertCircle size={15} />{t('invalidAttendees')}</div>}
            <div className="adjust-group"><span>{t('rows')}</span><div><button className="icon-button" disabled={rows <= 1} onClick={() => setRows((value) => Math.max(1, value - 1))}><Minus size={14} /></button><strong>{rows}</strong><button className="icon-button" disabled={(rows + 1) * seatsPerRow > room.capacity} onClick={() => setRows((value) => Math.min(room.capacity, value + 1))}><Plus size={14} /></button></div></div>
            <div className="adjust-group"><span>{t('seatsRow')}</span><div><button className="icon-button" disabled={seatsPerRow <= 1} onClick={() => setSeatsPerRow((value) => Math.max(1, value - 1))}><Minus size={14} /></button><strong>{seatsPerRow}</strong><button className="icon-button" disabled={rows * (seatsPerRow + 1) > room.capacity} onClick={() => setSeatsPerRow((value) => Math.min(room.capacity, value + 1))}><Plus size={14} /></button></div></div>
            <label className="field-label attendees-field">{t('attendees')}<input type="number" min="1" max={room.capacity} value={attendees} onChange={(event) => setAttendees(Number(event.target.value))} /></label>
          </section>
          <form id="booking-form" className="panel booking-form" onSubmit={submitBooking}>
            <div className="section-heading"><div><span className="eyebrow">{t('step')} 03</span><h2>{t('roomRequestForm')}</h2></div><CalendarDays size={18} className="muted-icon" /></div>
            <label className="field-label">{t('collegeForRequest')}<select value={selectedCollegeId} onChange={(event) => changeCollege(event.target.value as CollegeId)}>{colleges.map((college) => <option key={college.id} value={college.id}>{locale === 'ar' ? college.nameAr : college.nameEn}</option>)}</select></label>
            <label className="field-label">{t('eventName')}<input required value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder={t('eventPlaceholder')} /></label>
            <label className="field-label">{t('date')}<input required type="date" min={dateAfter(0)} value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} /></label>
            <div className="form-grid-two"><label className="field-label">{t('startTime')}<input type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label><label className="field-label">{t('endTime')}<input type="time" required min={startTime} value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label></div>
            <div className="field-label">{t('equipment')}<div className="equipment-options">{room.equipment.map((item) => <label key={item} className={`equipment-chip ${selectedEquipment.includes(item) ? 'equipment-selected' : ''}`}><input type="checkbox" checked={selectedEquipment.includes(item)} onChange={(event) => setSelectedEquipment((previous) => event.target.checked ? [...previous, item] : previous.filter((entry) => entry !== item))} />{item}</label>)}</div></div>
            <label className="field-label">{t('notes')}<textarea rows={2} value={bookingNotes} onChange={(event) => setBookingNotes(event.target.value)} placeholder={t('notesPlaceholder')} /></label>
            {isReserved && <div className="inline-warning"><AlertCircle size={15} />{t('roomConflict')}</div>}
            <button className="button button-primary submit-booking" disabled={isReserved || capacityExceeded || attendees > safeSeats || attendees < 1}><CheckCircle2 size={16} /> {t('submit')}</button>
          </form>
        </aside>
      </div>
      {isReserved && <section className="panel alternatives-panel"><div className="alternative-copy"><span className="recommendation-icon"><Sparkles size={17} /></span><div><h2>{t('suggestions')}</h2><p>{t('simulated')}</p></div></div><div className="alternative-cards">{availableRooms.slice(0, 3).map((item) => <button key={item.id} onClick={() => changeRoom(item)}><strong>{locale === 'ar' ? item.nameAr : item.nameEn}</strong><span>{item.id} · {item.capacity} {t('seatsLabel')}</span><ChevronLeft size={15} /></button>)}</div></section>}
    </div>
  )

  const catalog = (
    <div className="page-stack">
      <div className="page-intro"><div><span className="eyebrow">{t('college')}</span><h1>{t('catalog')}</h1><p>{t('catalogIntro')}</p></div><div className="intro-icon"><BookOpen size={23} /></div></div>
      <section className="panel">
        <div className="filter-row"><label className="search-box"><Search size={16} /><input placeholder={t('searchResources')} value={searchText} onChange={(event) => setSearchText(event.target.value)} /></label><select className="select-control" value={roomType} onChange={(event) => setRoomType(event.target.value)}><option value="all">{t('allRooms')}</option><option value="classroom">{t('classroom')}</option><option value="hall">{t('hall')}</option><option value="laboratory">{t('laboratory')}</option><option value="meeting">{t('meeting')}</option></select></div>
        <div className="catalog-grid">{filteredRooms.map((item) => { const unavailable = isRoomUnavailableAtTime(item); return <article className="catalog-card" key={item.id}><div className="catalog-card-visual"><span className="catalog-visual-icon"><LayoutGrid size={24} /></span><span className={`room-availability ${unavailable ? 'room-unavailable' : ''}`}><span />{unavailable ? t('unavailable') : t('available')}</span><span className="catalog-room-id">{item.id}</span></div><div className="catalog-card-body"><h2>{locale === 'ar' ? item.nameAr : item.nameEn}</h2><p>{locale === 'ar' ? colleges.find((college) => college.id === item.collegeId)?.nameAr : colleges.find((college) => college.id === item.collegeId)?.nameEn} · {item.building} · {t('floor')} {item.floor}</p><div className="catalog-specs"><span><Users size={15} /> {item.capacity} {t('seatsLabel')}</span><span><Monitor size={15} /> {item.equipment.length} {t('equipmentCount')}</span></div><div className="equipment-tags">{item.equipment.map((entry) => <span key={entry}>{entry}</span>)}</div><div className="catalog-actions"><button className="button button-primary" onClick={() => { changeRoom(item); setPage('planner') }}>{t('viewPlan')}</button><button className="button button-quiet" onClick={() => setSelectedResource(item)}><QrCode size={15} /> {t('qrDemo')}</button></div></div></article> })}</div>
      </section>
    </div>
  )

  const resourceManagement = (
    <div className="page-stack">
      <div className="page-intro"><div><span className="eyebrow"><ShieldCheck size={14} /> {t('college')}</span><h1>{t('resourceManagementTitle')}</h1><p>{t('resourceManagementIntro')}</p></div><div className="intro-icon"><Settings2 size={23} /></div></div>
      <section className="panel managed-resources">
        <div className="section-heading"><div><span className="eyebrow">{t('resource')}</span><h2>{resourceRooms.length} {t('resourceManagementTitle')}</h2></div><span className="panel-count">{t('demo')}</span></div>
        {resourceRooms.filter((item) => item.collegeId === selectedCollegeId).map((item) => (
          <div className="managed-resource-row" key={item.id}>
            <div className="managed-resource-title"><span className="room-kind-icon"><LayoutGrid size={17} /></span><span><strong>{locale === 'ar' ? item.nameAr : item.nameEn}</strong><small>{item.id} · {item.building} · {t('floor')} {item.floor}</small></span></div>
            <label className="field-label managed-capacity">{t('roomCapacity')}<input aria-label={`${t('roomCapacity')} ${item.id}`} type="number" min="1" max="300" value={item.capacity} onChange={(event) => { const capacity = Number(event.target.value); if (capacity >= 1 && capacity <= 300) updateRoom(item.id, { capacity }) }} /></label>
            <button className={`button ${item.available ? 'button-available' : 'button-unavailable'}`} onClick={() => updateRoom(item.id, { available: !item.available })}><span className="live-dot" />{item.available ? t('makeUnavailable') : t('makeAvailable')}</button>
            <button className="icon-button" title={t('qrDemo')} onClick={() => setSelectedResource(item)}><QrCode size={16} /></button>
          </div>
        ))}
      </section>
    </div>
  )

  const requestsPage = (
    <div className="page-stack">
      <div className="page-intro"><div><span className="eyebrow">{t('college')}</span><h1>{t('requests')}</h1><p>{t('requestDetails')} · {scopedRequests.length} {t('totalRequests')}</p></div><div className="intro-icon"><ClipboardList size={23} /></div></div>
      <section className="panel">
        <div className="filter-row"><label className="search-box"><Search size={16} /><input placeholder={t('requestSearch')} value={requestFilter} onChange={(event) => setRequestFilter(event.target.value)} /></label><select className="select-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{t('allStatuses')}</option>{(Object.keys(statusNames) as RequestStatus[]).map((status) => <option key={status} value={status}>{t(statusNames[status])}</option>)}</select></div>
        {requestTable()}
      </section>
      <section className="panel timeline-panel"><div className="section-heading"><div><span className="eyebrow">{t('recent')}</span><h2>{t('notificationsTitle')}</h2></div><span className="heading-icon"><Activity size={17} /></span></div><div className="timeline">{notificationItems.slice(0, 3).map((item) => <div key={item.id}><span className={`timeline-mark ${item.tone === 'notification-green' ? 'timeline-green' : 'timeline-blue'}`}><ClipboardList size={13} /></span><strong>{item.messageKey ? t(item.messageKey) : item.text}</strong><small>{t(item.timeKey)}</small></div>)}</div></section>
    </div>
  )

  const department = (
    <div className="page-stack">
      <div className="page-intro"><div><span className="eyebrow"><ShieldCheck size={14} /> {t('services')}</span><h1>{t('departmentTitle')}</h1><p>{t('departmentIntro')}</p></div><div className="intro-icon"><Settings2 size={23} /></div></div>
      <div className="metric-grid department-metrics"><Metric label={t('incoming')} value={scopedRequests.filter((item) => ['submitted', 'review'].includes(item.status)).length} icon={ClipboardList} tone="metric-purple" /><Metric label={t('awaitingAction')} value={scopedRequests.filter((item) => item.status === 'submitted').length} icon={Clock3} tone="metric-amber" /><Metric label={t('utilization')} value={new Set(scopedRequests.filter((item) => item.service === 'room' && item.status === 'approved').map((item) => item.resource)).size} icon={Activity} tone="metric-green" /><Metric label={t('alerts')} value={scopedRequests.filter((item) => item.service === 'maintenance' && ['submitted', 'review'].includes(item.status)).length} icon={AlertCircle} tone="metric-blue" /></div>
      <section className="panel"><div className="section-heading"><div><span className="eyebrow">{t('incoming')}</span><h2>{t('reviewRequest')}</h2></div><span className="panel-count">{t(roleNames[role])}</span></div><div className="filter-row"><label className="search-box"><Search size={16} /><input placeholder={t('requestSearch')} value={requestFilter} onChange={(event) => setRequestFilter(event.target.value)} /></label><select className="select-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{t('allStatuses')}</option>{(Object.keys(statusNames) as RequestStatus[]).map((status) => <option key={status} value={status}>{t(statusNames[status])}</option>)}</select></div>{requestTable(true)}</section>
      <section className="panel comment-panel"><div className="section-heading"><div><span className="eyebrow">{t('requestDetails')}</span><h2>{t('comment')}</h2></div><span className="heading-icon"><LifeBuoy size={17} /></span></div><label className="field-label">{t('request')}<select value={activeCommentRequest?.id ?? ''} onChange={(event) => setCommentRequestId(event.target.value)} disabled={!scopedRequests.length}>{scopedRequests.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}</select></label><label className="field-label"><textarea rows={3} value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder={t('commentPlaceholder')} /></label><button className="button button-primary" onClick={saveComment} disabled={!scopedRequests.length || !commentText.trim()}>{t('saveComment')}</button></section>
      {role === 'transport' && <section className="panel cost-panel"><div><h2>{t('vehicleAssignment')}</h2><p>{t('vehicle')}: <strong>{t('vehiclePending')}</strong></p></div><Bus size={22} /></section>}
    </div>
  )

  const maintenance = (
    <div className="page-stack">
      <div className="page-intro"><div><span className="eyebrow">{t('college')}</span><h1>{t('raiseTicket')}</h1><p>{t('maintenanceTitle')}</p></div><div className="intro-icon intro-orange"><Wrench size={23} /></div></div>
      <div className="service-layout">
        {profile?.permissions.includes('request:create:maintenance') ? <form className="panel service-form" onSubmit={submitMaintenance}>
          <div className="section-heading"><div><span className="eyebrow">{selectedCollege.nameAr}</span><h2>{t('raiseTicket')}</h2></div><Wrench className="muted-icon" size={18} /></div>
          <label className="field-label">{t('collegeForRequest')}<select value={selectedCollegeId} onChange={(event) => changeCollege(event.target.value as CollegeId)}>{colleges.map((college) => <option key={college.id} value={college.id}>{locale === 'ar' ? college.nameAr : college.nameEn}</option>)}</select></label>
          <label className="field-label">{t('resourceRoom')}<input required value={maintenanceRoom} onChange={(event) => setMaintenanceRoom(event.target.value)} placeholder={locale === 'ar' ? 'رقم القاعة أو المرفق' : 'Room or facility ID'} /></label>
          <div className="form-grid-two">
            <label className="field-label">{t('problem')}<select required value={maintenanceCategory} onChange={(event) => setMaintenanceCategory(event.target.value)}><option value="">{t('problemType')}</option><option>{t('electrical')}</option><option>{t('furniture')}</option><option>{t('equipmentIssue')}</option><option>{t('cleaning')}</option></select></label>
            <label className="field-label">{t('priority')}<select value={maintenancePriority} onChange={(event) => setMaintenancePriority(event.target.value)}><option value="normal">{t('normal')}</option><option value="urgent">{t('urgent')}</option></select></label>
          </div>
          <label className="field-label">{t('description')}<textarea rows={4} required value={maintenanceDescription} onChange={(event) => setMaintenanceDescription(event.target.value)} placeholder={t('commentPlaceholder')} /></label>
          <label className="field-label">{t('attachment')}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => selectMaintenanceAttachment(event.target.files?.[0])} />{maintenanceAttachment && <small>{maintenanceAttachment}</small>}</label>
          <button className="button button-primary" type="submit"><Plus size={16} /> {t('raiseTicket')}</button>
        </form> : <section className="panel service-form"><div className="section-heading"><div><span className="eyebrow">{t('department')}</span><h2>{t('maintenanceSummary')}</h2></div><Wrench className="muted-icon" size={18} /></div>{requestTable(true)}</section>}
        <section className="panel service-side">
          <span className="service-side-icon"><Wrench size={20} /></span>
          <h2>{t('maintenanceSummary')}</h2>
          <p>{t('collegeForRequest')}: {locale === 'ar' ? selectedCollege.nameAr : selectedCollege.nameEn}</p>
          <div className="maintenance-summary-counts">
            <span><strong>{scopedRequests.filter((item) => item.service === 'maintenance' && ['submitted', 'review'].includes(item.status)).length}</strong>{t('pending')}</span>
            <span><strong>{scopedRequests.filter((item) => item.service === 'maintenance' && item.status === 'completed').length}</strong>{t('completed')}</span>
          </div>
          {scopedRequests.filter((item) => item.service === 'maintenance').length
            ? scopedRequests.filter((item) => item.service === 'maintenance').slice(0, 4).map((item) => <div className="service-status-row" key={item.id}><span>{item.id} · {item.resource}</span>{renderStatus(item.status)}</div>)
            : <p className="empty-service">{t('noMaintenanceTickets')}</p>}
        </section>
      </div>
    </div>
  )

  const transportPage = (
    <div className="page-stack">
      <div className="page-intro"><div><span className="eyebrow">{t('college')}</span><h1>{t('transport')}</h1><p>{t('transportTitle')}</p></div><div className="intro-icon intro-blue"><Bus size={23} /></div></div>
      <div className="service-layout">
        {profile?.permissions.includes('request:create:transport') ? <form className="panel service-form" onSubmit={submitTransport}>
          <div className="section-heading"><div><span className="eyebrow">{locale === 'ar' ? selectedCollege.nameAr : selectedCollege.nameEn}</span><h2>{t('transportTitle')}</h2></div><Bus className="muted-icon" size={18} /></div>
          <label className="field-label">{t('collegeForRequest')}<select value={selectedCollegeId} onChange={(event) => changeCollege(event.target.value as CollegeId)}>{colleges.map((college) => <option key={college.id} value={college.id}>{locale === 'ar' ? college.nameAr : college.nameEn}</option>)}</select></label>
          <div className="form-grid-two"><label className="field-label">{t('pickup')}<input required value={pickup} onChange={(event) => setPickup(event.target.value)} placeholder={locale === 'ar' ? 'موقع الانطلاق' : 'Pickup location'} /></label><label className="field-label">{t('destination')}<input required value={destination} onChange={(event) => setDestination(event.target.value)} placeholder={locale === 'ar' ? 'الوجهة' : 'Destination'} /></label></div>
          <div className="form-grid-two"><label className="field-label">{t('date')}<input type="date" min={dateAfter(0)} required value={transportDate} onChange={(event) => setTransportDate(event.target.value)} /></label><label className="field-label">{t('startTime')}<input type="time" required value={transportTime} onChange={(event) => setTransportTime(event.target.value)} /></label></div>
          <div className="form-grid-two"><label className="field-label">{t('passengers')}<input type="number" min="1" max="32" required value={passengers} onChange={(event) => setPassengers(Math.min(32, Number(event.target.value)))} /></label><label className="field-label">{t('purpose')}<input required value={transportPurpose} onChange={(event) => setTransportPurpose(event.target.value)} placeholder={t('eventPlaceholder')} /></label></div>
          <button className="button button-primary" type="submit"><Plus size={16} /> {t('requestRide')}</button>
        </form> : <section className="panel service-form"><div className="section-heading"><div><span className="eyebrow">{t('department')}</span><h2>{t('transport')}</h2></div><Bus className="muted-icon" size={18} /></div>{requestTable(true)}</section>}
        <section className="panel service-side transport-info">
          <span className="service-side-icon service-side-blue"><Bus size={20} /></span>
          <h2>{t('busInterior')}</h2>
          <div className="bus-cabin" aria-label={t('busInterior')}>
            <span className="bus-driver-seat" />
            <div className="bus-seat-columns">{Array.from({ length: 8 }, (_, index) => <span className="bus-seat-row" key={index}><i /><i /></span>)}</div>
            <span className="bus-aisle" />
            <div className="bus-seat-columns">{Array.from({ length: 8 }, (_, index) => <span className="bus-seat-row" key={index}><i /><i /></span>)}</div>
          </div>
          <div className="service-details">
            <p><span>{t('college')}</span><strong>{locale === 'ar' ? selectedCollege.nameAr : selectedCollege.nameEn}</strong></p>
            <p><span>{t('busCapacity')}</span><strong>32</strong></p>
            <p><span>{t('vehicle')}</span><strong>{t('vehiclePending')}</strong></p>
          </div>
        </section>
      </div>
    </div>
  )

  const notificationsPage = (
    <div className="page-stack">
      <div className="page-intro"><div><span className="eyebrow">{t('college')}</span><h1>{t('notificationsTitle')}</h1><p>{t('notifications')}</p></div><div className="intro-icon"><Bell size={23} /></div></div>
      <section className="panel notifications-panel"><div className="section-heading"><div><span className="eyebrow">NavU</span><h2>{t('recent')}</h2></div><button className="text-button" onClick={() => setNotificationRead(true)} disabled={!notificationItems.length}>{t('markRead')} <Check size={15} /></button></div>{notificationItems.length ? notificationItems.map((item) => { const NotificationIcon = item.tone === 'notification-green' ? CheckCircle2 : item.tone === 'notification-orange' ? Wrench : ClipboardList; return <div className={`notification-row ${notificationRead ? 'notification-read' : ''}`} key={item.id}><span className={`notification-icon ${item.tone}`}><NotificationIcon size={17} /></span><span><strong>{item.messageKey ? t(item.messageKey) : item.text}</strong><small>{t(item.timeKey)}</small></span>{!notificationRead && <i />}</div> }) : <p className="empty-service">{t('noRequests')}</p>}</section>
    </div>
  )

  const profilePage = (
    <div className="page-stack">
      <div className="page-intro"><div><span className="eyebrow">{t('profile')}</span><h1>{t('profileDetails')}</h1><p>{profile?.full_name}</p></div><div className="intro-icon"><UserRound size={23} /></div></div>
      <form className="panel profile-panel" onSubmit={saveProfile}>
        <div className="profile-summary">
          <span className="profile-photo-large">
            {profile?.photo_data ? <img src={profile.photo_data} alt={profile.full_name} /> : profile?.full_name.slice(0, 1)}
          </span>
          <div><h2>{profile?.full_name}</h2><span>{t(roleNames[role])}</span></div>
          <label className="button button-light profile-photo-button">{t('choosePhoto')}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectProfilePhoto(event.target.files?.[0])} /></label>
        </div>
        <div className="profile-fields">
          <label className="field-label">{t('fullName')}<input value={profile?.full_name ?? ''} readOnly /></label>
            <label className="field-label">{t('profileRole')}<input value={t(roleNames[role])} readOnly /></label>
            {(role === 'student' || role === 'faculty') && <label className="field-label">{t('universityId')}<input value={profile?.university_id ?? ''} readOnly /></label>}
            <label className="field-label">{t('profileDepartment')}<input value={profile?.college ? (colleges.find((college) => college.id === profile.college)?.[locale === 'ar' ? 'nameAr' : 'nameEn'] ?? profile.college) : locale === 'ar' ? t(role === 'maintenance' ? 'maintenanceDept' : role === 'transport' ? 'transportDept' : 'laboratoryDept') : profile?.department ?? ''} readOnly /></label>
            <label className="field-label">{profile?.specialization ? t('specialization') : t('jobTitle')}<input value={profile?.specialization ?? (locale === 'ar' ? t(roleNames[role]) : profile?.job_title ?? '')} readOnly /></label>
            <label className="field-label">{t('emailAddress')}<input value={profile?.email ?? ''} readOnly /></label>
          <label className="field-label">{t('mobile')}<input type="tel" required value={profileMobile} onChange={(event) => setProfileMobile(event.target.value)} /></label>
        </div>
        <button className="button button-primary" type="submit" disabled={profileSaving}>{t('saveProfile')}</button>
      </form>
    </div>
  )

  const currentContent: Record<Page, ReactNode> = {
    dashboard, planner, catalog, resources: resourceManagement, requests: requestsPage, department, maintenance, transport: transportPage, notifications: notificationsPage, profile: profilePage,
  }

  if (!signedIn) {
    return (
      <div className={`navu-shell login-shell ${locale === 'ar' ? 'is-rtl' : 'is-ltr'}`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <section className="login-card">
          <div className="login-brand"><span className="brand-mark"><span>N</span><i /></span><span><strong>{t('brand')}</strong><small>{t('subtitle')}</small></span><button className="locale-toggle" onClick={() => setLocale((value) => value === 'ar' ? 'en' : 'ar')}><span>{locale === 'ar' ? 'EN' : 'ع'}</span>{locale === 'ar' ? 'English' : 'العربية'}</button></div>
          <div className="login-campus-photo"><img src="/najran-campus.jpeg" alt={locale === 'ar' ? 'مباني جامعة نجران' : 'Najran University campus'} /></div>
          <h1>{t('login')}</h1>
          <p className="login-note">{t('loginNote')}</p>
          <form onSubmit={signIn}>
            <label className="field-label">{t('email')}<input type="text" autoComplete="username" required value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} /></label>
            <label className="field-label">{t('password')}<input type="password" autoComplete="current-password" required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label>
            <div className="login-options">
              <label className="remember-option"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />{t('rememberMe')}</label>
              <button className="text-button forgot-password" type="button" onClick={() => { setForgotPasswordOpen((value) => !value); setLoginMessage('') }}>{t('forgotPassword')}</button>
            </div>
            {forgotPasswordOpen && <p className="login-message">{t('forgotPasswordHelp')}</p>}
            {loginMessage && <p className="login-message" role="status">{loginMessage}</p>}
            <button className="button button-primary" type="submit">{t('loginButton')} <ChevronLeft size={15} /></button>
          </form>
        </section>
        <footer className="login-footer">{t('footerCopyright')}</footer>
      </div>
    )
  }

  return (
    <div className={`navu-shell ${locale === 'ar' ? 'is-rtl' : 'is-ltr'}`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup"><span className="brand-mark"><span>N</span><i /></span><span className="brand-copy"><strong>{t('brand')}</strong><small>{t('subtitle')}</small></span><button className="mobile-close icon-button" onClick={() => setMobileNavOpen(false)} aria-label={t('close')}><X size={19} /></button></div>
        <div className="campus-select"><span className="campus-avatar">NU</span><span><strong>{t('campus')}</strong><small>{t('campusOnline')}</small></span></div>
        <div className="nav-label">{t('dashboard')}</div>
        <nav className="main-nav">
          {navItems.filter((item) => item.group === 'main').map(({ key, label, icon: Icon }) => <button key={key} className={page === key ? 'nav-active' : ''} onClick={() => { setPage(key); setMobileNavOpen(false) }}><Icon size={18} /><span>{label}</span>{key === 'requests' && <small className="nav-count">{scopedRequests.filter((item) => ['submitted', 'review'].includes(item.status)).length}</small>}</button>)}
        </nav>
        <div className="nav-label nav-services-label">{t('services')}</div>
        <nav className="main-nav">
          {navItems.filter((item) => item.group === 'services').map(({ key, label, icon: Icon }) => <button key={key} className={page === key ? 'nav-active' : ''} onClick={() => { setPage(key); setMobileNavOpen(false) }}><Icon size={18} /><span>{label}</span>{key === 'notifications' && notificationItems.length > 0 && !notificationRead && <i className="nav-notification-dot" />}</button>)}
        </nav>
        <div className="sidebar-spacer" />
        {profile?.permissions.includes('request:create:maintenance') && <button className="sidebar-help" onClick={() => setPage('maintenance')}><span><LifeBuoy size={17} /></span><div><strong>{t('raiseTicket')}</strong><small>{t('maintenanceTitle')}</small></div></button>}
        <div className="profile-row"><button className="profile-avatar profile-avatar-button" onClick={() => setPage('profile')} aria-label={t('profile')}>{profile?.photo_data ? <img src={profile.photo_data} alt="" /> : profile?.full_name.slice(0, 1)}</button><button className="profile-copy profile-open-button" onClick={() => setPage('profile')}><strong>{accountName}</strong><small>{t(roleNames[role])}</small></button><button title={t('signOut')} onClick={() => { void signOut() }} className="icon-button"><LogOut size={16} /></button></div>
      </aside>
      {mobileNavOpen && <button className="sidebar-backdrop" onClick={() => setMobileNavOpen(false)} aria-label={t('close')} />}
      <main className="app-main">
        <header className="topbar">
          <div className="topbar-leading"><button className="mobile-menu icon-button" onClick={() => setMobileNavOpen(true)} aria-label={t('dashboard')}><Menu size={20} /></button><div className="breadcrumb">{t('brand')}<ChevronLeft size={14} /><strong>{t(pageNames[page])}</strong></div></div>
          <div className="topbar-tools">
            <button className="locale-toggle" onClick={() => setLocale((value) => value === 'ar' ? 'en' : 'ar')}><span>{locale === 'ar' ? 'EN' : 'ع'}</span><span>{locale === 'ar' ? 'English' : 'العربية'}</span></button>
            <button className="topbar-icon icon-button" onClick={() => setPage('notifications')} aria-label={t('notifications')}><Bell size={18} />{notificationItems.length > 0 && !notificationRead && <i />}</button>
            <button className="topbar-avatar profile-avatar-button" onClick={() => setPage('profile')} aria-label={t('profile')}>{profile?.photo_data ? <img src={profile.photo_data} alt="" /> : profile?.full_name.slice(0, 1)}</button>
          </div>
        </header>
        <div className="page-content">{currentContent[page]}</div>
        <footer className="app-footer">{t('footerCopyright')}</footer>
      </main>
      {selectedResource && <div className="modal-backdrop" onClick={() => setSelectedResource(null)}><section className="resource-modal" onClick={(event) => event.stopPropagation()}><button className="icon-button modal-close" onClick={() => setSelectedResource(null)} aria-label={t('close')}><X size={18} /></button><div className="qr-demo-code"><QrCode size={50} /><span>{selectedResource.id}</span></div><span className="eyebrow">{t('qrDemo')}</span><h2>{locale === 'ar' ? selectedResource.nameAr : selectedResource.nameEn}</h2><div className="resource-info-list"><p><span>{t('college')}</span><strong>{locale === 'ar' ? colleges.find((college) => college.id === selectedResource.collegeId)?.nameAr : colleges.find((college) => college.id === selectedResource.collegeId)?.nameEn}</strong></p><p><span>{t('resourceId')}</span><strong>{selectedResource.id}</strong></p><p><span>{t('location')}</span><strong>{selectedResource.building} · {t('floor')} {selectedResource.floor}</strong></p><p><span>{t('capacity')}</span><strong>{selectedResource.capacity} {t('seatsLabel')}</strong></p><p><span>{t('equipment')}</span><strong>{selectedResource.equipment.join(', ')}</strong></p><p><span>{t('maintenanceStatus')}</span><strong className="good-status"><CheckCircle2 size={14} /> {t('good')}</strong></p></div><button className="button button-primary modal-action" onClick={() => { changeRoom(selectedResource); setSelectedResource(null); setPage('planner') }}>{t('viewPlan')} <ChevronLeft size={15} /></button></section></div>}
      {selectedRequest && <div className="modal-backdrop" onClick={() => setSelectedRequest(null)}><section className="resource-modal" onClick={(event) => event.stopPropagation()}><button className="icon-button modal-close" onClick={() => setSelectedRequest(null)} aria-label={t('close')}><X size={18} /></button><span className="eyebrow">{selectedRequest.id} · {selectedRequest.department}</span><h2>{selectedRequest.title}</h2><div className="resource-info-list"><p><span>{t('eventLocation')}</span><strong>{locale === 'ar' ? colleges.find((college) => college.id === selectedRequest.collegeId)?.nameAr : colleges.find((college) => college.id === selectedRequest.collegeId)?.nameEn}</strong></p><p><span>{t('status')}</span><strong>{renderStatus(selectedRequest.status)}</strong></p><p><span>{t('resource')}</span><strong>{selectedRequest.resource}</strong></p><p><span>{t('date')}</span><strong>{selectedRequest.date} · {selectedRequest.time}</strong></p><p><span>{t('attendees')}</span><strong>{selectedRequest.attendees || '—'}</strong></p><p><span>{t('owner')}</span><strong>{selectedRequest.owner}</strong></p>{selectedRequest.notes && <p><span>{t('notes')}</span><strong>{selectedRequest.notes}</strong></p>}{selectedRequest.attachmentName && <p><span>{t('attachment')}</span><a className="request-attachment-link" href={selectedRequest.attachmentData} download={selectedRequest.attachmentName}>{selectedRequest.attachmentName}</a></p>}</div>{selectedRequest.comments?.length ? <div className="request-comments"><strong>{t('comment')}</strong>{selectedRequest.comments.map((comment, index) => <p key={`${selectedRequest.id}-comment-${index}`}>{comment}</p>)}</div> : null}<div className="timeline request-timeline"><div><span className="timeline-mark timeline-blue"><ClipboardList size={13} /></span><strong>{t('submitted')}</strong><small>{selectedRequest.date}</small></div><div><span className={`timeline-mark ${['approved', 'completed'].includes(selectedRequest.status) ? 'timeline-green' : 'timeline-blue'}`}><Check size={13} /></span><strong>{t(statusNames[selectedRequest.status])}</strong><small>{selectedRequest.department}</small></div></div>{['submitted', 'review'].includes(selectedRequest.status) && <button className="button button-light modal-action" onClick={() => { if (window.confirm(t('confirmCancel'))) { updateStatus(selectedRequest.id, 'cancelled'); setSelectedRequest(null) } }}>{t('cancel')}</button>}</section></div>}
      {toast && <div className="toast-message"><CheckCircle2 size={17} />{toast}<button onClick={() => setToast('')} aria-label={t('close')}><X size={15} /></button></div>}
    </div>
  )
}

export default App
