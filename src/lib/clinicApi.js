import { ApiError, apiRequest } from './api.js';

export const CLINIC_SLUG = import.meta.env.VITE_CLINIC_SLUG?.trim() || 'demo-clinic';

const LOCAL_STATE_KEY = 'dcms-clinic-demo-state-v1';
const PREFERRED_CLINIC_KEY = 'dcms-public-clinic-slug';
const DEMO_FALLBACKS_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_FALLBACKS !== 'false';
const SLOT_DURATION_MINUTES = 30;
const MIN_BOOKING_LEAD_MINUTES = 30;
const MAX_BOOKING_ADVANCE_DAYS = 30;
export const DEFAULT_TIMEZONE = 'Asia/Yangon';
const ACTIVE_BOOKING_STATUSES = new Set(['scheduled', 'confirmed', 'checked_in']);

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const fallbackStateSeed = {
  departments: [
    {
      _id: 'dept-general-medicine',
      name: 'General Medicine',
      code: 'GM',
      description: 'Primary care, common symptoms, and first-line consultations.',
      color: '#4f46e5',
    },
    {
      _id: 'dept-pediatrics',
      name: 'Pediatrics',
      code: 'PD',
      description: 'Children, growth checks, vaccinations, and family guidance.',
      color: '#0f766e',
    },
    {
      _id: 'dept-cardiology',
      name: 'Cardiology',
      code: 'CD',
      description: 'Heart, blood pressure, chest pain, and circulation concerns.',
      color: '#b91c1c',
    },
    {
      _id: 'dept-orthopedics',
      name: 'Orthopedics',
      code: 'OR',
      description: 'Bones, joints, sprains, sports injuries, and mobility issues.',
      color: '#7c3aed',
    },
    {
      _id: 'dept-dermatology',
      name: 'Dermatology',
      code: 'DM',
      description: 'Skin, hair, nails, rashes, and allergic skin reactions.',
      color: '#ea580c',
    },
  ],
  doctors: [
    {
      _id: 'doctor-general-1',
      displayName: 'Dr. Aung Min',
      email: 'aung.min@demo-clinic.test',
      role: 'doctor',
      specialty: 'Internal Medicine',
      departmentId: 'dept-general-medicine',
    },
    {
      _id: 'doctor-cardiology-1',
      displayName: 'Dr. Hnin Wai',
      email: 'hnin.wai@demo-clinic.test',
      role: 'doctor',
      specialty: 'Cardiology',
      departmentId: 'dept-cardiology',
    },
    {
      _id: 'doctor-pediatrics-1',
      displayName: 'Dr. Kaung Htet',
      email: 'kaung.htet@demo-clinic.test',
      role: 'doctor',
      specialty: 'Pediatrics',
      departmentId: 'dept-pediatrics',
    },
    {
      _id: 'doctor-orthopedics-1',
      displayName: 'Dr. Thiri San',
      email: 'thiri.san@demo-clinic.test',
      role: 'doctor',
      specialty: 'Orthopedics',
      departmentId: 'dept-orthopedics',
    },
    {
      _id: 'doctor-dermatology-1',
      displayName: 'Dr. Nilar Aye',
      email: 'nilar.aye@demo-clinic.test',
      role: 'doctor',
      specialty: 'Dermatology',
      departmentId: 'dept-dermatology',
    },
  ],
  schedules: [],
  bookings: [],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createLocalId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function isPersistedRecordId(value) {
  return /^[a-f\d]{24}$/i.test(String(value ?? '').trim());
}

function readLocalState() {
  if (typeof window === 'undefined') {
    return clone(fallbackStateSeed);
  }

  const raw = window.localStorage.getItem(LOCAL_STATE_KEY);
  if (!raw) {
    window.localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(fallbackStateSeed));
    return clone(fallbackStateSeed);
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      departments: Array.isArray(parsed.departments) && parsed.departments.length > 0
        ? parsed.departments
        : clone(fallbackStateSeed.departments),
      doctors: Array.isArray(parsed.doctors) && parsed.doctors.length > 0
        ? parsed.doctors
        : clone(fallbackStateSeed.doctors),
      schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
      bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
    };
  } catch {
    window.localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(fallbackStateSeed));
    return clone(fallbackStateSeed);
  }
}

function writeLocalState(nextState) {
  if (typeof window === 'undefined') {
    return nextState;
  }

  window.localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(nextState));
  return nextState;
}

