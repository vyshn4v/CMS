import { Module } from '@nestjs/common';
import { RenderService } from './render.service';
import { RenderController } from './render.controller';
import { ApiKeyModule } from '../api-key/api-key.module';
import { TemplateModule } from '../template/template.module';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

/**
 * Module providing the public Render API engine authenticated via ApiKeyGuard.
 */
@Module({
  imports: [ApiKeyModule, TemplateModule],
  controllers: [RenderController],
  providers: [RenderService, ApiKeyGuard],
  exports: [RenderService],
})
export class RenderModule {}
