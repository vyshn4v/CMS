import { Module } from '@nestjs/common';
import { TemplateService } from './template.service';
import { TemplateController } from './template.controller';
import { HandlebarsService } from './handlebars.service';

/**
 * Module managing template authoring, compilation, draft/publish lifecycle, and rendering.
 */
@Module({
  controllers: [TemplateController],
  providers: [TemplateService, HandlebarsService],
  exports: [TemplateService, HandlebarsService],
})
export class TemplateModule {}
