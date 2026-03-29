import { useEffect, useMemo, useState, useTransition } from 'react';
import ModalPortal from './ModalPortal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { isApiError } from '../lib/api.js';
import { loadTenants, loadUsers, saveTenant, saveUser } from '../lib/clinicApi.js';

const defaultTenantForm = {
  name: '',
  slug: '',
  code: '',
  status: 'active',
  contactEmail: '',
  contactPhone: '',
  address: '',
  timezone: 'Asia/Bangkok',
};

const defaultUserForm = {
  displayName: '',
  email: '',
  password: '',
  role: 'clinic_admin',
  tenantId: '',
};

const USER_ROLE_OPTIONS = ['platform_admin', 'clinic_admin', 'doctor', 'pharmacist', 'receptionist', 'cashier', 'staff', 'patient'];

function getErrorMessage(error, fallbackMessage) {
  return isApiError(error) ? error.message : fallbackMessage;
}

function buildTenantPayload(form, editingTenant) {
  return {
    _id: editingTenant?._id,
    name: form.name.trim(),
    slug: form.slug.trim().toLowerCase(),
    code: form.code.trim().toUpperCase(),
    status: form.status,
    contactEmail: form.contactEmail.trim(),
    contactPhone: form.contactPhone.trim(),
    address: form.address.trim(),
    timezone: form.timezone.trim(),
  };
}

