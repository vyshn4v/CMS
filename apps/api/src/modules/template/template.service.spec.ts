import { Test, TestingModule } from '@nestjs/testing';
import { TemplateService } from './template.service';
import { HandlebarsService } from './handlebars.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('TemplateService - Component Subfield & Array Rendering', () => {
  let service: TemplateService;
  let handlebarsService: HandlebarsService;

  const mockPrismaService = {
    template: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    contentType: {
      findFirst: jest.fn(),
    },
    contentEntry: {
      findFirst: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    invalidateTemplate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        HandlebarsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
    handlebarsService = module.get<HandlebarsService>(HandlebarsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Component Array & Subfield Rendering', () => {
    it('should render a JSON array of mapped objects when context provides an array for a component', async () => {
      const result = await service.preview('org-123', null, {
        fieldsDraft: {
          title: '{{title}}',
          authors: {
            fullName: '{{this.firstname}} {{this.lastname}}',
            role: '{{this.role}}',
          },
        },
        variables: {
          title: 'Article Title',
          authors: [
            { firstname: 'John', lastname: 'Doe', role: 'Lead Author' },
            { firstname: 'Jane', lastname: 'Smith', role: 'Co-Author' },
          ],
        },
      });

      expect(result.data.title).toBe('Article Title');
      expect(Array.isArray(result.data.authors)).toBe(true);
      expect(result.data.authors).toHaveLength(2);
      expect(result.data.authors[0]).toEqual({
        fullName: 'John Doe',
        role: 'Lead Author',
      });
      expect(result.data.authors[1]).toEqual({
        fullName: 'Jane Smith',
        role: 'Co-Author',
      });
    });

    it('should render a single object when context provides a single object for a component', async () => {
      const result = await service.preview('org-123', null, {
        fieldsDraft: {
          seo: {
            meta_title: '{{this.meta_title}} | My Site',
            meta_desc: 'Summary: {{this.meta_desc}}',
          },
        },
        variables: {
          seo: {
            meta_title: 'Headless CMS Platform',
            meta_desc: 'Next-generation Strapi alternative.',
          },
        },
      });

      expect(result.data.seo).toEqual({
        meta_title: 'Headless CMS Platform | My Site',
        meta_desc: 'Summary: Next-generation Strapi alternative.',
      });
    });

    it('should handle dot notation subfield keys normalized into component objects', async () => {
      const result = await service.preview('org-123', null, {
        fieldsDraft: {
          'seo.title': '{{this.title}}',
          'seo.description': '{{this.description}}',
        },
        variables: {
          seo: [
            { title: 'Item 1', description: 'Desc 1' },
            { title: 'Item 2', description: 'Desc 2' },
          ],
        },
      });

      expect(Array.isArray(result.data.seo)).toBe(true);
      expect(result.data.seo).toEqual([
        { title: 'Item 1', description: 'Desc 1' },
        { title: 'Item 2', description: 'Desc 2' },
      ]);
    });
  });
});