function updateLocalState(updater) {
  return writeLocalState(updater(readLocalState()));
}

export function getPreferredClinicSlug() {
  if (typeof window === 'undefined') {
    return CLINIC_SLUG;
  }

  const storedSlug = window.localStorage.getItem(PREFERRED_CLINIC_KEY)?.trim();
  return storedSlug || CLINIC_SLUG;
}

export function setPreferredClinicSlug(clinicSlug) {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedSlug = String(clinicSlug ?? '').trim();
  if (!normalizedSlug) {
    window.localStorage.removeItem(PREFERRED_CLINIC_KEY);
    return;
  }

  window.localStorage.setItem(PREFERRED_CLINIC_KEY, normalizedSlug);
}

function isMissingFeatureError(error) {
  return DEMO_FALLBACKS_ENABLED && error instanceof ApiError && [404, 405, 501].includes(error.statusCode);
}

function normalizeDepartment(department) {
  if (!department) {
    return department;
  }

  return {
    _id: department._id ?? department.id ?? createLocalId('department'),
    name: department.name ?? department.title ?? 'Department',
    code: department.code ?? department.shortCode ?? '',
    description: department.description ?? '',
    color: department.color ?? '#4f46e5',
    isActive: department.isActive ?? true,
    createdAt: department.createdAt ?? null,
    updatedAt: department.updatedAt ?? null,
  };
}

function normalizeTenant(tenant) {
  if (!tenant) {
    return tenant;
  }

  return {
    _id: tenant._id ?? tenant.id ?? createLocalId('tenant'),
    slug: tenant.slug ?? '',
    code: tenant.code ?? '',
    name: tenant.name ?? 'Clinic',
    status: tenant.status ?? 'active',
    contactEmail: tenant.contactEmail ?? '',
    contactPhone: tenant.contactPhone ?? '',
    address: tenant.address ?? '',
    timezone: tenant.timezone ?? DEFAULT_TIMEZONE,
    createdAt: tenant.createdAt ?? null,
    updatedAt: tenant.updatedAt ?? null,
  };
}

function normalizeManagedUser(user) {
  if (!user) {
    return user;
  }

  return {
    _id: user._id ?? user.id ?? createLocalId('user'),
    tenantId: user.tenantId ?? null,
    email: user.email ?? '',
    displayName: user.displayName ?? user.name ?? 'User',
    role: user.role ?? 'staff',
    patientId: user.patientId ?? null,
    isActive: user.isActive ?? true,
    createdAt: user.createdAt ?? null,
    updatedAt: user.updatedAt ?? null,
    lastLoginAt: user.lastLoginAt ?? null,
  };
}

function normalizeDoctor(doctor, departments = []) {
  if (!doctor) {
    return doctor;
  }

  const departmentId = doctor.departmentId ?? doctor.department?._id ?? doctor.department?.id ?? null;
  const departmentName = departments.find((item) => item._id === departmentId)?.name ?? doctor.departmentName ?? null;

  return {
    _id: doctor._id ?? doctor.id ?? createLocalId('doctor'),
    displayName: doctor.displayName ?? doctor.fullName ?? doctor.name ?? 'Doctor',
    email: doctor.email ?? '',
    role: doctor.role ?? 'doctor',
    departmentId,
    departmentName,
    specialty: doctor.specialty ?? doctor.departmentName ?? departmentName ?? 'General Practice',
    consultationFee: doctor.consultationFee ?? null,
    isActive: doctor.isActive ?? true,
    createdAt: doctor.createdAt ?? null,
    updatedAt: doctor.updatedAt ?? null,
  };
}

function normalizeSchedule(schedule) {
  if (!schedule) {
    return schedule;
  }

  return {
    _id: schedule._id ?? schedule.id ?? createLocalId('schedule'),
    doctorId: schedule.doctorId,
    dayOfWeek: Number(schedule.dayOfWeek),
    startMinute: Number(schedule.startMinute),
    endMinute: Number(schedule.endMinute),
    slotDurationMinutes: Number(schedule.slotDurationMinutes ?? SLOT_DURATION_MINUTES),
    timezone: schedule.timezone ?? DEFAULT_TIMEZONE,
    isActive: schedule.isActive ?? true,
    source: schedule.source ?? 'backend',
    createdAt: schedule.createdAt ?? null,
    updatedAt: schedule.updatedAt ?? null,
  };
}

