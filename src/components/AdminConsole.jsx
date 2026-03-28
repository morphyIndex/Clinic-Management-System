import { useEffect, useMemo, useState, useTransition } from 'react';
import ModalPortal from './ModalPortal.jsx';
import PlatformAdminConsole from './PlatformAdminConsole.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { isApiError } from '../lib/api.js';
import {
  assignDoctorToDepartment,
  getWorkingDaysLabel,
  loadDepartments,
  loadDoctors,
  loadSchedules,
  removeDepartment,
  saveDepartment,
  saveWeeklyAvailability,
  toMinutes,
  toTimeString,
} from '../lib/clinicApi.js';

const dayOptions = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const defaultDepartmentForm = {
  name: '',
  code: '',
  description: '',
  color: '#4f46e5',
};

const defaultScheduleForm = {
  doctorId: '',
  workDays: [1, 2, 3, 4, 5],
  timezone: 'Asia/Bangkok',
  dayStart: '09:00',
  lunchStart: '12:00',
  lunchEnd: '13:00',
  dayEnd: '17:00',
  slotDurationMinutes: 30,
};

function getErrorMessage(error, fallbackMessage) {
  return isApiError(error) ? error.message : fallbackMessage;
}

function buildScheduleBlocks(scheduleForm) {
  const startMinute = toMinutes(scheduleForm.dayStart);
  const lunchStart = toMinutes(scheduleForm.lunchStart);
  const lunchEnd = toMinutes(scheduleForm.lunchEnd);
  const endMinute = toMinutes(scheduleForm.dayEnd);
  const slotDurationMinutes = Number(scheduleForm.slotDurationMinutes);

  if (
    startMinute === null ||
    endMinute === null ||
    Number.isNaN(slotDurationMinutes) ||
    slotDurationMinutes !== 30
  ) {
    throw new Error('Please use valid 30-minute schedule times.');
  }

  if (startMinute >= endMinute) {
    throw new Error('The workday end time must be after the start time.');
  }

  const blocks = [];
  const lunchIsValid = Number.isFinite(lunchStart) && Number.isFinite(lunchEnd) && lunchStart < lunchEnd;

  if (lunchIsValid && lunchStart > startMinute) {
    blocks.push({ startMinute, endMinute: lunchStart });
  }

  if (lunchIsValid && lunchEnd < endMinute) {
    blocks.push({ startMinute: lunchEnd, endMinute });
  }

  if (!lunchIsValid) {
    blocks.push({ startMinute, endMinute });
  }

  return blocks.filter((block) => block.endMinute > block.startMinute);
}

function initialDepartmentFromForm(form, editingDepartment) {
  return editingDepartment
    ? {
        _id: editingDepartment._id,
        name: form.name,
        code: form.code,
        description: form.description,
        color: form.color,
      }
    : {
        name: form.name,
        code: form.code,
        description: form.description,
        color: form.color,
      };
}

function getDepartmentBadgeLabel(department) {
  const rawValue = String(department?.code || department?.name || 'DP').trim().toUpperCase();
  const tokens = rawValue.split(/[^A-Z0-9]+/).filter(Boolean);

  if (tokens.length >= 2) {
    return `${tokens[0][0] ?? ''}${tokens[1][0] ?? ''}`.slice(0, 2);
  }

  const compact = rawValue.replace(/[^A-Z0-9]/g, '');
  return compact.slice(0, 2) || 'DP';
}

