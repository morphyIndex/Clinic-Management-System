import { useEffect, useMemo, useState, useTransition } from 'react';
import ModalPortal from './ModalPortal.jsx';
import FloatingAssistantWidget from './FloatingAssistantWidget.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { isApiError } from '../lib/api.js';
import {
  bookAppointment,
  createTelegramConnection,
  disconnectTelegramConnection,
  formatClinicTime,
  getLocalBookingsSnapshot,
  loadAvailability,
  loadDepartments,
  loadDoctors,
  loadMyAppointments,
  loadTelegramConnection,
  submitTriage,
} from '../lib/clinicApi.js';

const initialBookingState = {
  departmentId: '',
  doctorId: '',
  reason: '',
  slotId: '',
};

const CALENDAR_DAY_COUNT = 30;
const CALENDAR_TIMEZONE = 'Asia/Bangkok';

function getErrorMessage(error, fallbackMessage) {
  return isApiError(error) ? error.message : fallbackMessage;
}

function formatAppointmentTime(value) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatTelegramExpiry(value) {
  if (!value) {
    return 'No link generated yet';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getCalendarDateKey(value, timeZone = CALENDAR_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function formatCalendarWeekday(value, timeZone = CALENDAR_TIMEZONE) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(new Date(value));
}

function formatCalendarDayNumber(value, timeZone = CALENDAR_TIMEZONE) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    day: 'numeric',
  }).format(new Date(value));
}

function formatCalendarMonthLabel(value, timeZone = CALENDAR_TIMEZONE) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
  }).format(new Date(value));
}

function formatCalendarFullDate(value, timeZone = CALENDAR_TIMEZONE) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatSlotTime(value, timeZone = CALENDAR_TIMEZONE) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12',
  }).format(new Date(value));
}

function groupSlotsByDay(slots, timeZone = CALENDAR_TIMEZONE) {
  const grouped = new Map();

  for (const slot of slots) {
    const key = getCalendarDateKey(slot.scheduledAt, slot.timeZone ?? timeZone);
    const daySlots = grouped.get(key) ?? [];
    daySlots.push(slot);
    grouped.set(key, daySlots);
  }

  return grouped;
}

function buildCalendarDays(slotsByDay, timeZone = CALENDAR_TIMEZONE, totalDays = CALENDAR_DAY_COUNT) {
  const days = [];
  const start = new Date();

  for (let offset = 0; offset < totalDays; offset += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + offset);
    const key = getCalendarDateKey(day, timeZone);

    days.push({
      key,
      weekdayLabel: formatCalendarWeekday(day, timeZone),
      dayNumber: formatCalendarDayNumber(day, timeZone),
      monthLabel: formatCalendarMonthLabel(day, timeZone),
      hasSlots: slotsByDay.has(key),
    });
  }

  return days;
}

function mergeAppointmentLists(serverAppointments, localAppointments, patientEmail) {
  const merged = new Map();

  for (const appointment of serverAppointments) {
    merged.set(String(appointment._id), appointment);
  }

  for (const appointment of localAppointments) {
    if (patientEmail && appointment.patientEmail && appointment.patientEmail !== patientEmail) {
      continue;
    }
    merged.set(String(appointment._id), appointment);
  }

  return Array.from(merged.values()).sort(
    (left, right) => new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime(),
  );
}

function groupAppointmentsByDay(appointments) {
  const groups = new Map();
  for (const appointment of appointments) {
    const key = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(appointment.scheduledAt));
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(appointment);
  }
  return Array.from(groups.entries());
}

function createChatMessage(role, title, message) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    role,
    title,
    message,
    createdAt: new Date().toISOString(),
  };
}

function createWelcomeMessage() {
  return createChatMessage(
    'assistant',
    'Clinic Assistant',
    'Hello. Tell me what symptoms you are feeling, and I will suggest the right department and check whether we can book a slot for you today.',
  );
}

