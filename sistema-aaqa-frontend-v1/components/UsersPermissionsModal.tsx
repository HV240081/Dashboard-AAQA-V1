import React, { useEffect, useMemo, useState } from 'react';
import { X, RefreshCw, ShieldCheck, UserPlus, Save, Trash2, PauseCircle, PlayCircle, Plus, PencilLine } from 'lucide-react';

type PermissionArea = 'ONG' | 'Community' | 'FIS' | 'Cortes';

interface RolePermission {
  area: PermissionArea;
  canView: boolean;
  canEdit: boolean;
  canUploadProjects: boolean;
  canUploadTracking: boolean;
  canDelete: boolean;
}

interface CustomRole {
  id: number;
  name: string;
  description: string;
  isReadOnly: boolean;
  active: boolean;
  permissions: RolePermission[];
}

interface ManagedUser {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rolId: number;
  roleName: string;
  active: boolean;
  isCustom: boolean;
  customRoleId: number | null;
  canDelete: boolean;
}

interface UsersPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AREAS: { key: PermissionArea; label: string }[] = [
  { key: 'ONG', label: 'ONG' },
  { key: 'Community', label: 'Desarrollo Comunitario' },
  { key: 'FIS', label: 'Emprendimiento Social' },
  { key: 'Cortes', label: 'Cortes Formativas / ADESCOS' },
];

const emptyPermissions = (): RolePermission[] =>
  AREAS.map((area) => ({
    area: area.key,
    canView: false,
    canEdit: false,
    canUploadProjects: false,
    canUploadTracking: false,
    canDelete: false,
  }));

const getToken = () => localStorage.getItem('access_token') || '';

