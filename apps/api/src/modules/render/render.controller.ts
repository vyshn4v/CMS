import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RenderService } from './render.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { RenderRequest } from '@cms/shared-types';

/**
 * Public endpoint allowing external consumer applications to render published
 * templates authenticated via organization API keys.
 */
@Controller('render')
@UseGuards(ApiKeyGuard)
export class RenderController {
  constructor(private readonly renderService: RenderService) {}

  /**
   * Render a template with data, variables, and optional content entry context.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async render(@Req() req: any, @Body() body: RenderRequest) {
    const orgId = req.orgId;
    return this.renderService.render(orgId, body);
  }
}