export default function AppointmentHub() {
  const { request, user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [telegramConnection, setTelegramConnection] = useState(null);
  const [telegramError, setTelegramError] = useState('');
  const [telegramNotice, setTelegramNotice] = useState('');
  const [isTelegramBusy, setIsTelegramBusy] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [assistantMessages, setAssistantMessages] = useState(() => [createWelcomeMessage()]);
  const [assistantResult, setAssistantResult] = useState(null);
  const [assistantError, setAssistantError] = useState('');
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState(initialBookingState);
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadHubData = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const [departmentResponse, doctorResponse, appointmentResponse, telegramResponse] = await Promise.all([
          loadDepartments(request, { publicView: true }),
          loadDoctors(request, { publicView: true }),
          loadMyAppointments(request),
          loadTelegramConnection(request).catch((error) => ({ error })),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        setDepartments(departmentResponse);
        setDoctors(doctorResponse);
        if (telegramResponse?.error) {
          setTelegramConnection(null);
          setTelegramError(getErrorMessage(telegramResponse.error, 'Telegram reminders are unavailable right now.'));
        } else {
          setTelegramConnection(telegramResponse);
          setTelegramError('');
        }

        const mergedAppointments = mergeAppointmentLists(
          appointmentResponse.items ?? [],
          getLocalBookingsSnapshot(),
          user?.email,
        );
        setAppointments(mergedAppointments);

        setBookingForm((current) => {
          if (current.departmentId && departmentResponse.some((item) => item._id === current.departmentId)) {
            return current;
          }

          const firstDepartment = departmentResponse[0];
          const firstDoctor =
            doctorResponse.find((doctor) => doctor.departmentId === firstDepartment?._id) ?? doctorResponse[0];

          return {
            ...current,
            departmentId: firstDepartment?._id ?? '',
            doctorId: firstDoctor?._id ?? '',
          };
        });
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }

        setLoadError(getErrorMessage(error, 'The appointment workspace could not be loaded.'));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadHubData();

    return () => {
      controller.abort();
    };
  }, [request, user?.email]);

  const selectedDepartment = useMemo(
    () => departments.find((department) => department._id === bookingForm.departmentId) ?? null,
    [bookingForm.departmentId, departments],
  );

  const departmentDoctors = useMemo(
    () => doctors.filter((doctor) => !bookingForm.departmentId || doctor.departmentId === bookingForm.departmentId),
    [bookingForm.departmentId, doctors],
  );

  const selectedDoctor = useMemo(
    () => departmentDoctors.find((doctor) => doctor._id === bookingForm.doctorId) ?? null,
    [bookingForm.doctorId, departmentDoctors],
  );

  const availableSlots = useMemo(
    () => availability.filter((slot) => !bookingForm.doctorId || slot.doctorId === bookingForm.doctorId),
    [availability, bookingForm.doctorId],
  );

  const calendarTimeZone = useMemo(
    () => availableSlots[0]?.timeZone ?? CALENDAR_TIMEZONE,
    [availableSlots],
  );

  const slotsByDay = useMemo(
    () => groupSlotsByDay(availableSlots, calendarTimeZone),
    [availableSlots, calendarTimeZone],
  );

  const calendarDays = useMemo(
    () => buildCalendarDays(slotsByDay, calendarTimeZone),
    [slotsByDay, calendarTimeZone],
  );

  const selectedDateSlots = useMemo(
    () => slotsByDay.get(selectedDateKey) ?? [],
    [selectedDateKey, slotsByDay],
  );

  const selectedCalendarDay = useMemo(
    () => calendarDays.find((day) => day.key === selectedDateKey) ?? null,
    [calendarDays, selectedDateKey],
  );

  useEffect(() => {
    if (!bookingForm.departmentId || departmentDoctors.length === 0) {
      return;
    }

    if (departmentDoctors.some((doctor) => doctor._id === bookingForm.doctorId)) {
      return;
    }

    setBookingForm((current) => ({
      ...current,
      doctorId: departmentDoctors[0]?._id ?? '',
      slotId: '',
    }));
  }, [bookingForm.departmentId, bookingForm.doctorId, departmentDoctors]);

  useEffect(() => {
    if (!bookingForm.departmentId) {
      setAvailability([]);
      return undefined;
    }

    const controller = new AbortController();
    setAvailability([]);
    setBookingError('');

    const loadSlots = async () => {
      try {
        const slots = await loadAvailability(request, {
          departmentId: bookingForm.departmentId,
          days: CALENDAR_DAY_COUNT,
        });

        if (!controller.signal.aborted) {
          setAvailability(slots);
          setBookingForm((current) => {
            if (!current.slotId || slots.some((slot) => slot.scheduledAt === current.slotId)) {
              return current;
            }

            return {
              ...current,
              slotId: '',
            };
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setBookingError(getErrorMessage(error, 'Appointment availability could not be loaded.'));
        }
      }
    };

    void loadSlots();

    return () => {
      controller.abort();
    };
  }, [bookingForm.departmentId, request]);

  const selectedSlot = useMemo(
    () => availableSlots.find((slot) => slot.scheduledAt === bookingForm.slotId) ?? null,
    [availableSlots, bookingForm.slotId],
  );

  useEffect(() => {
    if (selectedSlot) {
      const slotDateKey = getCalendarDateKey(selectedSlot.scheduledAt, selectedSlot.timeZone ?? calendarTimeZone);
      if (slotDateKey !== selectedDateKey) {
        setSelectedDateKey(slotDateKey);
      }
      return;
    }

    if (selectedDateKey && slotsByDay.has(selectedDateKey)) {
      return;
    }

    const firstAvailableDateKey = calendarDays.find((day) => day.hasSlots)?.key ?? calendarDays[0]?.key ?? '';
    if (firstAvailableDateKey !== selectedDateKey) {
      setSelectedDateKey(firstAvailableDateKey);
    }
  }, [calendarDays, calendarTimeZone, selectedDateKey, selectedSlot, slotsByDay]);

  const upcomingAppointments = useMemo(() => appointments.slice(0, 6), [appointments]);
  const appointmentGroups = useMemo(() => groupAppointmentsByDay(upcomingAppointments), [upcomingAppointments]);
  const latestAssistantReply = useMemo(
    () => [...assistantMessages].reverse().find((message) => message.role === 'assistant') ?? null,
    [assistantMessages],
  );

  useEffect(() => {
    if (!telegramConnection?.connectUrl || telegramConnection.connected) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void (async () => {
        try {
          const nextStatus = await loadTelegramConnection(request);
          setTelegramConnection(nextStatus);
          if (nextStatus.connected) {
            setTelegramNotice('Telegram is connected. Appointment reminders will be sent automatically.');
            setTelegramError('');
          }
        } catch (error) {
          setTelegramError(getErrorMessage(error, 'Telegram reminders are unavailable right now.'));
        }
      })();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [request, telegramConnection?.connectUrl, telegramConnection?.connected]);

  const resetAssistantWorkspace = () => {
    setAssistantPrompt('');
    setAssistantError('');
    setAssistantResult(null);
    setBookingError('');
    setBookingSuccess('');
    setAssistantMessages([createWelcomeMessage()]);
  };

  const refreshTelegramStatus = async ({ silent = false } = {}) => {
    if (!silent) {
      setIsTelegramBusy(true);
    }
    try {
      const nextStatus = await loadTelegramConnection(request);
      setTelegramConnection(nextStatus);
      setTelegramError('');
      if (!silent) {
        setTelegramNotice(
          nextStatus.connected
            ? 'Telegram is connected and ready for appointment reminders.'
            : 'Telegram status refreshed. Connect your account to enable reminders.',
        );
      }
    } catch (error) {
      setTelegramError(getErrorMessage(error, 'Telegram reminders are unavailable right now.'));
    } finally {
      if (!silent) {
        setIsTelegramBusy(false);
      }
    }
  };

  const handleTelegramConnect = async () => {
    setIsTelegramBusy(true);
    setTelegramError('');
    setTelegramNotice('');

    try {
      const nextStatus = await createTelegramConnection(request);
      setTelegramConnection(nextStatus);
      setTelegramNotice(
        nextStatus.connectUrl
          ? 'Telegram link is ready. Complete the connection inside Telegram, then come back here.'
          : 'Telegram start code is ready. Open your clinic bot and send the code shown below.',
      );

      if (nextStatus.connectUrl) {
        window.open(nextStatus.connectUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      setTelegramError(getErrorMessage(error, 'We could not generate a Telegram connection link.'));
    } finally {
      setIsTelegramBusy(false);
    }
  };

  const handleTelegramDisconnect = async () => {
    setIsTelegramBusy(true);
    setTelegramError('');
    setTelegramNotice('');

    try {
      const nextStatus = await disconnectTelegramConnection(request);
      setTelegramConnection(nextStatus);
      setTelegramNotice('Telegram reminders have been disconnected.');
    } catch (error) {
      setTelegramError(getErrorMessage(error, 'We could not disconnect Telegram right now.'));
    } finally {
      setIsTelegramBusy(false);
    }
  };

  const applyAssistantDepartment = () => {
    if (!assistantResult?.departmentId) {
      return;
    }

    setBookingForm((current) => ({
      ...current,
      departmentId: assistantResult.departmentId,
      doctorId: current.departmentId === assistantResult.departmentId ? current.doctorId : '',
      slotId: '',
    }));
  };

  const applyAssistantSlot = () => {
    const firstSlot = assistantResult?.slots?.[0];
    if (!firstSlot) {
      return;
    }

    setBookingForm((current) => ({
      ...current,
      departmentId: assistantResult?.departmentId ?? current.departmentId,
      doctorId: firstSlot.doctorId ?? current.doctorId,
      slotId: firstSlot.scheduledAt ?? current.slotId,
    }));
  };

  const handleSelectCalendarDate = (dateKey) => {
    if (!slotsByDay.has(dateKey)) {
      return;
    }

    setSelectedDateKey(dateKey);
    setBookingForm((current) => {
      const currentSlot = availableSlots.find((slot) => slot.scheduledAt === current.slotId);
      if (currentSlot) {
        const currentDateKey = getCalendarDateKey(currentSlot.scheduledAt, currentSlot.timeZone ?? calendarTimeZone);
        if (currentDateKey === dateKey) {
          return current;
        }
      }

      return {
        ...current,
        slotId: '',
      };
    });
  };

  const handleSelectSlot = (slot) => {
    setSelectedDateKey(getCalendarDateKey(slot.scheduledAt, slot.timeZone ?? calendarTimeZone));
    setBookingForm((current) => ({
      ...current,
      slotId: slot.scheduledAt,
      doctorId: slot.doctorId ?? current.doctorId,
    }));
    setBookingError('');
  };

  const handleRunAssistant = async (event) => {
    event.preventDefault();
    setIsAssistantOpen(true);
    const prompt = assistantPrompt.trim();

    if (!prompt) {
      setAssistantError('Please describe your symptoms first.');
      return;
    }

    setIsAssistantLoading(true);
    setAssistantError('');
    setAssistantPrompt('');

    const userMessage = createChatMessage('user', user?.displayName ?? user?.email ?? 'You', prompt);

    setAssistantMessages((current) => [...current, userMessage]);

    try {
      const result = await submitTriage(request, {
        message: prompt,
        departmentId: bookingForm.departmentId,
      });

      setAssistantResult(result);
      startTransition(() => {
        setBookingForm((current) => ({
          ...current,
          departmentId: result.departmentId ?? current.departmentId,
          doctorId: result.slots?.[0]?.doctorId ?? current.doctorId,
          slotId: result.slots?.[0]?.scheduledAt ?? current.slotId,
        }));
      });

      setAssistantMessages((current) => [
        ...current,
        createChatMessage(
          'assistant',
          result.departmentName ?? 'Clinic Assistant',
          result.assistantMessage ?? result.summary ?? 'I found a recommendation for you.',
        ),
      ]);
    } catch (error) {
      const message = getErrorMessage(error, 'The assistant could not review the symptoms right now.');
      setAssistantError(message);
      setAssistantMessages((current) => [...current, createChatMessage('assistant', 'Clinic Assistant', message)]);
    } finally {
      setIsAssistantLoading(false);
    }
  };

  const openBookingConfirmation = (event) => {
    event.preventDefault();
    setBookingError('');

    if (!bookingForm.departmentId || !bookingForm.doctorId || !bookingForm.slotId) {
      setBookingError('Please choose a department, doctor, and available slot first.');
      return;
    }

    if (!selectedSlot) {
      setBookingError('The selected slot is no longer available. Please pick another time.');
      return;
    }

    setPendingBooking({
      departmentId: bookingForm.departmentId,
      departmentName: selectedDepartment?.name ?? 'Department',
      doctorId: bookingForm.doctorId,
      doctorName: selectedDoctor?.displayName ?? 'Doctor',
      scheduledAt: bookingForm.slotId,
      reason: bookingForm.reason.trim(),
      slotLabel: selectedSlot.label ?? formatClinicTime(selectedSlot.scheduledAt),
    });
    setIsConfirmOpen(true);
  };

  const confirmBooking = async () => {
    if (!pendingBooking) {
      return;
    }

    setIsBookingSubmitting(true);
    setBookingError('');

    try {
      const appointment = await bookAppointment(request, {
        departmentId: pendingBooking.departmentId,
        doctorId: pendingBooking.doctorId,
        scheduledAt: pendingBooking.scheduledAt,
        reason: pendingBooking.reason,
        patientEmail: user?.email,
        patientName: user?.displayName ?? user?.email,
        durationMinutes: 30,
      });

      setBookingSuccess(
        `Appointment confirmed for ${formatClinicTime(appointment.scheduledAt)}.${telegramConnection?.connected ? ' Telegram reminders are active for this visit.' : ''}`,
      );
      setIsConfirmOpen(false);
      setPendingBooking(null);
      setBookingForm((current) => ({
        ...current,
        reason: '',
        slotId: '',
      }));

      const [nextAppointments, nextSlots] = await Promise.all([
        loadMyAppointments(request),
        loadAvailability(request, { departmentId: bookingForm.departmentId, days: CALENDAR_DAY_COUNT }),
      ]);

      setAppointments(
        mergeAppointmentLists(nextAppointments.items ?? [], getLocalBookingsSnapshot(), user?.email),
      );
      setAvailability(nextSlots);
    } catch (error) {
      setBookingError(getErrorMessage(error, 'The appointment could not be booked.'));
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col xl:flex-row xl:items-start gap-8">
        <div className="flex-1 min-w-0 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-bold">Patient Services</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Appointments and AI triage</h1>
              <p className="mt-2 text-slate-500 font-medium max-w-2xl">
                Describe your symptoms, get a department recommendation, and book the next available 30-minute slot
                without leaving this page.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => void window.location.reload()}
                className="px-5 py-2 rounded-2xl font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Refresh
              </button>
            </div>
          </div>

          {loadError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {loadError}
            </div>
          )}

          {isLoading && (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-500 shadow-sm">
              Loading appointment workspace...
            </div>
          )}

          {bookingSuccess && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {bookingSuccess}
            </div>
          )}

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Booking Snapshot</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Your next appointment</h2>
            <p className="mt-2 text-sm text-slate-500">
              Select a department, choose an active calendar slot, and confirm the booking in one step. Same-day
              bookings stay open until 30 minutes before the visit starts, and future visits can be reserved up to 30 days ahead.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Department</span>
                <select
                  value={bookingForm.departmentId}
                  onChange={(event) =>
                    setBookingForm((current) => ({
                      ...current,
                      departmentId: event.target.value,
                      doctorId: '',
                      slotId: '',
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose a department</option>
                  {departments.map((department) => (
                    <option key={department._id} value={department._id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Doctor</span>
                <select
                  value={bookingForm.doctorId}
                  onChange={(event) =>
                    setBookingForm((current) => ({
                      ...current,
                      doctorId: event.target.value,
                      slotId: '',
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose a doctor</option>
                  {departmentDoctors.map((doctor) => (
                    <option key={doctor._id} value={doctor._id}>
                      {doctor.displayName}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-700">Available Slot</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Tap an active date, then choose a time
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                  {calendarDays.map((day) => {
                    const isSelected = day.key === selectedDateKey;
                    return (
                      <button
                        key={day.key}
                        type="button"
                        disabled={!day.hasSlots}
                        onClick={() => handleSelectCalendarDate(day.key)}
                        className={`rounded-2xl border px-3 py-4 text-left transition-all ${
                          day.hasSlots
                            ? isSelected
                              ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-indigo-300 hover:bg-indigo-50'
                            : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                        }`}
                      >
                        <p className={`text-[11px] font-bold uppercase tracking-[0.22em] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {day.weekdayLabel}
                        </p>
                        <p className="mt-2 text-2xl font-bold">{day.dayNumber}</p>
                        <p className={`mt-1 text-xs font-semibold uppercase tracking-[0.2em] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {day.monthLabel}
                        </p>
                        <p className={`mt-3 text-xs font-medium ${day.hasSlots ? (isSelected ? 'text-indigo-100' : 'text-emerald-600') : 'text-slate-300'}`}>
                          {day.hasSlots ? 'Available' : 'Unavailable'}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedDateSlots.length > 0
                          ? `Available times for ${formatCalendarFullDate(selectedDateSlots[0].scheduledAt, selectedDateSlots[0].timeZone ?? calendarTimeZone)}`
                          : 'No active day selected'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Disabled days are fully booked or too close to the current time.
                      </p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {selectedCalendarDay?.hasSlots ? `${selectedDateSlots.length} open slot${selectedDateSlots.length === 1 ? '' : 's'}` : 'Choose an active date'}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {selectedDateSlots.map((slot) => {
                      const isSelected = bookingForm.slotId === slot.scheduledAt;
                      return (
                        <button
                          key={`${slot.doctorId}-${slot.scheduledAt}`}
                          type="button"
                          onClick={() => handleSelectSlot(slot)}
                          className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-indigo-300 hover:bg-indigo-50'
                          }`}
                        >
                          <p className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {formatSlotTime(slot.scheduledAt, slot.timeZone ?? calendarTimeZone)}
                          </p>
                          <p className={`mt-1 text-xs ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                            {slot.doctorName}
                          </p>
                        </button>
                      );
                    })}

                    {selectedDateSlots.length === 0 && (
                      <div className="w-full rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                        No bookable slots on this day yet. Choose another highlighted date.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Reason for Visit</span>
                <textarea
                  rows="4"
                  value={bookingForm.reason}
                  onChange={(event) =>
                    setBookingForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional note for the doctor..."
                />
              </label>

              {bookingError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {bookingError}
                </div>
              )}

              <button
                type="button"
                onClick={openBookingConfirmation}
                disabled={isPending}
                className="w-full rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                Review and Book
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current Selection</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{selectedDepartment?.name ?? 'No department chosen'}</p>
              <p className="mt-1 text-sm text-slate-600">{selectedDoctor?.displayName ?? 'No doctor chosen'}</p>
              <p className="mt-1 text-sm text-slate-600">{selectedSlot?.label ?? 'No slot chosen'}</p>
            </div>
          </div>
        </div>

        <aside className="xl:w-[26rem] shrink-0 space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Notifications</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Telegram reminders</h2>
            <p className="mt-2 text-sm text-slate-500">
              Connect once and receive three reminders for every booked visit: 1 day before, 8:00 AM on the visit day,
              and 30 minutes before the appointment.
            </p>

            {telegramError && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                {telegramError}
              </div>
            )}

            {telegramNotice && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {telegramNotice}
              </div>
            )}

            <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {telegramConnection?.connected ? 'Connected to Telegram' : 'Telegram not connected'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {telegramConnection?.connected
                  ? `${telegramConnection.telegramUsername ? `@${telegramConnection.telegramUsername}` : 'Telegram account linked'}${telegramConnection.telegramChatIdMasked ? ` • ${telegramConnection.telegramChatIdMasked}` : ''}`
                  : 'Generate a secure one-time link, open Telegram, and finish the bot handshake.'}
              </p>
              {telegramConnection?.telegramLinkedAt && (
                <p className="mt-2 text-xs font-medium text-slate-400">
                  Linked on {formatAppointmentTime(telegramConnection.telegramLinkedAt)}
                </p>
              )}
            </div>

            {telegramConnection?.connectCommand && !telegramConnection.connected && (
              <div className="mt-4 rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/60 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-500">One-Time Connect Code</p>
                <p className="mt-2 break-all rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 shadow-sm">
                  {telegramConnection.connectCommand}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Expires {formatTelegramExpiry(telegramConnection.connectExpiresAt)}
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleTelegramConnect()}
                disabled={isTelegramBusy}
                className="rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {telegramConnection?.connected ? 'Refresh Link' : 'Connect Telegram'}
              </button>
              <button
                type="button"
                onClick={() => void refreshTelegramStatus()}
                disabled={isTelegramBusy}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                Refresh Status
              </button>
              {telegramConnection?.connected && (
                <button
                  type="button"
                  onClick={() => void handleTelegramDisconnect()}
                  disabled={isTelegramBusy}
                  className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 font-bold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:text-red-300"
                >
                  Disconnect
                </button>
              )}
            </div>

            {telegramConnection?.botUsername && !telegramConnection.connected && (
              <p className="mt-3 text-xs text-slate-500">
                Telegram bot: @{telegramConnection.botUsername}
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sticky top-28">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Upcoming Visits</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">My appointments</h2>
            <p className="mt-2 text-sm text-slate-500">Your upcoming appointments are as follows:</p>

            <div className="mt-6 space-y-4">
              {appointmentGroups.map(([dayLabel, dayAppointments]) => (
                <div key={dayLabel}>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{dayLabel}</p>
                  <div className="mt-3 space-y-3">
                    {dayAppointments.map((appointment) => (
                      <div key={appointment._id} className="rounded-2xl border-slate-100 bg-slate-50 border p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{appointment.departmentName || appointment.reason || 'Appointment'}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {appointment.doctorName || 'Doctor unavailable'} • {appointment.status}
                            </p>
                          </div>
                          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                            {appointment.reference}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-slate-600">{formatAppointmentTime(appointment.scheduledAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {upcomingAppointments.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  No appointments yet. Use the assistant or booking form to reserve your first slot.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <FloatingAssistantWidget
        isOpen={isAssistantOpen}
        onToggle={() => setIsAssistantOpen((current) => !current)}
        onClose={() => setIsAssistantOpen(false)}
        onReset={resetAssistantWorkspace}
        assistantMessages={assistantMessages}
        assistantPrompt={assistantPrompt}
        onPromptChange={setAssistantPrompt}
        onSubmit={handleRunAssistant}
        assistantResult={assistantResult}
        assistantError={assistantError}
        isAssistantLoading={isAssistantLoading}
        onUseDepartment={applyAssistantDepartment}
        onAutoFillSlot={applyAssistantSlot}
      />

      <ModalPortal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
        <div className="mx-auto mt-8 max-w-2xl rounded-[2rem] bg-white p-8 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-bold">Confirm Appointment</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Review your booking</h2>
            </div>
            <button
              onClick={() => setIsConfirmOpen(false)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          {pendingBooking && (
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Department</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{pendingBooking.departmentName}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Doctor</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{pendingBooking.doctorName}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Time</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{pendingBooking.slotLabel}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Reason</p>
                <p className="mt-2 text-sm text-slate-700">{pendingBooking.reason || 'No reason added'}</p>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={() => void confirmBooking()}
                  disabled={isBookingSubmitting}
                  className="rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {isBookingSubmitting ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          )}
        </div>
      </ModalPortal>
    </div>
  );
}