const apiRequest = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(`http://localhost:3000${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || 'No se pudo completar la acción.');
  }
  return data;
};

const UsersPermissionsModal: React.FC<UsersPermissionsModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    isReadOnly: false,
    permissions: emptyPermissions(),
  });

  const [userForm, setUserForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    customRoleId: '',
  });

  const customRoleOptions = useMemo(() => roles.filter((role) => role.active), [roles]);

  const loadData = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const data = await apiRequest('/users/permissions/management');
      setUsers(data.users || []);
      setRoles(data.customRoles || []);
    } catch (error: any) {
      setMessage(error.message || 'No se pudieron cargar los usuarios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const updatePermission = (area: PermissionArea, field: keyof RolePermission, value: boolean) => {
    setRoleForm((prev) => {
      const nextPermissions = prev.permissions.map((permission) => {
        if (permission.area !== area) return permission;
        const next = { ...permission, [field]: value };
        if (field !== 'canView' && value) next.canView = true;
        if (field === 'canView' && !value) {
          next.canEdit = false;
          next.canUploadProjects = false;
          next.canUploadTracking = false;
          next.canDelete = false;
        }
        if (prev.isReadOnly) {
          next.canEdit = false;
          next.canUploadProjects = false;
          next.canUploadTracking = false;
          next.canDelete = false;
        }
        return next;
      });
      return { ...prev, permissions: nextPermissions };
    });
  };

  const toggleAreaPermission = (area: PermissionArea, checked: boolean) => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.map((permission) => {
        if (permission.area !== area) return permission;
        return {
          ...permission,
          canView: checked,
          canEdit: checked && !prev.isReadOnly,
          canUploadProjects: checked && !prev.isReadOnly,
          canUploadTracking: checked && !prev.isReadOnly,
          canDelete: checked && !prev.isReadOnly,
        };
      }),
    }));
  };

  const handleReadOnlyChange = (checked: boolean) => {
    setRoleForm((prev) => ({
      ...prev,
      isReadOnly: checked,
      permissions: prev.permissions.map((permission) => ({
        ...permission,
        canView: checked ? false : permission.canView,
        canEdit: checked ? false : permission.canEdit,
        canUploadProjects: checked ? false : permission.canUploadProjects,
        canUploadTracking: checked ? false : permission.canUploadTracking,
        canDelete: checked ? false : permission.canDelete,
      })),
    }));
  };

  const getRolePermissionsForForm = (role: CustomRole) => {
    return emptyPermissions().map((permission) => {
      const existing = role.permissions.find((item) => item.area === permission.area);
      return existing ? { ...permission, ...existing } : permission;
    });
  };

  const resetRoleForm = () => {
    setEditingRoleId(null);
    setRoleForm({
      name: '',
      description: '',
      isReadOnly: false,
      permissions: emptyPermissions(),
    });
  };

  const resetUserForm = () => {
    setUserForm({
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      customRoleId: '',
    });
  };

  const handleEditRole = (role: CustomRole) => {
    setEditingRoleId(role.id);
    setRoleForm({
      name: role.name,
      description: role.description || '',
      isReadOnly: role.isReadOnly,
      permissions: getRolePermissionsForForm(role),
    });
    setMessage(`Editando rol: ${role.name}`);
  };

  const handleSaveRole = async () => {
    setMessage('');
    if (!roleForm.name.trim()) {
      setMessage('Debe indicar el nombre del rol.');
      return;
    }
    if (!roleForm.isReadOnly && !roleForm.permissions.some((permission) => permission.canEdit || permission.canUploadProjects || permission.canUploadTracking)) {
      setMessage('Debe seleccionar al menos una categoría para gestionar.');
      return;
    }
    try {
      await apiRequest(editingRoleId ? `/users/custom-roles/${editingRoleId}` : '/users/custom-roles', {
        method: editingRoleId ? 'PUT' : 'POST',
        body: JSON.stringify(roleForm),
      });
      setMessage(editingRoleId ? 'Rol personalizado actualizado correctamente.' : 'Rol personalizado creado correctamente.');
      resetRoleForm();
      await loadData();
    } catch (error: any) {
      setMessage(error.message || 'No se pudo guardar el rol.');
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!window.confirm('¿Desea eliminar este rol personalizado? Solo se puede eliminar si no tiene usuarios asignados.')) return;
    try {
      await apiRequest(`/users/custom-roles/${roleId}`, { method: 'DELETE' });
      setMessage('Rol eliminado correctamente.');
      await loadData();
    } catch (error: any) {
      setMessage(error.message || 'No se pudo eliminar el rol.');
    }
  };

  const handleCreateUser = async () => {
    setMessage('');
    if (!userForm.nombre.trim() || !userForm.apellido.trim() || !userForm.email.trim() || !userForm.password.trim() || !userForm.customRoleId) {
      setMessage('Nombre, apellido, correo, contraseña y rol son obligatorios.');
      return;
    }
    try {
      await apiRequest('/users/custom-users', {
        method: 'POST',
        body: JSON.stringify({
          ...userForm,
          customRoleId: Number(userForm.customRoleId),
        }),
      });
      setMessage('Usuario personalizado creado correctamente.');
      resetUserForm();
      await loadData();
    } catch (error: any) {
      setMessage(error.message || 'No se pudo crear el usuario.');
    }
  };

  const handleToggleUser = async (user: ManagedUser) => {
    try {
      await apiRequest(`/users/managed/${user.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ active: !user.active }),
      });
      setMessage(user.active ? 'Usuario suspendido correctamente.' : 'Usuario reactivado correctamente.');
      await loadData();
    } catch (error: any) {
      setMessage(error.message || 'No se pudo cambiar el estado del usuario.');
    }
  };

  const handleDeleteUser = async (user: ManagedUser) => {
    if (!window.confirm(`¿Desea eliminar a ${user.nombre} ${user.apellido}? Esta acción solo aplica a usuarios personalizados.`)) return;
    try {
      await apiRequest(`/users/managed/${user.id}`, { method: 'DELETE' });
      setMessage('Usuario eliminado correctamente.');
      await loadData();
    } catch (error: any) {
      setMessage(error.message || 'No se pudo eliminar el usuario.');
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand-blue mb-2">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Usuarios y permisos</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Administración de accesos</h2>
            <p className="text-sm text-slate-600 mt-2 max-w-3xl">
              Geo y Violeta pueden crear roles personalizados, asignar áreas de trabajo, crear usuarios nuevos, suspender accesos y eliminar únicamente usuarios personalizados.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${activeTab === 'users' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${activeTab === 'roles' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            Roles personalizados
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {message && (
          <div className="mx-6 mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 font-semibold">
            {message}
          </div>
        )}

        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus className="w-5 h-5 text-brand-blue" />
                  <h3 className="font-bold text-slate-900">Crear usuario personalizado</h3>
                </div>
                <div className="space-y-3">
                  <input className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" placeholder="Nombre" value={userForm.nombre} onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })} />
                  <input className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" placeholder="Apellido" value={userForm.apellido} onChange={(e) => setUserForm({ ...userForm, apellido: e.target.value })} />
                  <input className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" placeholder="Correo institucional" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
                  <input className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" type="password" placeholder="Contraseña inicial" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
                  <select className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" value={userForm.customRoleId} onChange={(e) => setUserForm({ ...userForm, customRoleId: e.target.value })}>
                    <option value="">Seleccione un rol personalizado</option>
                    {customRoleOptions.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  <button onClick={handleCreateUser} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-lg font-bold hover:bg-blue-700">
                    <Save className="w-4 h-4" />
                    Guardar usuario
                  </button>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900">Usuarios registrados</h3>
                  <p className="text-xs text-slate-500 mt-1">Los usuarios base solo se pueden suspender. Los personalizados se pueden suspender o eliminar.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="text-left p-3">Usuario</th>
                        <th className="text-left p-3">Rol</th>
                        <th className="text-left p-3">Tipo</th>
                        <th className="text-left p-3">Estado</th>
                        <th className="text-right p-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-t border-slate-100">
                          <td className="p-3">
                            <p className="font-bold text-slate-800">{user.nombre} {user.apellido}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </td>
                          <td className="p-3 text-slate-700">{user.roleName}</td>
                          <td className="p-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.isCustom ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                              {user.isCustom ? 'Personalizado' : 'Base'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {user.active ? 'Activo' : 'Suspendido'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleToggleUser(user)} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" title={user.active ? 'Suspender' : 'Reactivar'}>
                                {user.active ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                              </button>
                              {user.canDelete && (
                                <button onClick={() => handleDeleteUser(user)} className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50" title="Eliminar usuario personalizado">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="grid grid-cols-1 xl:grid-cols-[430px_1fr] gap-6">
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Plus className="w-5 h-5 text-brand-blue" />
                  <h3 className="font-bold text-slate-900">{editingRoleId ? 'Editar rol personalizado' : 'Crear rol personalizado'}</h3>
                </div>
                <div className="space-y-3">
                  <input className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" placeholder="Ej. Encargado ONG + Emprendimiento Social" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} />
                  <textarea className="w-full p-2.5 border border-slate-300 rounded-lg text-sm min-h-20" placeholder="Descripción breve del rol" value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Tipo de acceso</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleReadOnlyChange(true)}
                        className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                          roleForm.isReadOnly ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-sm font-bold">Solo lectura</span>
                        <span className="block text-xs text-slate-500 mt-1">Ver y descargar, sin gestión.</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReadOnlyChange(false)}
                        className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                          !roleForm.isReadOnly ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-sm font-bold">Con gestión</span>
                        <span className="block text-xs text-slate-500 mt-1">Puede cargar, editar y dar seguimiento.</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Categorías que puede gestionar</p>
                      <p className="text-xs text-slate-500 mb-3">
                        {roleForm.isReadOnly
                          ? 'En modo lectura estas opciones quedan desactivadas. El usuario solo podrá consultar información y descargar recursos.'
                          : 'Seleccione las categorías donde este rol podrá realizar carga masiva, seguimiento y edición.'}
                      </p>
                    </div>
                    {roleForm.permissions.map((permission) => {
                      const label = AREAS.find((area) => area.key === permission.area)?.label || permission.area;
                      const isSelected = permission.canView || permission.canEdit || permission.canUploadProjects || permission.canUploadTracking || permission.canDelete;
                      return (
                        <label
                          key={permission.area}
                          className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
                            roleForm.isReadOnly
                              ? 'cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                              :
                            isSelected
                              ? 'bg-blue-50 border-blue-200 text-blue-800'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>
                            <span className="block font-bold text-sm">{label}</span>
                            <span className="block text-xs text-slate-500 mt-0.5">
                              {roleForm.isReadOnly ? 'No aplica para roles de solo lectura.' : 'Habilita carga masiva, seguimiento y edición en esta categoría.'}
                            </span>
                          </span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={roleForm.isReadOnly}
                            onChange={(e) => toggleAreaPermission(permission.area, e.target.checked)}
                            className="h-4 w-4"
                          />
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {editingRoleId && (
                      <button onClick={resetRoleForm} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-lg font-bold hover:bg-slate-50">
                        <X className="w-4 h-4" />
                        Cancelar edición
                      </button>
                    )}
                    <button onClick={handleSaveRole} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-lg font-bold hover:bg-blue-700">
                      <Save className="w-4 h-4" />
                      {editingRoleId ? 'Actualizar rol' : 'Guardar rol'}
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900">Roles personalizados creados</h3>
                  <p className="text-xs text-slate-500 mt-1">Estos roles se pueden asignar a nuevos usuarios personalizados.</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {roles.length === 0 && (
                    <p className="p-5 text-sm text-slate-500">Aún no hay roles personalizados.</p>
                  )}
                  {roles.map((role) => (
                    <div key={role.id} className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-slate-900">{role.name}</h4>
                          <p className="text-sm text-slate-500 mt-1">{role.description || 'Sin descripción.'}</p>
                          <span className={`inline-block mt-2 rounded-full px-2.5 py-1 text-xs font-bold ${role.isReadOnly ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>
                            {role.isReadOnly ? 'Solo lectura' : 'Con edición'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEditRole(role)} className="p-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50" title="Editar rol">
                            <PencilLine className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteRole(role.id)} className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50" title="Eliminar rol">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {role.isReadOnly && role.permissions.length === 0 && (
                          <span className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                            Solo consulta y descarga, sin categorías de gestión
                          </span>
                        )}
                        {role.permissions.map((permission) => {
                          const label = AREAS.find((area) => area.key === permission.area)?.label || permission.area;
                          return (
                            <span key={permission.area} className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                              {label}: {permission.canEdit ? 'gestiona' : 've'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersPermissionsModal;
