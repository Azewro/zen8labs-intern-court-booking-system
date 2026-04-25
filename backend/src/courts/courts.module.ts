import { Module } from '@nestjs/common';
import { CourtsService } from './courts.service';
import { CourtsController } from './courts.controller';

@Module({
  controllers: [CourtsController],
  providers: [CourtsService],
})
export class CourtsModule {}
