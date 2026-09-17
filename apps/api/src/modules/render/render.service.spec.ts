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

    // Check that safe fields still rendered properly
    expect(result.data.normalField).toBe('safeValue');
    expect(result.data.seo).toBeDefined();
    expect(result.data.seo.meta_title).toBe('Safe Title');
  });
});
