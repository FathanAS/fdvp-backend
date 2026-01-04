import { Module, Global } from '@nestjs/common';
import { ActivityLoggerService } from './activity-logger.service';

@Global() // Make this service available globally without importing the module
@Module({
    providers: [ActivityLoggerService],
    exports: [ActivityLoggerService],
})
export class ActivityLoggerModule { }
