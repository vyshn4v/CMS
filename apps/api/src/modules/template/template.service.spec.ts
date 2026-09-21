import { Test, TestingModule } from '@nestjs/testing';
import { TemplateService } from './template.service';
import { HandlebarsService } from './handlebars.service';
import { TemplateEngineService } from './template-engine.service';
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
        TemplateEngineService,
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

      const data = result.data as any;
      expect(data.title).toBe('Article Title');
      expect(Array.isArray(data.authors)).toBe(true);
      expect(data.authors).toHaveLength(2);
      expect(data.authors[0]).toEqual({
        fullName: 'John Doe',
        role: 'Lead Author',
      });
      expect(data.authors[1]).toEqual({
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

      const data = result.data as any;
      expect(data.seo).toEqual({
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

      const data = result.data as any;
      expect(Array.isArray(data.seo)).toBe(true);
      expect(data.seo).toEqual([
        { title: 'Item 1', description: 'Desc 1' },
        { title: 'Item 2', description: 'Desc 2' },
      ]);
    });
  });

  describe('Dynamic Zone Polymorphic Block Rendering', () => {
    it('should render a polymorphic array of component blocks with __component discriminators', async () => {
      const result = await service.preview('org-123', null, {
        fieldsDraft: {
          title: '{{title}}',
          page_content: {
            __dynamicZone: true,
            hero: {
              headline: 'HERO: {{this.headline}}',
              tagline: '{{this.tagline}}',
            },
            rich_text: {
              html: '<div class="prose">{{{this.content}}}</div>',
            },
            cta: {
              buttonText: 'Action: {{this.label}}',
              link: '{{this.url}}',
            },
          },
        },
        variables: {
          title: 'Home Page',
          page_content: [
            {
              __component: 'hero',
              headline: 'Welcome to CMS',
              tagline: 'Next-gen headless content engine',
            },
            {
              __component: 'rich_text',
              content: '<p>Polymorphic content blocks are powerful.</p>',
            },
            {
              __component: 'cta',
              label: 'Sign Up Now',
              url: 'https://example.com/signup',
            },
          ],
        },
      });

      const data = result.data as any;
      expect(data.title).toBe('Home Page');
      expect(Array.isArray(data.page_content)).toBe(true);
      expect(data.page_content).toHaveLength(3);
      expect(data.page_content[0]).toEqual({
        __component: 'hero',
        headline: 'HERO: Welcome to CMS',
        tagline: 'Next-gen headless content engine',
      });
      expect(data.page_content[1]).toEqual({
        __component: 'rich_text',
        html: '<div class="prose"><p>Polymorphic content blocks are powerful.</p></div>',
      });
      expect(data.page_content[2]).toEqual({
        __component: 'cta',
        buttonText: 'Action: Sign Up Now',
        link: 'https://example.com/signup',
      });
    });

    it('should render a single block object for a dynamic zone if context provides an object', async () => {
      const result = await service.preview('org-123', null, {
        fieldsDraft: {
          featured_section: {
            __dynamicZone: true,
            banner: {
              title: 'BANNER: {{this.heading}}',
            },
          },
        },
        variables: {
          featured_section: {
            __component: 'banner',
            heading: 'Flash Sale 50% Off',
          },
        },
      });

      const data = result.data as any;
      expect(data.featured_section).toEqual({
        __component: 'banner',
        title: 'BANNER: Flash Sale 50% Off',
      });
    });

    it('should gracefully fallback when an unknown block component discriminator is passed', async () => {
      const result = await service.preview('org-123', null, {
        fieldsDraft: {
          page_content: {
            __dynamicZone: true,
            hero: {
              headline: 'HERO: {{this.headline}}',
            },
          },
        },
        variables: {
          page_content: [
            {
              __component: 'unconfigured_block',
              raw_value: 'test',
            },
          ],
        },
      });

      const data = result.data as any;
      expect(data.page_content).toEqual([
        {
          __component: 'unconfigured_block',
          raw_value: 'test',
        },
      ]);
    });
  });
});
