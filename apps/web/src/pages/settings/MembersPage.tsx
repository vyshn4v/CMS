import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Mail, AlertCircle, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { OrgMemberDto, RoleDto } from '@cms/shared-types';

export const MembersPage: React.FC = () => {
  const { activeOrg, user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const orgId = activeOrg?.id;

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch members
  const { data: members = [], isLoading: isMembersLoading } = useQuery<OrgMemberDto[]>({
    queryKey: ['members', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await api.get(`/orgs/${orgId}/members`);
      return res.data.data;
    },
    enabled: !!orgId,
  });

  // Fetch roles
  const { data: roles = [] } = useQuery<RoleDto[]>({
    queryKey: ['roles', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await api.get(`/orgs/${orgId}/roles`);
      return res.data.data;
    },
    enabled: !!orgId,
  });

  // Invite member mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !inviteEmail || !inviteRoleId) return;
      await api.post(`/orgs/${orgId}/members/invite`, {
        email: inviteEmail.trim(),
        roleId: inviteRoleId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', orgId] });
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteRoleId('');
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to invite member');
    },
  });

  // Change role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, roleId }: { memberId: string; roleId: string }) => {
      if (!orgId) return;
      await api.patch(`/orgs/${orgId}/members/${memberId}/role`, { roleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', orgId] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || 'Failed to update member role');
    },
  });

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      if (!orgId) return;
      await api.delete(`/orgs/${orgId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', orgId] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || 'Failed to remove member');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Team Members</h2>
          <p className="text-xs text-slate-500">
            Collaborators with access to manage content and schemas in this workspace.
          </p>
        </div>
        <button
          onClick={() => {
            if (roles.length > 0 && !inviteRoleId) setInviteRoleId(roles[0].id);
            setIsInviteOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
        >
          <UserPlus className="h-4 w-4" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Members Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {isMembersLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No members found</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {members.map((member) => {
                const isCurrent = member.user.id === currentUser?.id;
                return (
                  <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {member.user.avatarUrl ? (
                          <img
                            src={member.user.avatarUrl}
                            alt=""
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                            {member.user.name?.[0] || 'U'}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {member.user.name} {isCurrent && <span className="text-[10px] text-indigo-500 font-normal">(You)</span>}
                          </p>
                          <p className="text-slate-400 text-[11px]">{member.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={member.roleId}
                        onChange={(e) =>
                          updateRoleMutation.mutate({ memberId: member.id, roleId: e.target.value })
                        }
                        className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to remove ${member.user.name}?`)) {
                            removeMutation.mutate(member.id);
                          }
                        }}
                        disabled={removeMutation.isPending}
                        title="Remove member"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Mail className="h-5 w-5" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Invite Team Member
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsInviteOpen(false);
                  setErrorMessage(null);
                }}
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
                inviteMutation.mutate();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Role Assignment
                </label>
                <select
                  required
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.isSystem ? '(System)' : '(Custom)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition"
                >
                  {inviteMutation.isPending ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
