import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('stats')
    getStats() {
        return this.dashboardService.getStats();
    }

    @Get('activity')
    getActivity() {
        return this.dashboardService.getRecentActivity();
    }

    @Get('chart')
    getChartData() {
        return this.dashboardService.getChartData();
    }
}
