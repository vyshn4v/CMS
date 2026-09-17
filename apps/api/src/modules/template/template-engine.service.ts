import { Injectable } from '@nestjs/common';
import { HandlebarsService } from './handlebars.service';

export interface RenderModelFieldsParams {
  fields: Record<string, any>;
  context: Record<string, any>;
  modelFields?: any[];
  fallbackDrafts?: Record<string, any> | null;
}

/**
 * Service providing reusable template evaluation logic across both
 * the public Render API (RenderService) and the in-app Preview engine (TemplateService).
 */
@Injectable()
export class TemplateEngineService {
  private readonly FORBIDDEN_PROPERTIES = new Set(['__proto__', 'constructor', 'prototype']);

  constructor(private readonly handlebarsService: HandlebarsService) {}

  /**
   * Normalizes dot-notation keys (e.g. 'seo.meta_title') into nested objects.
   * Protects against prototype pollution vulnerabilities (SEC-04).
   */
  normalizeDotKeys(fields: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = Object.create(null);

    for (const [k, v] of Object.entries(fields)) {
      if (k.includes('.')) {
        const parts = k.split('.');
        if (parts.some((part) => this.FORBIDDEN_PROPERTIES.has(part))) {
          continue;
        }
        const [parent, child] = parts;
        if (!normalized[parent] || typeof normalized[parent] !== 'object') {
          normalized[parent] = Object.create(null);
        }
        normalized[parent][child] = v;
      } else {
        if (!this.FORBIDDEN_PROPERTIES.has(k)) {
          normalized[k] = v;
        }
      }
    }

    return normalized;
  }

  /**
   * Evaluates field-by-field Handlebars templates against the execution context.
   * Handles components, dynamic zone polymorphic blocks, JSON parsing, and fallbacks.
   */
  renderModelFields({
    fields,
    context,
    modelFields = [],
    fallbackDrafts,
  }: RenderModelFieldsParams): Record<string, any> {
    const normalized = this.normalizeDotKeys(fields);
    const allowedFields =
      modelFields.length > 0 ? new Set(modelFields.map((f: any) => f.name)) : null;

    const renderedFields: Record<string, any> = {};

    for (const [key, rawTpl] of Object.entries(normalized)) {
      // Validate field boundary against model schema if defined, supporting common subject aliases
      if (allowedFields && !allowedFields.has(key)) {
        const isSubAlias =
          (key === 'sub' || key === 'subj' || key === 'subject') &&
          (allowedFields.has('sub') || allowedFields.has('subj') || allowedFields.has('subject'));
        if (!isSubAlias) {
          continue;
        }
      }

      // A. Extract or resolve structured component / dynamic zone subfield templates
      let subfieldTemplates: Record<string, any> | null = null;
      if (rawTpl && typeof rawTpl === 'object' && !Array.isArray(rawTpl)) {
        subfieldTemplates = rawTpl as Record<string, any>;
      } else if (
        typeof rawTpl === 'string' &&
        rawTpl.trim().startsWith('{') &&
        rawTpl.trim().endsWith('}')
      ) {
        try {
          const parsed = JSON.parse(rawTpl);
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            subfieldTemplates = parsed;
          }
        } catch {
          // Keep as primitive template
        }
      }

      // Fallback: check if fallback drafts contain structured subfield definitions
      if (!subfieldTemplates && fallbackDrafts && typeof fallbackDrafts === 'object') {
        const draftTpl = fallbackDrafts[key];
        if (draftTpl && typeof draftTpl === 'object' && !Array.isArray(draftTpl)) {
          subfieldTemplates = draftTpl;
        }
      }

      // Ensure component and dynamic zone fields are never concatenated into flat strings
      const modelFieldDef = modelFields.find((f: any) => f.name === key);
      if (!subfieldTemplates && modelFieldDef?.type === 'component') {
        const rawVal = context[key];
        if (typeof rawVal === 'object' && rawVal !== null) {
          renderedFields[key] = rawVal;
          continue;
        }
      }
      if (!subfieldTemplates && modelFieldDef?.type === 'dynamiczone') {
        const rawVal = context[key];
        if (Array.isArray(rawVal)) {
          renderedFields[key] = rawVal;
          continue;
        }
      }

      // If structured subfields exist, evaluate component or dynamic zone
      if (subfieldTemplates) {
        const rawVal = context[key];

        // Dynamic Zone: contains polymorphic component blocks
        const isDynamicZone =
          Boolean(subfieldTemplates.__dynamicZone) ||
          Object.entries(subfieldTemplates).some(
            ([k, v]) => k !== '__dynamicZone' && typeof v === 'object' && v !== null && !Array.isArray(v),
          );

        if (isDynamicZone) {
          renderedFields[key] = this.evaluateDynamicZone(rawVal, subfieldTemplates, context);
          continue;
        }

        // Component: repeatable list
        if (Array.isArray(rawVal)) {
          renderedFields[key] = this.evaluateRepeatableComponent(rawVal, subfieldTemplates, context);
          continue;
        }

        // Component: single object
        if (typeof rawVal === 'object' && rawVal !== null) {
          renderedFields[key] = this.evaluateSingleComponent(rawVal, subfieldTemplates, context);
          continue;
        }

        // Fallback: evaluate default subfield expressions with context
        const itemObj: Record<string, any> = {};
        for (const [subKey, subFormula] of Object.entries(subfieldTemplates)) {
          itemObj[subKey] =
            typeof subFormula === 'string'
              ? this.handlebarsService.render(subFormula, context)
              : subFormula;
        }
        renderedFields[key] = itemObj;
        continue;
      }

      // B. Handle regular string or primitive templates
      renderedFields[key] = this.evaluatePrimitiveField(key, rawTpl, context);
    }

