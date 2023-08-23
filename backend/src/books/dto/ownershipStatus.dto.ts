import { ApiProperty } from '@nestjs/swagger';
import { BookStatus, OwnershipStatus } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class OwnershipStatusDto implements OwnershipStatus {
    @ApiProperty()
    status: BookStatus;
    @Exclude()
    createdAt: Date;
    @ApiProperty()
    updatedAt: Date;
    @ApiProperty()
    userId: string;
    @ApiProperty()
    bookIsbn: string;

    constructor(partial: Partial<OwnershipStatusDto>) {
        Object.assign(this, partial);
    }
}
