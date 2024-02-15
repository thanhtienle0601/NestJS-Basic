/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  Controller,
  Get,
  Post,
  UseGuards,
  Body,
  Res,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public, ResponseMessage, User } from 'src/decorator/customize';
import { LocalAuthGuard } from './local-auth.guard';
import { RegisterUserDto } from 'src/users/dto/create-user.dto';
import { Response, Request } from 'express';
import { IUser } from 'src/users/user.interface';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('/login')
  handleLogin(@Req() request, @Res({ passthrough: true }) response: Response) {
    return this.authService.login(request.user, response);
  }

  @Post('/logout')
  @ResponseMessage('Logout user')
  handleLogout(
    @User() user: IUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.logout(response, user);
  }

  @Public()
  @ResponseMessage('Register a new user')
  @Post('/register')
  register(@Body() registeruserDto: RegisterUserDto) {
    return this.authService.register(registeruserDto);
  }

  @Get('/account')
  @ResponseMessage('get user information')
  getAccount(@User() user: IUser) {
    return { user };
  }

  @Public()
  @Get('/refresh')
  @ResponseMessage('get user from refresh token')
  getRefreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refresh_token = request.cookies['refresh_token'];
    return this.authService.processToken(refresh_token, response);
  }
}
