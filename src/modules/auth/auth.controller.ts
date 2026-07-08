import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiBody,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ApiResponse } from '../../common/types/api-response.js';
import { IAuthService } from './interfaces/auth.service.interface.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(IAuthService) private readonly authService: IAuthService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @SwaggerApiResponse({
    status: 201,
    description: 'User registered successfully',
  })
  @SwaggerApiResponse({ status: 400, description: 'Validation failed' })
  @SwaggerApiResponse({ status: 409, description: 'Email already registered' })
  async register(
    @Body(new ZodValidationPipe(RegisterDto.schema)) dto: RegisterDto,
  ): Promise<ApiResponse> {
    const { user, tokens } = await this.authService.register(dto);
    return new ApiResponse('User registered successfully', {
      user,
      accessToken: tokens.accessToken,
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @SwaggerApiResponse({ status: 200, description: 'Login successful' })
  @SwaggerApiResponse({ status: 400, description: 'Validation failed' })
  @SwaggerApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(
    @Body(new ZodValidationPipe(LoginDto.schema)) dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse> {
    const { user, tokens } = await this.authService.login(dto);

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return new ApiResponse('Login successful', {
      user,
      accessToken: tokens.accessToken,
    });
  }

  @Post('rotate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token' })
  @ApiCookieAuth()
  @SwaggerApiResponse({
    status: 200,
    description: 'Token rotated successfully',
  })
  @SwaggerApiResponse({
    status: 401,
    description: 'Invalid/revoked/expired refresh token',
  })
  async rotate(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse> {
    const refreshToken: string | undefined = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException({
        code: 'auth.refresh.invalid',
        message: 'Invalid refresh token',
      });
    }
    const tokens = await this.authService.rotate(refreshToken);

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return new ApiResponse('Token rotated successfully', {
      accessToken: tokens.accessToken,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiCookieAuth()
  @SwaggerApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse> {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie('refresh_token', { path: '/' });
    return new ApiResponse('Logged out successfully');
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @SwaggerApiResponse({
    status: 200,
    description: 'User retrieved successfully',
  })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized' })
  async me(@CurrentUser('id') userId: string): Promise<ApiResponse> {
    const user = await this.authService.me(userId);
    return new ApiResponse('User retrieved successfully', { user });
  }
}