function normalizeBooking(booking) {
  if (!booking) {
    return booking;
  }

  return {
    _id: booking._id ?? booking.id ?? createLocalId('booking'),
    reference: booking.reference ?? booking.appointmentNumber ?? booking.code ?? 'APT-LOCAL',
    patientName: booking.patientName ?? booking.patientLabel ?? booking.patientEmail ?? 'Patient',
    patientEmail: booking.patientEmail ?? null,
    departmentId: booking.departmentId ?? null,
    departmentName: booking.departmentName ?? null,
    doctorId: booking.doctorId ?? null,
    doctorName: booking.doctorName ?? null,
    scheduledAt: booking.scheduledAt,
    endAt: booking.endAt ?? null,
    reason: booking.reason ?? '',
    status: booking.status ?? 'scheduled',
    source: booking.source ?? 'local',
  };
}

function isActiveBookingStatus(status) {
  return ACTIVE_BOOKING_STATUSES.has(String(status ?? '').trim());
}

function isDuplicateBooking(appointments, appointment) {
  const targetTime = new Date(appointment.scheduledAt).getTime();
  if (!Number.isFinite(targetTime)) {
    return false;
  }

  return appointments.some((existing) => {
    const existingTime = new Date(existing.scheduledAt).getTime();
    return (
      isActiveBookingStatus(existing.status) &&
      existing.doctorId === appointment.doctorId &&
      existingTime === targetTime
    );
  });
}

function normalizeTelegramConnection(payload) {
  return {
    connected: Boolean(payload?.connected),
    notificationsEnabled: Boolean(payload?.notificationsEnabled),
    telegramUsername: payload?.telegramUsername ?? null,
    telegramLinkedAt: payload?.telegramLinkedAt ?? null,
    telegramChatIdMasked: payload?.telegramChatIdMasked ?? null,
    botUsername: payload?.botUsername ?? null,
    connectExpiresAt: payload?.connectExpiresAt ?? null,
    connectCommand: payload?.connectCommand ?? null,
    connectUrl: payload?.connectUrl ?? null,
  };
}

function hourMinuteToMinutes(value) {
  if (!value) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function minutesToTimeString(minutes) {
  const safeMinutes = Math.max(0, Math.min(24 * 60 - 1, Number(minutes)));
  const hours = String(Math.floor(safeMinutes / 60)).padStart(2, '0');
  const mins = String(safeMinutes % 60).padStart(2, '0');
  return `${hours}:${mins}`;
}

function formatSlotLabel(date, timeZone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12',
    timeZone,
  }).format(date);
}

function getPartsForTimeZone(date, timeZone = DEFAULT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? 'Sun';
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');

  return {
    dayOfWeek: dayLabels.indexOf(weekday),
    minuteOfDay: hour * 60 + minute,
  };
}

function getTimeZoneDateParts(date, timeZone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
}

function buildDateFromTimeZone(date, timeZone, minuteOfDay) {
  const parts = getTimeZoneDateParts(date, timeZone);
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '1970');
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '1') - 1;
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '1');
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  return new Date(Date.UTC(year, month, day, hours, minutes));
}

function slotConflicts(slotStart, slotEnd, bookings) {
  const startTime = new Date(slotStart).getTime();
  const endTime = new Date(slotEnd).getTime();

  return bookings.some((booking) => {
    if (!booking.scheduledAt || !booking.endAt) {
      return false;
    }
    const bookingStart = new Date(booking.scheduledAt).getTime();
    const bookingEnd = new Date(booking.endAt).getTime();
    return bookingStart < endTime && bookingEnd > startTime;
  });
}

