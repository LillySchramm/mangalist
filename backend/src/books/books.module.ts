import { Module } from '@nestjs/common';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { S3Module } from 'src/s3/s3.module';
import { TesseractModule } from 'src/tesseract/tesseract.module';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { SecretsModule } from 'src/secrets/secrets.module';
import { BookGroupsModule } from 'src/book-groups/bookGroups.module';
import { AuthorsModule } from 'src/authors/authors.module';
import { PublishersModule } from 'src/publishers/publishers.module';
import { BookTasksService } from './book-tasks.service';
import { Scraper } from './scraper/scraper';
import { CacheModule } from '@nestjs/cache-manager';
import { BookAiService } from './bookAi.service';
@Module({
    providers: [BooksService, BookAiService, BookTasksService, Scraper],
    controllers: [BooksController],
    imports: [
        S3Module,
        PrismaModule,
        TesseractModule,
        UsersModule,
        AuthModule,
        SecretsModule,
        BookGroupsModule,
        AuthorsModule,
        PublishersModule,
        CacheModule.register(),
    ],
    exports: [BookTasksService, BooksService, BookAiService],
})
export class BooksModule {}
