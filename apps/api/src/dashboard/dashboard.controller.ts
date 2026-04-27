import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.getStats(user);
  }

  @Get('today')
  today(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.getToday(user);
  }

  @Get('up-next')
  upNext(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.getUpNext(user);
  }

  @Get('momentum')
  momentum(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.getMomentum(user);
  }
}