function buildLocalAvailability({ departmentId, days = MAX_BOOKING_ADVANCE_DAYS } = {}) {
  const state = readLocalState();
  const doctors = state.doctors.filter((doctor) => !departmentId || doctor.departmentId === departmentId);
  const schedules = state.schedules.filter((schedule) => schedule.isActive !== false);
  const bookings = state.bookings.filter((booking) => booking.status !== 'cancelled');
  const results = [];
  const start = new Date();
  const earliestBookableTime = Date.now() + MIN_BOOKING_LEAD_MINUTES * 60 * 1000;
  const latestBookableTime = Date.now() + MAX_BOOKING_ADVANCE_DAYS * 24 * 60 * 60 * 1000;

  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + offset);

    for (const doctor of doctors) {
      const doctorSchedules = schedules.filter(
        (schedule) =>
          schedule.doctorId === doctor._id && getPartsForTimeZone(day, schedule.timezone).dayOfWeek === schedule.dayOfWeek,
      );

      for (const schedule of doctorSchedules) {
        const dayParts = getPartsForTimeZone(day, schedule.timezone);
        if (dayParts.dayOfWeek !== schedule.dayOfWeek) {
          continue;
        }

        for (
          let cursor = schedule.startMinute;
          cursor + schedule.slotDurationMinutes <= schedule.endMinute;
          cursor += schedule.slotDurationMinutes
        ) {
          const slotStart = buildDateFromTimeZone(day, schedule.timezone, cursor);
          const slotEnd = buildDateFromTimeZone(day, schedule.timezone, cursor + schedule.slotDurationMinutes);
          const doctorBookings = bookings.filter((booking) => booking.doctorId === doctor._id);

          if (slotStart.getTime() < earliestBookableTime) {
            continue;
          }
          if (slotStart.getTime() > latestBookableTime) {
            continue;
          }

          if (slotConflicts(slotStart, slotEnd, doctorBookings)) {
            continue;
          }

          results.push({
            departmentId: doctor.departmentId ?? departmentId ?? null,
            doctorId: doctor._id,
            doctorName: doctor.displayName,
            scheduledAt: slotStart.toISOString(),
            endAt: slotEnd.toISOString(),
            label: formatSlotLabel(slotStart, schedule.timezone),
            timeZone: schedule.timezone,
            source: 'local',
          });
        }
      }
    }
  }

  return results.sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime());
}

function getFallbackTriage(message, departments) {
  const normalizedMessage = message.toLowerCase();
  const rules = [
    {
      keywords: ['chest pain', 'heart', 'palpitation', 'blood pressure', 'pressure'],
      departmentName: 'Cardiology',
      urgency: 'urgent',
      summary: 'Your symptoms sound like they should be reviewed by the cardiology team.',
    },
    {
      keywords: ['child', 'kid', 'fever', 'vaccin', 'baby', 'pediatric'],
      departmentName: 'Pediatrics',
      urgency: 'routine',
      summary: 'These symptoms align with pediatric care for a child or adolescent.',
    },
    {
      keywords: ['bone', 'joint', 'knee', 'back pain', 'sprain', 'fracture', 'shoulder'],
      departmentName: 'Orthopedics',
      urgency: 'routine',
      summary: 'An orthopedics consultation would be the best fit for bone or joint pain.',
    },
    {
      keywords: ['rash', 'skin', 'itch', 'allergy', 'acne', 'eczema'],
      departmentName: 'Dermatology',
      urgency: 'routine',
      summary: 'The dermatology department is a good match for this skin-related concern.',
    },
  ];

  const match =
    rules.find((rule) => rule.keywords.some((keyword) => normalizedMessage.includes(keyword))) ??
    {
      departmentName: 'General Medicine',
      urgency: 'routine',
      summary: 'General Medicine is the safest starting point for these symptoms.',
    };

  const department = departments.find((item) => item.name === match.departmentName) ?? departments[0];
  const availability = buildLocalAvailability({ departmentId: department?._id, days: MAX_BOOKING_ADVANCE_DAYS });

  return {
    source: 'local',
    departmentId: department?._id ?? null,
    departmentName: department?.name ?? match.departmentName,
    urgency: match.urgency,
    summary: match.summary,
    canBook: availability.length > 0,
    assistantMessage: `${match.summary} ${availability.length > 0 ? 'We found live appointment slots.' : 'Please add doctor schedules to unlock booking.'}`,
    slots: availability.slice(0, 6),
  };
}

export async function loadDepartments(request, { publicView = true } = {}) {
  const clinicSlug = getPreferredClinicSlug();
  const routes = publicView
    ? [`/public/clinics/${clinicSlug}/departments`]
    : ['/departments', `/public/clinics/${clinicSlug}/departments`];

  for (const route of routes) {
    try {
      const payload = await request(route, { auth: route.startsWith('/public/') ? false : undefined });
      const departments = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : null;
      if (departments) {
        return departments.map(normalizeDepartment);
      }
    } catch (error) {
      if (!isMissingFeatureError(error)) {
        throw error;
      }
    }
  }

  return readLocalState().departments.map(normalizeDepartment);
}

