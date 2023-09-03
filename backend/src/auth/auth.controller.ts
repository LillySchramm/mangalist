import {
    Body,
    Controller,
    Post,
    HttpCode,
    HttpStatus,
    UseGuards,
    Request,
    Get,
    BadRequestException,
    ConflictException,
    Query,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserDto } from 'src/users/dto/user.dto';
import { SignUpDto } from './dto/signUp.dto';
import { UsersService } from 'src/users/users.service';
import { Request as ExpressRequest } from 'express';
import { SessionDto } from './dto/session.dto';
import { UserTokenDto } from './dto/userToken.dto';
import { ResetPasswordRequestDto } from './dto/resetPasswordRequest.dto';
import { ResetPasswordDto } from './dto/resetPassword.dto';
import { NewPasswordDto } from './dto/newPassword.dto';
import { SignInDto } from './dto/signIn.dto';
import * as config from 'config';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(
        private authService: AuthService,
        private userService: UsersService,
    ) {}

    @HttpCode(HttpStatus.OK)
    @Post('login')
    async signIn(
        @Body() signInDto: SignInDto,
        @Request() request: ExpressRequest,
    ): Promise<UserTokenDto> {
        return await this.authService.signIn(
            signInDto.email,
            signInDto.password,
            request.headers['user-agent'] || '',
        );
    }

    @HttpCode(HttpStatus.OK)
    @Post('logout')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    async signOut(@Request() request: any) {
        await this.authService.invalidateSession(request.session.id);
    }

    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: UserTokenDto })
    @Get('token')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    async getNewToken(@Request() request: any): Promise<UserTokenDto> {
        return await this.authService.createNewToken(
            request.user,
            request.session,
        );
    }

    @ApiOkResponse({ type: UserDto })
    @Post('signup')
    async signUp(@Body() signUpDto: SignUpDto) {
        const userCount = await this.userService.getUserCount();
        if (userCount !== 0 && config.get<boolean>('disable_registration')) {
            throw new BadRequestException('Registration is disabled.');
        }

        const doesAlreadyExist = await this.userService.doesAlreadyExist(
            signUpDto.email,
            signUpDto.name,
        );
        if (doesAlreadyExist) {
            throw new ConflictException('User already exists.');
        }

        return new UserDto(
            await this.userService.createUser(
                signUpDto.name,
                signUpDto.email,
                signUpDto.password,
            ),
        );
    }

    @ApiOkResponse({ type: ResetPasswordDto })
    @Post('request-reset')
    async requestResetPassword(@Body() body: ResetPasswordRequestDto) {
        const user = await this.userService.findByEmail(body.email);
        if (!user) {
            return new NotFoundException('User not found.');
        }

        const resetRequest = await this.userService.createPasswordResetRequest(
            user,
        );

        return new ResetPasswordDto({
            ...resetRequest.request,
            token: resetRequest.token,
        });
    }

    @ApiOkResponse()
    @Post('reset')
    async resetPassword(@Body() body: NewPasswordDto) {
        const user = await this.userService.findById(body.userId);
        if (!user) {
            return new NotFoundException('User not found.');
        }

        const ok = await this.userService.resetPassword(
            user.id,
            body.resetToken,
            body.resetId,
            body.newPassword,
        );
        if (!ok) throw new UnauthorizedException();
    }

    @ApiOkResponse()
    @Post('resend')
    async resend(@Query('user_id') userId: string) {
        if (!userId) throw new BadRequestException();

        const user = await this.userService.findById(userId);
        if (!user) throw new NotFoundException('User not found');
        if (user.activated)
            throw new BadRequestException('User already activated');

        await this.userService.createUserVerification(user);
    }

    @ApiOkResponse()
    @Get('verify')
    async verify(@Query() query: any) {
        if (!query.user_id || !query.key || !query.id)
            throw new BadRequestException();

        const user = await this.userService.findById(query.user_id);
        if (!user) throw new NotFoundException('User not found');
        if (user.activated)
            throw new BadRequestException('User already activated');

        const ok = await this.userService.validateVerification(
            query.id,
            query.user_id,
            query.key,
        );

        if (!ok) throw new UnauthorizedException();

        return { status: 'ok' };
    }

    @UseGuards(AuthGuard)
    @Get('profile')
    @ApiOkResponse({ type: UserDto })
    @ApiBearerAuth()
    getProfile(@Request() req: any) {
        return new UserDto(req.user);
    }

    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @Get('session')
    @ApiOkResponse({ type: SessionDto })
    getSession(@Request() req: any) {
        return new SessionDto(req.session);
    }
}
