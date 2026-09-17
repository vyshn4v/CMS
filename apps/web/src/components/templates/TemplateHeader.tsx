import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Globe,
  Trash2,
  Copy,
  Check,
  Columns2,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import { ContentTypeDto, TemplateDto } from '@cms/shared-types';
import { Button, Badge } from '../ui';
import { useClipboard } from '../../hooks/useClipboard';

export type ViewMode = 'editor' | 'split' | 'preview';

export interface TemplateHeaderProps {
  name: string;
  onNameChange: (name: string) => void;
  selectedSchema: ContentTypeDto | null;
  template: TemplateDto | null;
  isEditing: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onDelete: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}

export const TemplateHeader: React.FC<TemplateHeaderProps> = ({
  name,
  onNameChange,
  selectedSchema,
  template,
  isEditing,
  viewMode,
  onViewModeChange,
  onSaveDraft,
  onPublish,
  onDelete,
  isSaving,
  isDeleting,
}) => {
  const { hasCopied, copy } = useClipboard({ timeout: 2000 });
  const isPublished = template?.status === 'PUBLISHED';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
      {/* Left: Navigation and Name */}
      <div className="flex items-center gap-3">
        <Link to="/templates">
          <Button variant="ghost" size="icon" aria-label="Back to templates">
            <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </Button>
        </Link>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Template Name..."
              className="text-sm font-bold text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors px-1 py-0.5 rounded"
            />
            {isEditing && (
              <Badge variant={isPublished ? 'success' : 'default'} size="sm" dot>
                {isPublished ? 'PUBLISHED' : 'DRAFT'}
              </Badge>
            )}
          </div>
          {selectedSchema && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>Model: <strong className="text-slate-800 dark:text-slate-200">{selectedSchema.name}</strong></span>
              <span>•</span>
              <button
                type="button"
                onClick={() => copy(selectedSchema.id)}
                className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                title="Copy Model Schema ID"
              >
                {hasCopied ? (
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
                <span>{selectedSchema.id.slice(0, 8)}...</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: View mode controls and actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View Mode Controls */}
        <div className="hidden lg:flex items-center p-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => onViewModeChange('editor')}
            className={`p-1.5 rounded-md transition ${
              viewMode === 'editor'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Editor only"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('split')}
            className={`p-1.5 rounded-md transition ${
              viewMode === 'split'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Split view"
          >
            <Columns2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('preview')}
            className={`p-1.5 rounded-md transition ${
              viewMode === 'preview'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Preview only"
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <Button
            variant="danger-outline"
            size="sm"
            onClick={onDelete}
            isLoading={isDeleting}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete
          </Button>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={onSaveDraft}
          isLoading={isSaving}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Save Draft
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onPublish}
          isLoading={isSaving}
          leftIcon={<Globe className="w-4 h-4" />}
        >
          Save & Publish
        </Button>
      </div>
    </div>
  );
};