export async function loadDoctors(request, { publicView = false, departmentId } = {}) {
  const clinicSlug = getPreferredClinicSlug();
  const getLocalDoctors = () => {
    const state = readLocalState();
    const departments = state.departments.map(normalizeDepartment);
    return state.doctors
      .filter((doctor) => !departmentId || doctor.departmentId === departmentId)
      .map((doctor) => normalizeDoctor(doctor, departments));
  };

  if (publicView) {
    try {
      const payload = await request(
        `/public/clinics/${clinicSlug}/doctors${departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : ''}`,
        { auth: false },
      );
      const doctors = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : null;
      if (doctors) {
        const departments = await loadDepartments(request, { publicView: true }).catch(() =>
          readLocalState().departments.map(normalizeDepartment),
        );
        return doctors
          .map((doctor) => normalizeDoctor(doctor, departments))
          .filter((doctor) => !departmentId || doctor.departmentId === departmentId);
      }
    } catch (error) {
      if (!isMissingFeatureError(error)) {
        throw error;
      }
    }

    return getLocalDoctors();
  }

  try {
    const payload = await request('/users?role=doctor&pageSize=100');
    const doctors = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
    const departments = await loadDepartments(request, { publicView: false }).catch(() =>
      loadDepartments(request, { publicView: true }),
    );
    const assignments = await Promise.all(
      doctors.map(async (doctor) => {
        try {
          const response = await request(`/doctors/${doctor._id}/departments`);
          return Array.isArray(response) ? response : [];
        } catch (error) {
          if (isMissingFeatureError(error)) {
            return [];
          }
          throw error;
        }
      }),
    );

    return doctors
      .map((doctor, index) => {
        const doctorAssignments = assignments[index] ?? [];
        const primaryAssignment =
          doctorAssignments.find((assignment) => assignment.isPrimary) ?? doctorAssignments[0] ?? null;
        return normalizeDoctor(
          {
            ...doctor,
            departmentId: primaryAssignment?.department?._id ?? primaryAssignment?.departmentId ?? null,
            departmentName: primaryAssignment?.department?.name ?? null,
          },
          departments,
        );
      })
      .filter((doctor) => !departmentId || doctor.departmentId === departmentId);
  } catch (error) {
    if (!isMissingFeatureError(error)) {
      throw error;
    }
  }

  return getLocalDoctors();
}

export async function loadSchedules(request, { doctorId } = {}) {
  const routes = doctorId
    ? [`/schedules/doctors/${doctorId}`, '/schedules/doctors']
    : ['/schedules/doctors'];

  for (const route of routes) {
    try {
      const payload = await request(route);
      if (Array.isArray(payload) && payload.length > 0) {
        return payload.map(normalizeSchedule);
      }
    } catch (error) {
      if (!isMissingFeatureError(error)) {
        throw error;
      }
    }
  }

  const state = readLocalState();
  return state.schedules
    .filter((schedule) => !doctorId || schedule.doctorId === doctorId)
    .map(normalizeSchedule);
}

export async function loadAvailability(request, { departmentId, days = MAX_BOOKING_ADVANCE_DAYS } = {}) {
  if (departmentId && !isPersistedRecordId(departmentId)) {
    return buildLocalAvailability({ departmentId, days });
  }

  const from = new Date().toISOString();
  const to = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const clinicSlug = getPreferredClinicSlug();

  const routes = departmentId
    ? [
        `/public/clinics/${clinicSlug}/availability?${new URLSearchParams({
          departmentId,
          from,
          to,
        }).toString()}`,
        `/public/clinics/${clinicSlug}/departments/${departmentId}/availability?${new URLSearchParams({
          from,
          to,
        }).toString()}`,
      ]
    : [];

  for (const route of routes) {
    try {
      const payload = await request(route, { auth: false });
      const items = Array.isArray(payload) ? payload : Array.isArray(payload?.slots) ? payload.slots : [];
      if (Array.isArray(payload) || Array.isArray(payload?.slots)) {
        return items.map((item) => ({
          departmentId: item.departmentId ?? departmentId ?? null,
          doctorId: item.doctorId,
          doctorName: item.doctorName ?? item.displayName ?? 'Doctor',
          scheduledAt: item.scheduledAt,
          endAt: item.endAt ?? null,
          label: item.label ?? formatSlotLabel(new Date(item.scheduledAt), item.timeZone ?? DEFAULT_TIMEZONE),
          timeZone: item.timeZone ?? DEFAULT_TIMEZONE,
          source: item.source ?? 'backend',
        })).filter((item) => new Date(item.scheduledAt).getTime() >= Date.now() + MIN_BOOKING_LEAD_MINUTES * 60 * 1000);
      }
    } catch (error) {
      if (!isMissingFeatureError(error)) {
        throw error;
      }
    }
  }

  return buildLocalAvailability({ departmentId, days });
}

