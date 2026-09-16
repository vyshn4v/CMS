import { HandlebarsService } from './handlebars.service';

describe('HandlebarsService', () => {
  let service: HandlebarsService;

  beforeEach(() => {
    service = new HandlebarsService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Variable Rendering', () => {
    it('should interpolate simple variables', () => {
      const template = 'Hello, {{name}}! Welcome to {{platform}}.';
      const context = { name: 'Alex', platform: 'CMS Studio' };
      const output = service.render(template, context);
      expect(output).toBe('Hello, Alex! Welcome to CMS Studio.');
    });

    it('should handle nested variable access', () => {
      const template = 'Invoice for {{customer.name}} (ID: {{customer.account.id}})';
      const context = {
        customer: {
          name: 'Acme Corp',
          account: { id: 'ACC-9988' },
        },
      };
      const output = service.render(template, context);
      expect(output).toBe('Invoice for Acme Corp (ID: ACC-9988)');
    });
  });

  describe('Custom Helpers', () => {
    it('should format uppercase and lowercase text', () => {
      const template = '{{uppercase title}} - {{lowercase status}}';
      const context = { title: 'hello world', status: 'ACTIVE' };
      const output = service.render(template, context);
      expect(output).toBe('HELLO WORLD - active');
    });

    it('should truncate strings exceeding specified limit', () => {
      const template = '{{truncate description 10}}';
      const context = { description: 'This is a long message that needs trimming' };
      const output = service.render(template, context);
      expect(output).toBe('This is a ...');
    });

    it('should handle ifEquals helper', () => {
      const template = '{{#ifEquals status "CONFIRMED"}}Status is Good{{else}}Pending{{/ifEquals}}';
      expect(service.render(template, { status: 'CONFIRMED' })).toBe('Status is Good');
      expect(service.render(template, { status: 'REJECTED' })).toBe('Pending');
    });

    it('should format json strings', () => {
      const template = 'Data: {{json user}}';
      const context = { user: { id: 1, role: 'ADMIN' } };
      const output = service.render(template, context);
      expect(output).toContain('"role": "ADMIN"');
    });
  });

  describe('Validation & Errors', () => {
    it('should validate valid templates successfully', () => {
      const res = service.validateSyntax('Hello {{name}}');
      expect(res.valid).toBe(true);
    });

    it('should detect mismatched handlebars blocks', () => {
      const res = service.validateSyntax('Hello {{#if user}} name {{/each}}');
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });
  });
});
