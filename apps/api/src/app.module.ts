import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AdminsModule } from './admins/admins.module';
import { AppController } from './app.controller';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { ClassesModule } from './classes/classes.module';
import { ClientsModule } from './clients/clients.module';
import { CommonModule } from './common/common.module';
import { CoordinatorsModule } from './coordinators/coordinators.module';
import { CoursesModule } from './courses/courses.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { ExamsModule } from './exams/exams.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuestionTemplatesModule } from './question-templates/question-templates.module';
import { StudentsModule } from './students/students.module';
import { SurveysModule } from './surveys/surveys.module';
import { TrainersModule } from './trainers/trainers.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    TrainersModule,
    CoordinatorsModule,
    AdminsModule,
    ClientsModule,
    CoursesModule,
    ClassesModule,
    EnrollmentsModule,
    AttendanceModule,
    ExamsModule,
    QuestionTemplatesModule,
    SurveysModule,
    EvaluationsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