export async function submitTriage(request, { message, departmentId } = {}) {
  const clinicSlug = getPreferredClinicSlug();
  try {
    const departments = await loadDepartments(request, { publicView: true });
    const payload = await request(`/public/clinics/${clinicSlug}/chatbot/triage`, {
      method: 'POST',
      body: {
        message,
        departmentId,
      },
    });

    if (payload) {
      return {
        source: payload.source ?? 'backend',
        departmentId: payload.departmentId ?? null,
        departmentName: payload.departmentName ?? null,
        urgency: payload.urgency ?? 'routine',
        summary: payload.summary ?? payload.message ?? 'Assistant response received.',
        canBook: payload.canBook ?? Boolean(payload.slots?.length),
        assistantMessage: payload.assistantMessage ?? payload.message ?? 'Assistant response received.',
        slots: Array.isArray(payload.slots) ? payload.slots : [],
      };
    }

    return getFallbackTriage(String(message ?? ''), departments);
  } catch (error) {
    if (!isMissingFeatureError(error)) {
      throw error;
    }

    const departments = await loadDepartments(request, { publicView: true });
    return getFallbackTriage(String(message ?? ''), departments);
  }
}

export async function saveDepartment(request, department) {
  const payload = {
    name: department.name,
    code: department.code,
    description: department.description,
    color: department.color,
  };

  try {
    const result = department._id
      ? await request(`/departments/${department._id}`, {
          method: 'PATCH',
          body: payload,
        })
      : await request('/departments', {
          method: 'POST',
          body: payload,
        });

    if (result) {
      return normalizeDepartment(result);
    }
  } catch (error) {
    if (!isMissingFeatureError(error)) {
      throw error;
    }
  }

  const nextDepartment = {
    _id: department._id ?? createLocalId('department'),
    name: department.name,
    code: department.code,
    description: department.description,
    color: department.color,
    isActive: true,
  };

  updateLocalState((state) => {
    const departments = department._id
      ? state.departments.map((item) => (item._id === department._id ? nextDepartment : item))
      : [...state.departments, nextDepartment];
    return {
      ...state,
      departments,
    };
  });

  return normalizeDepartment(nextDepartment);
}

export async function loadTenants(request) {
  const payload = await request('/tenants');
  const tenants = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
  return tenants.map(normalizeTenant);
}

export async function loadPublicClinics() {
  const payload = await apiRequest('/public/clinics', { turnstile: false });
  const clinics = Array.isArray(payload) ? payload : [];
  return clinics.map((c) => ({ _id: c._id, slug: c.slug, name: c.name, address: c.address ?? '' }));
}

export async function saveTenant(request, tenant) {
  const payload = {
    slug: tenant.slug,
    code: tenant.code,
    name: tenant.name,
    status: tenant.status ?? 'active',
    contactEmail: tenant.contactEmail || undefined,
    contactPhone: tenant.contactPhone || undefined,
    address: tenant.address || undefined,
    timezone: tenant.timezone || DEFAULT_TIMEZONE,
  };

  const result = tenant._id
    ? await request(`/tenants/${tenant._id}`, {
        method: 'PATCH',
        body: payload,
      })
    : await request('/tenants', {
        method: 'POST',
        body: payload,
      });

  return normalizeTenant(result);
}

export async function loadUsers(request, filters = {}) {
  const query = new URLSearchParams();
  if (filters.page) {
    query.set('page', String(filters.page));
  }
  if (filters.pageSize) {
    query.set('pageSize', String(Math.min(100, Math.max(1, Number(filters.pageSize)))));
  }
  if (filters.role) {
    query.set('role', filters.role);
  }
  if (filters.search) {
    query.set('search', filters.search);
  }

  const payload = await request(`/users${query.size ? `?${query.toString()}` : ''}`);
  const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];

  return {
    items: items.map(normalizeManagedUser),
    pagination: payload?.pagination ?? {
      page: Number(filters.page ?? 1),
      pageSize: Number(filters.pageSize ?? items.length ?? 0),
      total: items.length,
      totalPages: 1,
    },
  };
}

export async function saveUser(request, user) {
  const payload = {
    tenantId: user.role === 'platform_admin' ? undefined : user.tenantId,
    email: user.email,
    password: user.password,
    displayName: user.displayName,
    role: user.role,
  };

  const result = await request('/users', {
    method: 'POST',
    body: payload,
  });

  return normalizeManagedUser(result);
}