export default function PlatformAdminConsole() {
  const { request } = useAuth();
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('clinics');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tenants, setTenants] = useState([]);
  const [users, setUsers] = useState([]);
  const [tenantFilter, setTenantFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [tenantForm, setTenantForm] = useState(defaultTenantForm);
  const [editingTenant, setEditingTenant] = useState(null);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [tenantError, setTenantError] = useState('');
  const [isTenantSaving, setIsTenantSaving] = useState(false);
  const [userForm, setUserForm] = useState(defaultUserForm);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userError, setUserError] = useState('');
  const [isUserSaving, setIsUserSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadConsole = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const [tenantResponse, userResponse] = await Promise.all([
          loadTenants(request),
          loadUsers(request, { pageSize: 200 }),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        setTenants(tenantResponse);
        setUsers(userResponse.items ?? []);
        setUserForm((current) => ({
          ...current,
          tenantId: current.tenantId || tenantResponse[0]?._id || '',
        }));
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }

        setLoadError(getErrorMessage(error, 'The platform administration console could not be loaded.'));
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

  const tenantLookup = useMemo(
    () => new Map(tenants.map((tenant) => [tenant._id, tenant])),
    [tenants],
  );

  const summary = useMemo(
    () => ({
      clinics: tenants.length,
      activeClinics: tenants.filter((tenant) => tenant.status === 'active').length,
      users: users.length,
      clinicAdmins: users.filter((user) => user.role === 'clinic_admin').length,
    }),
    [tenants, users],
  );

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    return users.filter((user) => {
      if (tenantFilter && user.tenantId !== tenantFilter) {
        return false;
      }
      if (roleFilter && user.role !== roleFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }

      return [user.displayName, user.email, user.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [roleFilter, searchValue, tenantFilter, users]);

  const openCreateTenant = () => {
    setEditingTenant(null);
    setTenantForm(defaultTenantForm);
    setTenantError('');
    setIsTenantModalOpen(true);
  };

  const openEditTenant = (tenant) => {
    setEditingTenant(tenant);
    setTenantForm({
      name: tenant.name ?? '',
      slug: tenant.slug ?? '',
      code: tenant.code ?? '',
      status: tenant.status ?? 'active',
      contactEmail: tenant.contactEmail ?? '',
      contactPhone: tenant.contactPhone ?? '',
      address: tenant.address ?? '',
      timezone: tenant.timezone ?? 'Asia/Bangkok',
    });
    setTenantError('');
    setIsTenantModalOpen(true);
  };

  const handleSaveTenant = async (event) => {
    event.preventDefault();
    setIsTenantSaving(true);
    setTenantError('');

    try {
      const savedTenant = await saveTenant(request, buildTenantPayload(tenantForm, editingTenant));
      setTenants((current) => {
        if (editingTenant) {
          return current.map((tenant) => (tenant._id === savedTenant._id ? savedTenant : tenant));
        }
        return [savedTenant, ...current];
      });
      setIsTenantModalOpen(false);
    } catch (error) {
      setTenantError(getErrorMessage(error, 'The clinic could not be saved.'));
    } finally {
      setIsTenantSaving(false);
    }
  };

  const openCreateUser = () => {
    setUserForm({
      ...defaultUserForm,
      tenantId: tenants[0]?._id ?? '',
    });
    setUserError('');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (event) => {
    event.preventDefault();
    setIsUserSaving(true);
    setUserError('');

    if (userForm.role !== 'platform_admin' && !userForm.tenantId) {
      setUserError('Choose a clinic before creating this user.');
      setIsUserSaving(false);
      return;
    }

    try {
      const createdUser = await saveUser(request, {
        displayName: userForm.displayName.trim(),
        email: userForm.email.trim().toLowerCase(),
        password: userForm.password,
        role: userForm.role,
        tenantId: userForm.role === 'platform_admin' ? undefined : userForm.tenantId,
      });
      setUsers((current) => [createdUser, ...current]);
      setIsUserModalOpen(false);
    } catch (error) {
      setUserError(getErrorMessage(error, 'The user account could not be created.'));
    } finally {
      setIsUserSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-bold">DCMS Platform Admin</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Clinics, tenants, and access control</h1>
          <p className="mt-2 text-slate-500 font-medium max-w-2xl">
            Manage clinic tenants across the platform and provision user accounts for each organization from one
            workspace.
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
            onClick={openCreateTenant}
            className="rounded-2xl bg-slate-900 px-5 py-2 font-bold text-white shadow-lg hover:bg-slate-800"
          >
            + Add Clinic
          </button>
          <button
            onClick={openCreateUser}
            className="rounded-2xl bg-indigo-600 px-5 py-2 font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
          >
            + Add User
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
          Loading platform administration data...
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Clinics</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">{summary.clinics}</h2>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Active Clinics</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">{summary.activeClinics}</h2>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Users</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">{summary.users}</h2>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Clinic Admins</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">{summary.clinicAdmins}</h2>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {[
            { key: 'clinics', label: 'Clinics' },
            { key: 'users', label: 'Users' },
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

      {activeTab === 'clinics' && (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tenants.map((tenant) => (
            <article key={tenant._id} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-2xl bg-slate-900 px-3 text-sm font-bold text-white">
                      {tenant.code || tenant.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{tenant.name}</h3>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{tenant.slug}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-500">
                    <p>{tenant.contactEmail || 'No contact email'}</p>
                    <p>{tenant.contactPhone || 'No contact phone'}</p>
                    <p>{tenant.timezone || 'Asia/Bangkok'}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    tenant.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tenant.status}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-500">{tenant.address || 'No address saved yet.'}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => openEditTenant(tenant)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Edit Clinic
                </button>
                <span className="rounded-2xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
                  {users.filter((user) => user.tenantId === tenant._id).length} users
                </span>
              </div>
            </article>
          ))}

          {tenants.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
              No clinic tenants are available yet.
            </div>
          )}
        </section>
      )}

      {activeTab === 'users' && (
        <section className="mt-6 space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr_0.8fr_auto]">
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search by name, email, or role..."
                className="rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={tenantFilter}
                onChange={(event) => setTenantFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All clinics</option>
                {tenants.map((tenant) => (
                  <option key={tenant._id} value={tenant._id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All roles</option>
                {USER_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role.replace('_', ' ')}
                  </option>
                ))}
              </select>
              <button
                onClick={openCreateUser}
                className="rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700"
              >
                + Create User
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Email</th>
                    <th className="p-4 font-semibold">Role</th>
                    <th className="p-4 font-semibold">Clinic</th>
                    <th className="p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((user) => (
                    <tr key={user._id}>
                      <td className="p-4">
                        <p className="font-semibold text-slate-900">{user.displayName}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                          {user.lastLoginAt ? `Last login ${new Date(user.lastLoginAt).toLocaleDateString()}` : 'No recent login'}
                        </p>
                      </td>
                      <td className="p-4 text-slate-600">{user.email}</td>
                      <td className="p-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">
                        {tenantLookup.get(user.tenantId)?.name ?? (user.role === 'platform_admin' ? 'Platform' : 'Unassigned')}
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {user.isActive ? 'active' : 'inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-500">
                        No users matched the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <ModalPortal isOpen={isTenantModalOpen} onClose={() => setIsTenantModalOpen(false)}>
        <div className="mx-auto mt-8 max-w-3xl rounded-[2rem] bg-white p-8 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-bold">
                {editingTenant ? 'Edit Clinic' : 'New Clinic'}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                {editingTenant ? 'Update tenant details' : 'Create a new clinic tenant'}
              </h2>
            </div>
            <button
              onClick={() => setIsTenantModalOpen(false)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSaveTenant}>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Clinic Name</span>
                <input
                  required
                  value={tenantForm.name}
                  onChange={(event) => setTenantForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Slug</span>
                <input
                  required
                  value={tenantForm.slug}
                  onChange={(event) => setTenantForm((current) => ({ ...current, slug: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Code</span>
                <input
                  required
                  value={tenantForm.code}
                  onChange={(event) => setTenantForm((current) => ({ ...current, code: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Status</span>
                <select
                  value={tenantForm.status}
                  onChange={(event) => setTenantForm((current) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Timezone</span>
                <input
                  value={tenantForm.timezone}
                  onChange={(event) => setTenantForm((current) => ({ ...current, timezone: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Contact Email</span>
                <input
                  type="email"
                  value={tenantForm.contactEmail}
                  onChange={(event) => setTenantForm((current) => ({ ...current, contactEmail: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Contact Phone</span>
                <input
                  value={tenantForm.contactPhone}
                  onChange={(event) => setTenantForm((current) => ({ ...current, contactPhone: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Address</span>
              <textarea
                rows="3"
                value={tenantForm.address}
                onChange={(event) => setTenantForm((current) => ({ ...current, address: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            {tenantError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {tenantError}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsTenantModalOpen(false)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isTenantSaving}
                className="rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {isTenantSaving ? 'Saving...' : 'Save Clinic'}
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      <ModalPortal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)}>
        <div className="mx-auto mt-8 max-w-2xl rounded-[2rem] bg-white p-8 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-bold">New User</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Create a platform or clinic account</h2>
            </div>
            <button
              onClick={() => setIsUserModalOpen(false)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSaveUser}>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Display Name</span>
              <input
                required
                value={userForm.displayName}
                onChange={(event) => setUserForm((current) => ({ ...current, displayName: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Email</span>
                <input
                  required
                  type="email"
                  value={userForm.email}
                  onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Temporary Password</span>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={userForm.password}
                  onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Role</span>
                <select
                  value={userForm.role}
                  onChange={(event) =>
                    setUserForm((current) => ({
                      ...current,
                      role: event.target.value,
                      tenantId: event.target.value === 'platform_admin' ? '' : current.tenantId || tenants[0]?._id || '',
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {USER_ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">Clinic</span>
                <select
                  value={userForm.tenantId}
                  disabled={userForm.role === 'platform_admin'}
                  onChange={(event) => setUserForm((current) => ({ ...current, tenantId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">{userForm.role === 'platform_admin' ? 'Platform-wide account' : 'Choose clinic'}</option>
                  {tenants.map((tenant) => (
                    <option key={tenant._id} value={tenant._id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {userError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {userError}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUserSaving}
                className="rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {isUserSaving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>
    </div>
  );
}
