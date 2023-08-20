import { ApiProperty } from '@nestjs/swagger';
import { Session } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class SessionDto implements Session {
    @ApiProperty()
    id: string;
    @ApiProperty()
    userId: string;
    @Exclude()
    invalidated: boolean;
    @ApiProperty()
    name: string;
    @ApiProperty()
    createdAt: Date;

    constructor(partial: Partial<SessionDto>) {
        Object.assign(this, partial);
    }
}