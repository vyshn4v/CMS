import { Module } from '@nestjs/common';
import { TemplateService } from './template.service';
import { TemplateController } from './template.controller';
import { HandlebarsService } from './handlebars.service';
import { TemplateEngineService } from './template-engine.service';

/**
 * Module managing template authoring, compilation, draft/publish lifecycle, and rendering.
 */
@Module({
  controllers: [TemplateController],
  providers: [TemplateService, HandlebarsService, TemplateEngineService],
  exports: [TemplateService, HandlebarsService, TemplateEngineService],
})
export class TemplateModule {}