export async function removeDepartment(request, departmentId) {
  try {
    await request(`/departments/${departmentId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    if (!isMissingFeatureError(error)) {
      throw error;
    }
  }

  updateLocalState((state) => ({
    ...state,
    departments: state.departments.filter((item) => item._id !== departmentId),
    doctors: state.doctors.map((doctor) =>
      doctor.departmentId === departmentId ? { ...doctor, departmentId: null } : doctor,
    ),
  }));

  return true;
}

export async function assignDoctorToDepartment(request, { doctorId, departmentId }) {
  try {
    const result = await request(`/doctors/${doctorId}/departments`, {
      method: 'PUT',
      body: {
        departmentIds: [departmentId],
        primaryDepartmentId: departmentId,
      },
    });

    if (result) {
      return result;
    }
  } catch (error) {
    if (!isMissingFeatureError(error)) {
      throw error;
    }
  }

  updateLocalState((state) => ({
    ...state,
    doctors: state.doctors.map((doctor) =>
      doctor._id === doctorId ? { ...doctor, departmentId } : doctor,
    ),
  }));

  return { doctorId, departmentId };
}

export async function saveWeeklyAvailability(request, availability) {
  if (!availability?.doctorId || !Array.isArray(availability.blocks) || availability.blocks.length === 0) {
    return [];
  }

  try {
    const payload = await request(`/doctors/${availability.doctorId}/availability`, {
      method: 'PUT',
      body: {
        timezone: availability.timezone ?? DEFAULT_TIMEZONE,
        slotDurationMinutes: availability.slotDurationMinutes ?? SLOT_DURATION_MINUTES,
        workingDays: availability.workDays.map((dayOfWeek) => ({
          dayOfWeek,
          slots: availability.blocks.map((block) => ({
            startMinute: block.startMinute,
            endMinute: block.endMinute,
          })),
        })),
      },
    });

    if (payload?.schedules) {
      return payload.schedules.map(normalizeSchedule);
    }
  } catch (error) {
    if (!isMissingFeatureError(error)) {
      throw error;
    }
  }

  const fallbackCreated = availability.workDays.flatMap((dayOfWeek) =>
    availability.blocks.map((block) =>
      normalizeSchedule({
        _id: createLocalId('schedule'),
        doctorId: availability.doctorId,
        dayOfWeek,
        startMinute: block.startMinute,
        endMinute: block.endMinute,
        slotDurationMinutes: availability.slotDurationMinutes ?? SLOT_DURATION_MINUTES,
        timezone: availability.timezone ?? DEFAULT_TIMEZONE,
        source: 'local',
      }),
    ),
  );

  updateLocalState((state) => ({
    ...state,
    schedules: [
      ...state.schedules.filter((schedule) => schedule.doctorId !== availability.doctorId),
      ...fallbackCreated,
    ],
  }));

  return fallbackCreated;
}

export async function bookAppointment(request, appointment) {
  const scheduledAt = new Date(appointment.scheduledAt).getTime();
  const clinicSlug = appointment.clinicSlug ?? getPreferredClinicSlug();

  if (scheduledAt < Date.now() + MIN_BOOKING_LEAD_MINUTES * 60 * 1000) {
    throw new ApiError('Appointments must be booked at least 30 minutes in advance.', 400);
  }
  if (scheduledAt > Date.now() + MAX_BOOKING_ADVANCE_DAYS * 24 * 60 * 60 * 1000) {
    throw new ApiError('Appointments can only be booked up to 30 days in advance.', 400);
  }

  try {
    const payload = await request(`/public/clinics/${clinicSlug}/appointments`, {
      method: 'POST',
      body: {
        doctorId: appointment.doctorId,
        scheduledAt: appointment.scheduledAt,
        durationMinutes: appointment.durationMinutes ?? SLOT_DURATION_MINUTES,
        reason: appointment.reason,
        departmentId: appointment.departmentId,
      },
    });

    if (payload) {
      return normalizeBooking(payload);
    }
  } catch (error) {
    if (!isMissingFeatureError(error)) {
      throw error;
    }
  }

  const state = readLocalState();
  if (isDuplicateBooking(state.bookings, appointment)) {
    throw new ApiError('You already booked this appointment slot.', 400);
  }
  const doctor = state.doctors.find((item) => item._id === appointment.doctorId);
  const department = state.departments.find((item) => item._id === (appointment.departmentId ?? doctor?.departmentId));
  const booking = normalizeBooking({
    _id: createLocalId('booking'),
    reference: `APT-${String(state.bookings.length + 1).padStart(4, '0')}`,
    patientName: appointment.patientName ?? appointment.patientEmail ?? 'Patient',
    patientEmail: appointment.patientEmail ?? null,
    departmentId: department?._id ?? appointment.departmentId ?? doctor?.departmentId ?? null,
    departmentName: department?.name ?? null,
    doctorId: appointment.doctorId,
    doctorName: doctor?.displayName ?? null,
    scheduledAt: appointment.scheduledAt,
    endAt:
      appointment.endAt ??
      new Date(new Date(appointment.scheduledAt).getTime() + (appointment.durationMinutes ?? SLOT_DURATION_MINUTES) * 60000).toISOString(),
    reason: appointment.reason ?? '',
    status: 'scheduled',
    source: 'local',
  });

  updateLocalState((next) => ({
    ...next,
    bookings: [...next.bookings, booking],
  }));

  return booking;
}

export async function loadMyAppointments(request) {
  try {
    const payload = await request('/me/appointments?pageSize=20');
    if (payload?.items?.length || payload?.pagination) {
      return {
        items: Array.isArray(payload.items)
          ? payload.items.map((appointment) => normalizeBooking(appointment))
          : [],
        pagination: payload.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      };
    }
  } catch (error) {
    if (!isMissingFeatureError(error)) {
      throw error;
    }
  }

  const state = readLocalState();
  return {
    items: state.bookings.map((booking) => normalizeBooking(booking)),
    pagination: {
      page: 1,
      pageSize: 20,
      total: state.bookings.length,
      totalPages: 1,
    },
  };
}

export async function loadTelegramConnection(request) {
  const payload = await request('/me/telegram');
  return normalizeTelegramConnection(payload);
}

export async function createTelegramConnection(request) {
  const payload = await request('/me/telegram/connect', {
    method: 'POST',
  });
  return normalizeTelegramConnection(payload);
}

export async function disconnectTelegramConnection(request) {
  const payload = await request('/me/telegram/connect', {
    method: 'DELETE',
  });
  return normalizeTelegramConnection(payload);
}

export function formatClinicTime(value, timeZone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value));
}

export function formatShortTime(value) {
  return minutesToTimeString(value);
}

// ── Medication Catalog ──────────────────────────────────────────────

export async function loadMedications(request) {
  const payload = await request('/medications');
  return Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
}

export async function saveMedication(request, medication) {
  const body = {
    name: medication.name,
    genericName: medication.genericName || undefined,
    category: medication.category || undefined,
    defaultDosage: medication.defaultDosage || undefined,
    defaultFrequency: medication.defaultFrequency || undefined,
    defaultDuration: medication.defaultDuration || undefined,
    unitPrice: Number(medication.unitPrice),
  };

  if (medication._id) {
    return request(`/medications/${medication._id}`, { method: 'PATCH', body });
  }
  return request('/medications', { method: 'POST', body });
}

export async function removeMedication(request, medicationId) {
  return request(`/medications/${medicationId}`, { method: 'DELETE' });
}

// ── Doctor Consultation Fee ─────────────────────────────────────────

export async function setDoctorConsultationFee(request, doctorId, fee) {
  return request(`/doctors/${doctorId}/consultation-fee`, {
    method: 'PATCH',
    body: { consultationFee: fee },
  });
}

export function getLocalDepartmentsSnapshot() {
  return readLocalState().departments.map(normalizeDepartment);
}

export function getLocalDoctorsSnapshot() {
  const departments = getLocalDepartmentsSnapshot();
  return readLocalState().doctors.map((doctor) => normalizeDoctor(doctor, departments));
}

export function getLocalSchedulesSnapshot() {
  return readLocalState().schedules.map(normalizeSchedule);
}

export function getLocalBookingsSnapshot() {
  return readLocalState().bookings.map(normalizeBooking);
}

export function getWorkingDaysLabel(days = []) {
  if (!Array.isArray(days) || days.length === 0) {
    return 'No working days';
  }

  return days
    .slice()
    .sort((left, right) => left - right)
    .map((day) => dayLabels[day] ?? String(day))
    .join(', ');
}

export function toMinutes(value) {
  return hourMinuteToMinutes(value);
}

export function toTimeString(value) {
  return minutesToTimeString(value);
}
