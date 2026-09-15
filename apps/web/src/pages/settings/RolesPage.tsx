import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, Edit2, Trash2, CheckSquare, Square, X, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { RoleDto, PermissionGroupDto } from '@cms/shared-types';

export const RolesPage: React.FC = () => {
  const { activeOrg } = useAuthStore();
  const queryClient = useQueryClient();
  const orgId = activeOrg?.id;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch roles
  const { data: roles = [], isLoading: isRolesLoading } = useQuery<RoleDto[]>({
    queryKey: ['roles', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await api.get(`/orgs/${orgId}/roles`);
      return res.data.data;
    },
    enabled: !!orgId,
  });

  // Fetch all system permissions grouped
  const { data: permissionGroups = [] } = useQuery<PermissionGroupDto[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await api.get('/permissions');
      return res.data.data;
    },
  });

  // Save role mutation
  const saveRoleMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !roleName.trim()) return;

      if (editingRoleId) {
        await api.patch(`/orgs/${orgId}/roles/${editingRoleId}`, {
          name: roleName.trim(),
          description: roleDescription.trim() || undefined,
          permissions: selectedPermissions,
        });
      } else {
        await api.post(`/orgs/${orgId}/roles`, {
          name: roleName.trim(),
          description: roleDescription.trim() || undefined,
          permissions: selectedPermissions,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', orgId] });
      closeModal();
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to save role');
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      if (!orgId) return;
      await api.delete(`/orgs/${orgId}/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', orgId] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || 'Failed to delete role');
    },
  });

  const openCreateModal = () => {
    setEditingRoleId(null);
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions([]);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (role: RoleDto) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setSelectedPermissions([...role.permissions]);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRoleId(null);
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions([]);
    setErrorMessage(null);
  };

  const togglePermission = (action: string) => {
    if (selectedPermissions.includes(action)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== action));
    } else {
      setSelectedPermissions([...selectedPermissions, action]);
    }
  };

  const toggleGroup = (groupPerms: string[]) => {
    const allSelected = groupPerms.every((p) => selectedPermissions.includes(p));
    if (allSelected) {
      setSelectedPermissions(selectedPermissions.filter((p) => !groupPerms.includes(p)));
    } else {
      const set = new Set([...selectedPermissions, ...groupPerms]);
      setSelectedPermissions(Array.from(set));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Roles & Permissions
          </h2>
          <p className="text-xs text-slate-500">
            Configure system and custom roles with granular permission rules.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Create Custom Role</span>
        </button>
      </div>

      {/* Roles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isRolesLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 col-span-2">Loading roles...</div>
        ) : (
          roles.map((role) => (
            <div
              key={role.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-indigo-500" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {role.name}
                    </h3>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      role.isSystem
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    {role.isSystem ? 'System' : 'Custom'}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  {role.description || 'No description provided'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-400 mb-2">
                    Permissions ({role.permissions.length}):
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {role.permissions.slice(0, 10).map((p) => (
                      <span
                        key={p}
                        className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-300"
                      >
                        {p}
                      </span>
                    ))}
                    {role.permissions.length > 10 && (
                      <span className="text-[10px] text-slate-400 font-medium self-center pl-1">
                        +{role.permissions.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!role.isSystem && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                  <button
                    onClick={() => openEditModal(role)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete role "${role.name}"?`)) {
                        deleteRoleMutation.mutate(role.id);
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Role Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Shield className="h-5 w-5" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {editingRoleId ? 'Edit Custom Role' : 'Create Custom Role'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveRoleMutation.mutate();
              }}
              className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Role Name
                </label>
                <input
                  type="text"
                  required
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="e.g. Content Publisher"
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <input
                  type="text"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="Can draft and publish content entries..."
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Permissions Checkbox Matrix */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Permissions Matrix
                  </span>
                  <span className="text-xs text-slate-400">
                    {selectedPermissions.length} selected
                  </span>
                </div>

                <div className="space-y-4">
                  {permissionGroups.map((group) => {
                    const groupPermActions = group.permissions.map((p) => p.action);
                    const allChecked = groupPermActions.every((p) =>
                      selectedPermissions.includes(p),
                    );

                    return (
                      <div
                        key={group.group}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30"
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {group.group} Permissions
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleGroup(groupPermActions)}
                            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {allChecked ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                          {group.permissions.map((p) => {
                            const checked = selectedPermissions.includes(p.action);
                            return (
                              <div
                                key={p.id}
                                onClick={() => togglePermission(p.action)}
                                className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer border transition ${
                                  checked
                                    ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-200'
                                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                }`}
                              >
                                {checked ? (
                                  <CheckSquare className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                                ) : (
                                  <Square className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <p className="text-xs font-semibold leading-tight font-mono">
                                    {p.action}
                                  </p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    {p.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 pb-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveRoleMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition"
                >
                  {saveRoleMutation.isPending ? 'Saving...' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
