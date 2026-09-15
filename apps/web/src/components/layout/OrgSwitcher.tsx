import React, { useState } from 'react';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { CreateOrgModal } from '../org/CreateOrgModal';

export const OrgSwitcher: React.FC = () => {
  const { activeOrg, organizations, setActiveOrg } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 text-indigo-500 shrink-0" />
            <span className="truncate">{activeOrg?.name || 'Select Workspace'}</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 py-1.5 overflow-hidden">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Workspaces ({organizations.length})
            </div>
            <div className="max-h-56 overflow-y-auto">
              {organizations.map((org) => {
                const isSelected = org.id === activeOrg?.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => {
                      setActiveOrg(org);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-xs transition ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 font-bold text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="truncate text-left">
                      <p className="truncate">{org.name}</p>
                      <span className="text-[10px] text-slate-400 font-normal">{org.role}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsModalOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create New Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateOrgModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => setIsModalOpen(false)}
      />
    </>
  );
};
