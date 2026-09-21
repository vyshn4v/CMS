import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Save,
  Copy,
  Check,
  Shield,
  Info,
  Calendar,
  KeyRound,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { OrganizationDto } from '@cms/shared-types';

export const GeneralSettingsPage: React.FC = () => {
  const { activeOrg, updateOrg } = useAuthStore();
  const queryClient = useQueryClient();
  const orgId = activeOrg?.id;

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch full organization details
  const { data: orgData, isLoading } = useQuery<OrganizationDto>({
    queryKey: ['org', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const res = await api.get(`/orgs/${orgId}`);
      return res.data.data;
    },
    enabled: !!orgId,
  });

  // Sync state when orgData loads
  useEffect(() => {
    if (orgData) {
      setName(orgData.name);
      setSlug(orgData.slug);
    } else if (activeOrg) {
      setName(activeOrg.name);
      setSlug(activeOrg.slug);
    }
  }, [orgData, activeOrg]);

  // Update org mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) return;
      const trimmedName = name.trim();
      const trimmedSlug = slug.trim();
      if (!trimmedName) throw new Error('Workspace name cannot be empty');

      const res = await api.patch(`/orgs/${orgId}`, {
        name: trimmedName,
        slug: trimmedSlug || undefined,
      });
      return res.data.data as OrganizationDto;
    },
    onSuccess: (updated) => {
      if (updated) {
        updateOrg({
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
        });
        queryClient.invalidateQueries({ queryKey: ['org', orgId] });
      }
      setSuccessMessage('Workspace settings updated successfully!');
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setSuccessMessage(null);
      setErrorMessage(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to update workspace settings',
      );
    },
  });

  const handleCopyId = () => {
    if (!orgId) return;
    navigator.clipboard.writeText(orgId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-xs text-slate-400">Loading workspace settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Status Alerts */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-4 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 p-4 text-xs font-semibold text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Workspace Form */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Workspace Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update your organization display name, public identifier, and metadata.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Workspace Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corporation"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Human-friendly name displayed across the dashboard, studio sidebar, and workspace switcher.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Workspace Slug
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="e.g. acme-corporation"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Unique URL-safe identifier for API endpoints and tenant routing.
            </p>
          </div>

          {/* Workspace ID & Metadata */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Workspace ID
              </label>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 font-mono select-all truncate">
                  {orgId}
                </code>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Copy Workspace ID"
                >
                  {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Your Role
              </label>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Shield className="h-4 w-4" />
                <span>{activeOrg?.role || 'Super Admin'}</span>
              </div>
            </div>

            {orgData?.createdAt && (
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Created On
                </label>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>{new Date(orgData.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={updateMutation.isPending || !name.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-100 dark:shadow-none transition"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Info Notice */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 flex gap-3 text-xs text-slate-600 dark:text-slate-400">
        <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            Multi-Tenant Isolation
          </p>
          <p className="mt-0.5 leading-relaxed">
            Content types, schema models, components, templates, and API keys are strictly partitioned within this workspace. Switching workspaces in the sidebar switches your entire context and active permissions.
          </p>
        </div>
      </div>
    </div>
  );
};