    return renderedFields;
  }

  /**
   * Evaluates dynamic zone polymorphic blocks array.
   */
  private evaluateDynamicZone(
    rawVal: any,
    subfieldTemplates: Record<string, any>,
    context: Record<string, any>,
  ): any[] | Record<string, any> {
    if (Array.isArray(rawVal)) {
      return rawVal.map((item: any, idx: number) => {
        if (!item || typeof item !== 'object') return item;
        const compKey = item.__component || item.component || item._component || item.type;
        let blockTpl: Record<string, any> | null = null;

        if (compKey && subfieldTemplates[compKey] && typeof subfieldTemplates[compKey] === 'object') {
          blockTpl = subfieldTemplates[compKey];
        } else if (compKey) {
          for (const [k, v] of Object.entries(subfieldTemplates)) {
            if (k !== '__dynamicZone' && typeof v === 'object' && v !== null) {
              if (k.toLowerCase() === String(compKey).toLowerCase()) {
                blockTpl = v as Record<string, any>;
                break;
              }
            }
          }
        }

        if (!blockTpl) return item;

        const itemObj: Record<string, any> = {
          __component: compKey || item.__component || 'block',
        };
        const itemScope = { ...context, ...item, this: item, '@index': idx };

        for (const [subKey, subFormula] of Object.entries(blockTpl)) {
          if (subKey === '__dynamicZone') continue;
          itemObj[subKey] = this.renderSubfieldExpression(subKey, subFormula, item, itemScope);
        }
        return itemObj;
      });
    }

    if (typeof rawVal === 'object' && rawVal !== null) {
      const compKey = rawVal.__component || rawVal.component || rawVal._component || rawVal.type;
      const blockTpl = compKey && typeof subfieldTemplates[compKey] === 'object' ? subfieldTemplates[compKey] : null;
      if (blockTpl) {
        const itemObj: Record<string, any> = { __component: compKey || 'block' };
        const scope = { ...context, ...rawVal, this: rawVal };
        for (const [subKey, subFormula] of Object.entries(blockTpl)) {
          if (subKey === '__dynamicZone') continue;
          itemObj[subKey] = this.renderSubfieldExpression(subKey, subFormula, rawVal, scope);
        }
        return itemObj;
      }
      return rawVal;
    }

    return [];
  }

  /**
   * Evaluates repeatable component items.
   */
  private evaluateRepeatableComponent(
    rawArray: any[],
    subfieldTemplates: Record<string, any>,
    context: Record<string, any>,
  ): any[] {
    return rawArray.map((item: any, idx: number) => {
      const itemObj: Record<string, any> = {};
      const itemScope =
        typeof item === 'object' && item !== null
          ? { ...context, ...item, this: item, '@index': idx }
          : { ...context, this: item, '@index': idx };

      for (const [subKey, subFormula] of Object.entries(subfieldTemplates)) {
        itemObj[subKey] = this.renderSubfieldExpression(subKey, subFormula, item, itemScope);
      }
      return itemObj;
    });
  }

  /**
   * Evaluates a single component object.
   */
  private evaluateSingleComponent(
    rawObj: Record<string, any>,
    subfieldTemplates: Record<string, any>,
    context: Record<string, any>,
  ): Record<string, any> {
    const itemObj: Record<string, any> = {};
    const scope = { ...context, ...rawObj, this: rawObj };

    for (const [subKey, subFormula] of Object.entries(subfieldTemplates)) {
      itemObj[subKey] = this.renderSubfieldExpression(subKey, subFormula, rawObj, scope);
    }
    return itemObj;
  }

  /**
   * Helper rendering subfield formula expressions with direct pass-through check.
   */
  private renderSubfieldExpression(
    subKey: string,
    subFormula: any,
    item: Record<string, any>,
    scope: Record<string, any>,
  ): any {
    if (typeof subFormula !== 'string') {
      return subFormula;
    }

    const subTrimmed = subFormula.trim();
    if (
      (subTrimmed === '' ||
        subTrimmed === `{{${subKey}}}` ||
        subTrimmed === `{{this.${subKey}}}`) &&
      item &&
      item[subKey] !== undefined
    ) {
      return item[subKey];
    }

    let val: any = this.handlebarsService.render(subFormula, scope);
    if (
      typeof val === 'string' &&
      ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']')))
    ) {
      try {
        val = JSON.parse(val);
      } catch {
        // keep as rendered string
      }
    }
    return val;
  }

  /**
   * Evaluates a primitive field template against context.
   */
  private evaluatePrimitiveField(
    key: string,
    rawTpl: any,
    context: Record<string, any>,
  ): any {
    const trimmed = typeof rawTpl === 'string' ? rawTpl.trim() : '';

    // Direct pass-through if template expression is {{key}} or {{{key}}} or empty
    if (
      (trimmed === `{{${key}}}` || trimmed === `{{{${key}}}}` || trimmed === '') &&
      context[key] !== undefined
    ) {
      return context[key];
    }

    let renderedVal: any = this.handlebarsService.render(
      typeof rawTpl === 'string' ? rawTpl : '',
      context,
    );

    // Graceful fallback: If Handlebars produced "[object Object]" and original input was an object/array
    if (
      typeof renderedVal === 'string' &&
      renderedVal.includes('[object Object]') &&
      context[key] !== undefined &&
      typeof context[key] === 'object'
    ) {
      return context[key];
    }

    // Auto-parse JSON string outputs (e.g. from {{{json field}}})
    if (typeof renderedVal === 'string') {
      const s = renderedVal.trim();
      if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
        try {
          renderedVal = JSON.parse(s);
        } catch {
          // keep as string
        }
      }
    }

    return renderedVal;
  }
}
