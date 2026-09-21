import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link2, Search, X, Check, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import { FieldDefinition, ContentEntryDto } from '@cms/shared-types';

interface RelationPickerProps {
  field: FieldDefinition;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

export const RelationPicker: React.FC<RelationPickerProps> = ({
  field,
  value,
  onChange,
  disabled = false,
}) => {
  const { activeOrg } = useAuthStore();
  const orgId = activeOrg?.id;

  const relation = field.relation;
  const isMultiple = relation?.type === 'many-to-many' || relation?.type === 'one-to-many';
  const displayField = relation?.displayField || 'title';
  const targetSlug = relation?.targetContentTypeSlug || '';

  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch available entries from target content type
  const { data: entriesData, isLoading } = useQuery<{ items: ContentEntryDto[] }>({
    queryKey: ['relation-entries', orgId, targetSlug, searchTerm],
    queryFn: async () => {
      if (!orgId || !targetSlug) return { items: [] };
      const res = await api.get(
        `/orgs/${orgId}/content/${targetSlug}?limit=50${
          searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''
        }`,
      );
      return res.data.data;
    },
    enabled: !!orgId && !!targetSlug && isOpen,
  });

  const availableEntries = entriesData?.items || [];

  // Normalize selected IDs
  const selectedIds: string[] = Array.isArray(value)
    ? value
    : value && typeof value === 'string'
    ? [value]
    : [];

  const handleSelect = (id: string) => {
    if (isMultiple) {
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter((item) => item !== id));
      } else {
        onChange([...selectedIds, id]);
      }
    } else {
      onChange(id);
      setIsOpen(false);
    }
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMultiple) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange(null);
    }
  };

  return (
    <div className="relative space-y-2">
      {/* Clickable selector box */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`min-h-[38px] w-full rounded-lg border p-2 text-xs flex flex-wrap items-center gap-1.5 cursor-pointer transition ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-slate-800'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {selectedIds.length === 0 ? (
          <span className="text-slate-400 flex items-center gap-1.5 py-0.5">
            <Link2 className="h-3.5 w-3.5" />
            Select related {field.label || targetSlug || 'entries'}...
          </span>
        ) : (
          selectedIds.map((id) => {
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-medium text-[11px]"
              >
                <Link2 className="h-3 w-3 text-indigo-500" />
                <span className="max-w-[150px] truncate">{id}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => handleRemove(id, e)}
                    className="hover:text-rose-600 dark:hover:text-rose-400 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })
        )}
      </div>

      {/* Dropdown search & entry selection */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-2 space-y-2 max-h-64 overflow-hidden flex flex-col">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder={`Search ${targetSlug}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 space-y-0.5">
            {isLoading ? (
              <div className="p-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading {targetSlug} entries...
              </div>
            ) : availableEntries.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                No matching entries found in {targetSlug}.
              </div>
            ) : (
              availableEntries.map((entry) => {
                const isSelected = selectedIds.includes(entry.id);
                const title =
                  entry.publishedData?.[displayField] ||
                  entry.data?.[displayField] ||
                  entry.publishedData?.title ||
                  entry.data?.title ||
                  entry.publishedData?.name ||
                  entry.data?.name ||
                  entry.id;

                return (
                  <div
                    key={entry.id}
                    onClick={() => handleSelect(entry.id)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-semibold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div>{String(title)}</div>
                      <div className="text-[10px] font-mono text-slate-400">ID: {entry.id.slice(0, 8)}...</div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
