import React, { useState } from 'react';
import { FieldDefinition } from '@cms/shared-types';
import { RelationPicker } from './fields/RelationPicker';
import { ComponentForm } from './fields/ComponentForm';
import { DynamicZoneEditor } from './fields/DynamicZoneEditor';
import { TipTapEditor } from '../editors/TipTapEditor';
import { Eye, Code2 } from 'lucide-react';

interface DynamicFormFieldProps {
  field: FieldDefinition;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Individual field renderer dynamically adapting to field type and validation rules.
 */
export const DynamicFormField: React.FC<DynamicFormFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled = false,
}) => {
  const { name, label, type, required, options, validations } = field;
  const [richTextMode, setRichTextMode] = useState<'visual' | 'code'>('visual');

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label || name}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          {type}
        </span>
      </div>

      {/* Field Input Variant */}
      {type === 'text' && (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={`Enter ${label || name}...`}
          className={`w-full rounded-lg border px-3 py-2 text-xs transition focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-400 bg-red-50/20 focus:ring-red-500'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-indigo-500 text-slate-900 dark:text-slate-100'
          }`}
        />
      )}

      {type === 'richtext' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-end gap-1 mb-1">
            <button
              type="button"
              onClick={() => setRichTextMode('visual')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition ${
                richTextMode === 'visual'
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Eye className="h-3 w-3" />
              <span>Visual Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setRichTextMode('code')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition ${
                richTextMode === 'code'
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Code2 className="h-3 w-3" />
              <span>HTML Source</span>
            </button>
          </div>

          {richTextMode === 'visual' ? (
            <TipTapEditor
              content={value ?? ''}
              onChange={onChange}
              className={error ? 'border-red-400' : ''}
            />
          ) : (
            <textarea
              rows={8}
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              placeholder={`Write ${label || name} HTML content...`}
              className={`w-full font-mono rounded-lg border p-3 text-xs transition focus:outline-none focus:ring-2 ${
                error
                  ? 'border-red-400 bg-red-50/20 focus:ring-red-500'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-indigo-500 text-slate-900 dark:text-slate-100'
              }`}
            />
          )}
        </div>
      )}

      {type === 'number' && (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={disabled}
          min={validations?.min}
          max={validations?.max}
          placeholder="0"
          className={`w-full rounded-lg border px-3 py-2 text-xs transition focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-400 bg-red-50/20 focus:ring-red-500'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-indigo-500 text-slate-900 dark:text-slate-100'
          }`}
        />
      )}

      {type === 'email' && (
        <input
          type="email"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="user@example.com"
          className={`w-full rounded-lg border px-3 py-2 text-xs transition focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-400 bg-red-50/20 focus:ring-red-500'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-indigo-500 text-slate-900 dark:text-slate-100'
          }`}
        />
      )}

      {type === 'boolean' && (
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(!value)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              value ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                value ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            {value ? 'True / Enabled' : 'False / Disabled'}
          </span>
        </div>
      )}

      {(type === 'date' || type === 'datetime') && (
        <input
          type={type === 'date' ? 'date' : 'datetime-local'}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full rounded-lg border px-3 py-2 text-xs transition focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-400 bg-red-50/20 focus:ring-red-500'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-indigo-500 text-slate-900 dark:text-slate-100'
          }`}
        />
      )}

      {type === 'enum' && (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full rounded-lg border px-3 py-2 text-xs transition focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-400 bg-red-50/20 focus:ring-red-500'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-indigo-500 text-slate-900 dark:text-slate-100'
          }`}
        >
          <option value="">-- Select an option --</option>
          {(options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}

      {type === 'media' && (
        <div className="space-y-2">
          <input
            type="url"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="https://example.com/asset.png"
            className={`w-full rounded-lg border px-3 py-2 text-xs transition focus:outline-none focus:ring-2 ${
              error
                ? 'border-red-400 bg-red-50/20 focus:ring-red-500'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-indigo-500 text-slate-900 dark:text-slate-100'
            }`}
          />
          {value && typeof value === 'string' && value.startsWith('http') && (
            <div className="h-20 w-32 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800">
              <img
                src={value}
                alt="Asset preview"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      )}

      {type === 'json' && (
        <textarea
          rows={5}
          value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value ?? ''}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange(parsed);
            } catch {
              onChange(e.target.value);
            }
          }}
          disabled={disabled}
          placeholder='{"key": "value"}'
          className={`w-full font-mono rounded-lg border p-3 text-xs transition focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-400 bg-red-50/20 focus:ring-red-500'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-indigo-500 text-slate-900 dark:text-slate-100'
          }`}
        />
      )}

      {type === 'relation' && (
        <RelationPicker
          field={field}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      )}

      {type === 'component' && (
        <ComponentForm
          field={field}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      )}

      {type === 'dynamiczone' && (
        <DynamicZoneEditor
          field={field}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      )}

      {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
    </div>
  );
};
