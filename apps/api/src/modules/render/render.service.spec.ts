import { Test, TestingModule } from '@nestjs/testing';
import { RenderService } from './render.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HandlebarsService } from '../template/handlebars.service';
import { RedisService } from '../redis/redis.service';

describe('RenderService (SEC-04 Prototype Pollution Protection)', () => {
  let service: RenderService;
  let prisma: any;
  let handlebars: any;

  beforeEach(async () => {
    prisma = {
      template: { findFirst: jest.fn() },
      contentType: { findFirst: jest.fn() },
      contentEntry: { findFirst: jest.fn() },
    };

    handlebars = {
      render: jest.fn().mockImplementation((tpl: string, data: any) => tpl),
      compileAndRender: jest.fn().mockImplementation((tpl: string, data: any) => tpl),
    };

    const redis = {
      getPublishedTemplate: jest.fn().mockResolvedValue(null),
      setPublishedTemplate: jest.fn().mockResolvedValue(undefined),
      getPublishedEntry: jest.fn().mockResolvedValue(null),
      setPublishedEntry: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RenderService,
        { provide: PrismaService, useValue: prisma },
        { provide: HandlebarsService, useValue: handlebars },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<RenderService>(RenderService);
  });

  it('SEC-04: drops __proto__, constructor, and prototype keys preventing prototype pollution', async () => {
    const maliciousTemplate: any = {
      id: 'tpl-1',
      orgId: 'org-1',
      type: 'CUSTOM',
      fieldsPublished: {
        '__proto__.polluted': 'evil',
        'constructor.prototype.polluted2': 'evil2',
        'normalField': 'safeValue',
        'seo.meta_title': 'Safe Title',
      },
      contentType: {
        schema: {
          fields: [
            { name: 'normalField', type: 'text' },
            { name: 'seo', type: 'component' },
          ],
        },
      },
    };

    prisma.template.findFirst.mockResolvedValue(maliciousTemplate);

    const result = await service.render('org-1', {
      templateId: 'tpl-1',
      data: { title: 'Test' },
    });

    // Check that Object.prototype was NOT polluted
    expect((Object.prototype as any).polluted).toBeUndefined();
    expect((Object.prototype as any).polluted2).toBeUndefined();
    expect((({} as any)).polluted).toBeUndefined();

    // Check that safe fields still rendered properly in output
    expect(result.output.normalField).toBe('safeValue');
    expect(result.output.seo).toBeDefined();
    expect(result.output.seo.meta_title).toBe('Safe Title');

    // Backward compatibility getter
    expect(result.data.normalField).toBe('safeValue');

    // Verify model and template metadata are excluded from the output
    expect(result.model).toBeUndefined();
    expect(result.template).toBeUndefined();

    // Verify JSON serialization contains ONLY type and output (no duplicate data key or metadata)
    const json = JSON.parse(JSON.stringify(result));
    expect(json.output).toBeDefined();
    expect(json.output.normalField).toBe('safeValue');
    expect(json.data).toBeUndefined();
    expect(json.model).toBeUndefined();
    expect(json.template).toBeUndefined();
  });

  it('strictly prioritizes stored contentEntry data over conflicting body data when contentId is supplied', async () => {
    const template: any = {
      id: 'tpl-2',
      orgId: 'org-1',
      type: 'CUSTOM',
      bodyPublished: 'Title: {{title}} | Author: {{author}}',
      contentType: null,
    };

    const contentEntry: any = {
      id: 'entry-123',
      orgId: 'org-1',
      publishedData: {
        title: 'Real Article From Database',
        author: 'Database Author',
      },
    };

    prisma.template.findFirst.mockResolvedValue(template);
    prisma.contentEntry.findFirst.mockResolvedValue(contentEntry);

    // Provide conflicting data in the request body (e.g. leftover from Swagger template)
    const result = await service.render('org-1', {
      templateId: 'tpl-2',
      contentId: 'entry-123',
      data: {
        title: 'Conflicting Fake Title', // should NOT overwrite the database entry
      },
    });

    expect(handlebars.render).toHaveBeenCalledWith(
      template.bodyPublished,
      expect.objectContaining({
        title: 'Real Article From Database',
        author: 'Database Author',
      }),
    );
  });

  it('preserves component subfields as discrete structured objects rather than concatenating them', async () => {
    const template: any = {
      id: 'tpl-comp',
      orgId: 'org-1',
      type: 'CUSTOM',
      fieldsPublished: {
        seo: {
          meta_title: 'Title: {{this.meta_title}}',
          meta_desc: 'Desc: {{this.meta_desc}}',
        },
        page_title: '{{page_title}}',
      },
      contentType: {
        schema: {
          fields: [
            { name: 'page_title', type: 'text' },
            { name: 'seo', type: 'component' },
          ],
        },
      },
    };

    const contentEntry: any = {
      id: 'entry-comp-1',
      orgId: 'org-1',
      publishedData: {
        page_title: 'My Landing Page',
        seo: {
          meta_title: 'Launch 2026',
          meta_desc: 'Next gen platform',
          __component: 'seo-meta',
        },
      },
    };

    handlebars.render.mockImplementation((tpl: string, scope: any) => {
      if (tpl === 'Title: {{this.meta_title}}') return `Title: ${scope.meta_title}`;
      if (tpl === 'Desc: {{this.meta_desc}}') return `Desc: ${scope.meta_desc}`;
      if (tpl === '{{page_title}}') return scope.page_title;
      return tpl;
    });

    prisma.template.findFirst.mockResolvedValue(template);
    prisma.contentEntry.findFirst.mockResolvedValue(contentEntry);

    const result = await service.render('org-1', {
      templateId: 'tpl-comp',
      contentId: 'entry-comp-1',
    });

    expect(result.output.page_title).toBe('My Landing Page');
    expect(typeof result.output.seo).toBe('object');
    expect(result.output.seo.meta_title).toBe('Title: Launch 2026');
    expect(result.output.seo.meta_desc).toBe('Desc: Next gen platform');

    // Must NOT be concatenated into a single string
    expect(typeof result.output.seo).not.toBe('string');
  });
});

