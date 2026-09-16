import { Module } from '@nestjs/common';
import { SchemaService } from './schema.service';
import { SchemaController } from './schema.controller';
import { ComponentsController } from './components.controller';

/**
 * Module encapsulating schema builder logic and field validation.
 */
@Module({
  controllers: [SchemaController, ComponentsController],
  providers: [SchemaService],
  exports: [SchemaService],
})
export class SchemaModule {}
