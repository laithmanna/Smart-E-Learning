import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { QuestionsService } from './questions.service';
import { SubmissionsService } from './submissions.service';

@Module({
  controllers: [ExamsController],
  providers: [ExamsService, QuestionsService, SubmissionsService],
  exports: [ExamsService, QuestionsService, SubmissionsService],
})
export class ExamsModule {}
