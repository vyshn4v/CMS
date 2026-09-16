import { Injectable, BadRequestException } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as dayjsModule from 'dayjs';

const dayjs: any = (dayjsModule as any).default || dayjsModule;

/**
 * Service managing Handlebars compilation, custom helpers, and safe rendering.
 */
@Injectable()
export class HandlebarsService {
  private hbs: typeof Handlebars;
  private readonly compiledCache = new Map<string, Handlebars.TemplateDelegate>();
  private readonly MAX_CACHE_SIZE = 500;

  constructor() {
    this.hbs = Handlebars.create();
    this.registerDefaultHelpers();
  }

  /**
   * Registers global Handlebars helpers.
   */
  private registerDefaultHelpers(): void {
    // Format dates cleanly with dayjs
    this.hbs.registerHelper('formatDate', (date: any, format?: any) => {
      if (!date) return '';
      const fmt = typeof format === 'string' ? format : 'YYYY-MM-DD HH:mm:ss';
      return dayjs(date).format(fmt);
    });

    // Uppercase text
    this.hbs.registerHelper('uppercase', (str: any) => {
      return str ? String(str).toUpperCase() : '';
    });

    // Lowercase text
    this.hbs.registerHelper('lowercase', (str: any) => {
      return str ? String(str).toLowerCase() : '';
    });

    // Truncate text with ellipsis
    this.hbs.registerHelper('truncate', (str: any, len: any) => {
      if (!str) return '';
      const limit = typeof len === 'number' ? len : 50;
      const s = String(str);
      return s.length > limit ? s.substring(0, limit) + '...' : s;
    });

    // Equality check block helper
    this.hbs.registerHelper('ifEquals', function (this: any, a: any, b: any, options: any) {
      return a === b ? options.fn(this) : options.inverse(this);
    });

    // Inequality check block helper
    this.hbs.registerHelper('ifNotEquals', function (this: any, a: any, b: any, options: any) {
      return a !== b ? options.fn(this) : options.inverse(this);
    });

    // Pretty JSON serializer helper
    this.hbs.registerHelper('json', (obj: any) => {
      try {
        return new this.hbs.SafeString(JSON.stringify(obj, null, 2));
      } catch {
        return '';
      }
    });

    // Default fallback value helper
    this.hbs.registerHelper('default', (val: any, fallback: any) => {
      return val !== undefined && val !== null && val !== '' ? val : fallback;
    });
  }

  /**
   * Validates and compiles a template string into a Handlebars delegate,
   * accelerated with an in-memory compilation cache.
   * Throws BadRequestException on syntax errors.
   */
  public compile(templateStr: string): Handlebars.TemplateDelegate {
    const raw = templateStr || '';
    const cached = this.compiledCache.get(raw);
    if (cached) {
      return cached;
    }

    try {
      const compiled = this.hbs.compile(raw, { noEscape: false });
      if (this.compiledCache.size >= this.MAX_CACHE_SIZE) {
        const firstKey = this.compiledCache.keys().next().value;
        if (firstKey !== undefined) {
          this.compiledCache.delete(firstKey);
        }
      }
      this.compiledCache.set(raw, compiled);
      return compiled;
    } catch (err: any) {
      throw new BadRequestException({
        code: 'TEMPLATE_SYNTAX_ERROR',
        message: `Template compilation failed: ${err.message}`,
        details: err.lineNumber ? [{ line: err.lineNumber, message: err.message }] : undefined,
      });
    }
  }

  /**
   * Validates template syntax without returning the compiled delegate.
   */
  public validateSyntax(templateStr: string): { valid: boolean; error?: string } {
    try {
      this.hbs.compile(templateStr || '');
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * Compiles and executes a template with the given context data.
   */
  public render(templateStr: string, context: Record<string, any>): string {
    const compiled = this.compile(templateStr);
    try {
      return compiled(context || {});
    } catch (err: any) {
      throw new BadRequestException({
        code: 'TEMPLATE_RENDER_ERROR',
        message: `Template rendering failed: ${err.message}`,
      });
    }
  }
}
