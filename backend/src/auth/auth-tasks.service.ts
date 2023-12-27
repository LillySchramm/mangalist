import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuthService } from './auth.service';
import { LokiLogger } from 'src/loki/loki-logger/loki-logger.service';

@Injectable()
export class AuthTasksService {
    private readonly logger = new LokiLogger(AuthTasksService.name);

    constructor(private authService: AuthService) {}

    @Cron('0 * * * * *')
    async invalidateOutdatedSessions() {
        const invalidatedCount =
            await this.authService.invalidateExpiredSessions();
        if (!invalidatedCount) return;

        this.logger.log(`Invalidated ${invalidatedCount} sessions!`);
    }

    @Cron('0 * * * * *')
    async invalidateOutdatedTempSessions() {
        const invalidatedCount =
            await this.authService.invalidateOldNonPermanentSessions();
        if (!invalidatedCount) return;

        this.logger.log(
            `Invalidated ${invalidatedCount} non-permanent sessions!`,
        );
    }
}