function ClinicAdminConsole() {
  const { request } = useAuth();
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('departments');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [departmentForm, setDepartmentForm] = useState(defaultDepartmentForm);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [departmentError, setDepartmentError] = useState('');
  const [isDepartmentSaving, setIsDepartmentSaving] = useState(false);
  const [departmentDrafts, setDepartmentDrafts] = useState({});
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(defaultScheduleForm);
  const [scheduleError, setScheduleError] = useState('');
  const [isScheduleSaving, setIsScheduleSaving] = useState(false);
  const [scheduleDoctorFilter, setScheduleDoctorFilter] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const loadConsole = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const [departmentResponse, doctorResponse, scheduleResponse] = await Promise.all([
          loadDepartments(request, { publicView: false }),
          loadDoctors(request, { publicView: false }),
          loadSchedules(request),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        setDepartments(departmentResponse);
        setDoctors(doctorResponse);
        setSchedules(scheduleResponse);
        setDepartmentDrafts(
          doctorResponse.reduce((acc, doctor) => {
            acc[doctor._id] = doctor.departmentId ?? '';
            return acc;
          }, {}),
        );
        setScheduleForm((current) => ({
          ...current,
          doctorId: doctorResponse[0]?._id ?? '',
        }));
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }

        setLoadError(getErrorMessage(error, 'The clinic administration console could not be loaded.'));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadConsole();

    return () => {
      controller.abort();
    };
  }, [request]);

  const summary = useMemo(
    () => ({
      departments: departments.length,
      doctors: doctors.length,
      schedules: schedules.length,
      assignedDoctors: doctors.filter((doctor) => Boolean(doctor.departmentId)).length,
    }),
    [departments.length, doctors, schedules.length],
  );

  const selectedDoctorForSchedules = useMemo(
    () => doctors.find((doctor) => doctor._id === scheduleForm.doctorId) ?? null,
    [doctors, scheduleForm.doctorId],
  );

  const groupedSchedules = useMemo(() => {
    const filtered = scheduleDoctorFilter ? schedules.filter((schedule) => schedule.doctorId === scheduleDoctorFilter) : schedules;
    return filtered.slice().sort((left, right) => {
      if (left.doctorId === right.doctorId) {
        return left.dayOfWeek - right.dayOfWeek || left.startMinute - right.startMinute;
      }
      return String(left.doctorId).localeCompare(String(right.doctorId));
    });
  }, [scheduleDoctorFilter, schedules]);

  const openCreateDepartment = () => {
    setEditingDepartment(null);
    setDepartmentForm(defaultDepartmentForm);
    setDepartmentError('');
    setIsDepartmentModalOpen(true);
  };

  const openEditDepartment = (department) => {
    setEditingDepartment(department);
    setDepartmentForm({
      name: department.name ?? '',
      code: department.code ?? '',
      description: department.description ?? '',
      color: department.color ?? '#4f46e5',
    });
    setDepartmentError('');
    setIsDepartmentModalOpen(true);
  };

  const handleSaveDepartment = async (event) => {
    event.preventDefault();
    setIsDepartmentSaving(true);
    setDepartmentError('');

    try {
      const savedDepartment = await saveDepartment(
        request,
        initialDepartmentFromForm(departmentForm, editingDepartment),
      );

      setDepartments((current) => {
        if (editingDepartment) {
          return current.map((item) => (item._id === savedDepartment._id ? savedDepartment : item));
        }
        return [...current, savedDepartment];
      });

      setIsDepartmentModalOpen(false);
    } catch (error) {
      setDepartmentError(getErrorMessage(error, 'The department could not be saved.'));
    } finally {
      setIsDepartmentSaving(false);
    }
  };

  const handleDeleteDepartment = async (departmentId) => {
    if (!window.confirm('Delete this department? Assigned doctors will be cleared.')) {
      return;
    }

    try {
      await removeDepartment(request, departmentId);
      setDepartments((current) => current.filter((item) => item._id !== departmentId));
      setDoctors((current) =>
        current.map((doctor) => (doctor.departmentId === departmentId ? { ...doctor, departmentId: null } : doctor)),
      );
    } catch (error) {
      setLoadError(getErrorMessage(error, 'The department could not be removed.'));
    }
  };

  const handleSaveDoctorAssignment = async (doctorId) => {
    const departmentId = departmentDrafts[doctorId] ?? '';
    if (!departmentId) {
      setLoadError('Choose a department before saving the assignment.');
      return;
    }

    try {
      await assignDoctorToDepartment(request, { doctorId, departmentId });
      const selectedDepartment = departments.find((item) => item._id === departmentId);
      setDoctors((current) =>
        current.map((doctor) =>
          doctor._id === doctorId
            ? {
                ...doctor,
                departmentId,
                departmentName: selectedDepartment?.name ?? doctor.departmentName ?? '',
              }
            : doctor,
        ),
      );
    } catch (error) {
      setLoadError(getErrorMessage(error, 'The doctor assignment could not be saved.'));
    }
  };

  const handleCreateSchedule = async (event) => {
    event.preventDefault();
    setIsScheduleSaving(true);
    setScheduleError('');

    try {
      const blocks = buildScheduleBlocks(scheduleForm);
      if (!scheduleForm.doctorId) {
        throw new Error('Choose a doctor before saving the schedule.');
      }
      if (!scheduleForm.workDays.length) {
        throw new Error('Choose at least one working day.');
      }

      const createdSchedules = await saveWeeklyAvailability(request, {
        doctorId: scheduleForm.doctorId,
        workDays: scheduleForm.workDays,
        blocks,
        slotDurationMinutes: scheduleForm.slotDurationMinutes,
        timezone: scheduleForm.timezone,
      });
      setSchedules((current) => [
        ...current.filter((schedule) => schedule.doctorId !== scheduleForm.doctorId),
        ...createdSchedules,
      ]);
      setIsScheduleModalOpen(false);
    } catch (error) {
      setScheduleError(
        error instanceof Error ? error.message : getErrorMessage(error, 'The schedule could not be created.'),
      );
    } finally {
      setIsScheduleSaving(false);
    }
  };

  const toggleDay = (dayOfWeek) => {
    setScheduleForm((current) => {
      const hasDay = current.workDays.includes(dayOfWeek);
      return {
        ...current,
        workDays: hasDay ? current.workDays.filter((day) => day !== dayOfWeek) : [...current.workDays, dayOfWeek],
      };
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-bold">Clinic Administration</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Departments, doctors, and schedules</h1>
          <p className="mt-2 text-slate-500 font-medium max-w-2xl">
            Manage service lines, assign doctors, and build 30-minute schedules that leave lunch blocks out of the
            calendar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-2 font-bold text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
          <button
            onClick={openCreateDepartment}
            className="rounded-2xl bg-indigo-600 px-5 py-2 font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
          >
            + Add Department
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      {isLoading && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-500 shadow-sm">
          Loading administration data...
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Departments</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">{summary.departments}</h2>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Doctors</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">{summary.doctors}</h2>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Scheduled Blocks</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">{summary.schedules}</h2>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Assigned Doctors</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">{summary.assignedDoctors}</h2>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {[
            { key: 'departments', label: 'Departments' },
            { key: 'doctors', label: 'Doctors' },
            { key: 'schedules', label: 'Schedules' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => startTransition(() => setActiveTab(tab.key))}
              className={`rounded-2xl px-5 py-3 text-sm font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'departments' && (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => {
            const assignedCount = doctors.filter((doctor) => doctor.departmentId === department._id).length;

            return (
              <article key={department._id} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white font-bold"
                        style={{ backgroundColor: department.color ?? '#4f46e5' }}
                      >
                        {getDepartmentBadgeLabel(department)}
                      </span>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{department.name}</h3>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{department.code || 'Dept'}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-500">{department.description}</p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                    {assignedCount} doctors
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => openEditDepartment(department)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => void handleDeleteDepartment(department._id)}
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}

          {departments.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
              No departments are available yet.
            </div>
          )}
        </section>
      )}

      {activeTab === 'doctors' && (
        <section className="mt-6 space-y-4">
          {doctors.map((doctor) => (
            <article key={doctor._id} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{doctor.displayName}</h3>
                  <p className="mt-1 text-sm text-slate-500">{doctor.email}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {doctor.specialty || 'Specialty unavailable'} • {doctor.departmentName || 'Unassigned'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={departmentDrafts[doctor._id] ?? ''}
                    onChange={(event) =>
                      setDepartmentDrafts((current) => ({
                        ...current,
                        [doctor._id]: event.target.value,
                      }))
                    }
                    className="min-w-64 rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Choose department</option>
                    {departments.map((department) => (
                      <option key={department._id} value={department._id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => void handleSaveDoctorAssignment(doctor._id)}
                    className="rounded-2xl bg-indigo-600 px-4 py-3 font-bold text-white hover:bg-indigo-700"
                  >
                    Save Assignment
                  </button>
                </div>
              </div>
            </article>
          ))}

          {doctors.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
              No doctors are available yet.
            </div>
          )}
        </section>
      )}

      {activeTab === 'schedules' && (
        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Doctor schedules</h2>
                <p className="mt-2 text-sm text-slate-500">Working blocks are already stored as 30-minute appointment windows.</p>
              </div>
              <button
                onClick={() => {
                  setScheduleError('');
                  setIsScheduleModalOpen(true);
                }}
                className="rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
              >
                + Add Schedule
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <select
                value={scheduleDoctorFilter}
                onChange={(event) => setScheduleDoctorFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All doctors</option>
                {doctors.map((doctor) => (
                  <option key={doctor._id} value={doctor._id}>
                    {doctor.displayName}
                  </option>
                ))}
              </select>
              <span className="text-sm font-medium text-slate-500">Schedule rows: {groupedSchedules.length}</span>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-4 font-semibold">Doctor</th>
                    <th className="p-4 font-semibold">Day</th>
                    <th className="p-4 font-semibold">Time</th>
                    <th className="p-4 font-semibold">Slot</th>
                    <th className="p-4 font-semibold">Timezone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {groupedSchedules.map((schedule) => {
                    const doctor = doctors.find((item) => item._id === schedule.doctorId);
                    return (
                      <tr key={schedule._id}>
                        <td className="p-4 font-semibold text-slate-900">{doctor?.displayName ?? schedule.doctorId}</td>
                        <td className="p-4 text-slate-600">{dayOptions[schedule.dayOfWeek]?.label ?? schedule.dayOfWeek}</td>
                        <td className="p-4 text-slate-600">
                          {toTimeString(schedule.startMinute)} - {toTimeString(schedule.endMinute)}
                        </td>
                        <td className="p-4 text-slate-600">{schedule.slotDurationMinutes} min</td>
                        <td className="p-4 text-slate-600">{schedule.timezone || 'Asia/Bangkok'}</td>
                      </tr>
                    );
                  })}

                  {groupedSchedules.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-500">
                        No schedules have been created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Scheduling guidance</h3>
            <div className="mt-4 space-y-4 text-sm text-slate-600 leading-6">
              <p>Use one schedule block for the morning and one for the afternoon if lunch breaks need to be excluded.</p>
              <p>All slots are created in 30-minute intervals, which keeps the booking screen simple for patients.</p>
              <p>Weekend availability can be added by selecting Saturday or Sunday in the schedule form.</p>
            </div>
          </div>
        </section>
      )}

      <ModalPortal isOpen={isDepartmentModalOpen} onClose={() => setIsDepartmentModalOpen(false)}>
        <div className="mx-auto mt-8 max-w-2xl rounded-[2rem] bg-white p-8 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-bold">
                {editingDepartment ? 'Edit Department' : 'New Department'}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                {editingDepartment ? 'Update department details' : 'Create a new department'}
              </h2>
            </div>
            <button
              onClick={() => setIsDepartmentModalOpen(false)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSaveDepartment}>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Name</span>
                <input
                  required
                  value={departmentForm.name}
                  onChange={(event) => setDepartmentForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Code</span>
                <input
                  required
                  value={departmentForm.code}
                  onChange={(event) => setDepartmentForm((current) => ({ ...current, code: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Description</span>
              <textarea
                rows="4"
                value={departmentForm.description}
                onChange={(event) => setDepartmentForm((current) => ({ ...current, description: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Accent Color</span>
              <input
                type="color"
                value={departmentForm.color}
                onChange={(event) => setDepartmentForm((current) => ({ ...current, color: event.target.value }))}
                className="h-12 w-20 rounded-xl border border-slate-200 bg-white px-2 py-1"
              />
            </label>

            {departmentError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {departmentError}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDepartmentModalOpen(false)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDepartmentSaving}
                className="rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {isDepartmentSaving ? 'Saving...' : 'Save Department'}
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      <ModalPortal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)}>
        <div className="mx-auto mt-8 max-w-3xl rounded-[2rem] bg-white p-8 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-bold">New Schedule</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Create 30-minute work blocks</h2>
            </div>
            <button
              onClick={() => setIsScheduleModalOpen(false)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleCreateSchedule}>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Doctor</span>
                <select
                  value={scheduleForm.doctorId}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, doctorId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose a doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor._id} value={doctor._id}>
                      {doctor.displayName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Timezone</span>
                <input
                  value={scheduleForm.timezone}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, timezone: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>

            <div className="space-y-3">
              <span className="text-sm font-bold text-slate-700">Working Days</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {dayOptions.map((day) => (
                  <label
                    key={day.value}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={scheduleForm.workDays.includes(day.value)}
                      onChange={() => toggleDay(day.value)}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Day Start</span>
                <input
                  type="time"
                  step={1800}
                  value={scheduleForm.dayStart}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, dayStart: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Lunch Start</span>
                <input
                  type="time"
                  step={1800}
                  value={scheduleForm.lunchStart}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, lunchStart: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Lunch End</span>
                <input
                  type="time"
                  step={1800}
                  value={scheduleForm.lunchEnd}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, lunchEnd: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Day End</span>
                <input
                  type="time"
                  step={1800}
                  value={scheduleForm.dayEnd}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, dayEnd: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-600">
              {selectedDoctorForSchedules ? (
                <p>
                  {selectedDoctorForSchedules.displayName} will receive {scheduleForm.slotDurationMinutes}-minute slots on{' '}
                  {getWorkingDaysLabel(scheduleForm.workDays)}.
                </p>
              ) : (
                <p>Select a doctor to see the schedule preview.</p>
              )}
            </div>

            {scheduleError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {scheduleError}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isScheduleSaving}
                className="rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {isScheduleSaving ? 'Saving...' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>
    </div>
  );
}

export default function AdminConsole() {
  const { user } = useAuth();

  if (user?.role === 'platform_admin') {
    return <PlatformAdminConsole />;
  }

  return <ClinicAdminConsole />;
}
