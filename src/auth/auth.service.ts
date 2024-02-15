/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { IUser } from 'src/users/user.interface';
import { CreateUserDto, RegisterUserDto } from 'src/users/dto/create-user.dto';
import { genSaltSync, hashSync } from 'bcryptjs';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';
import { Response, response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}
  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user) {
      const isValid = this.usersService.isValidPassword(pass, user.password);
      if (isValid === true) {
        return user;
      }
    }

    return null;
  }
  async login(user: IUser, response: Response) {
    const { _id, name, email, role } = user;
    const payload = {
      sub: 'token login',
      iss: 'from server',
      _id,
      name,
      email,
      role,
    };

    //create refresh token
    const refresh_token = this.createRefreshToken(payload);

    //update user refresh token
    await this.usersService.updateUserRefreshToken(refresh_token, _id);

    //set refresh token to cookies
    response.cookie('refresh_token', refresh_token, {
      maxAge: ms(this.configService.get<string>('JWT_REFRESH_EXPIRE')),
      httpOnly: true,
    });

    return {
      access_token: this.jwtService.sign(payload),
      _id,
      name,
      email,
      role,
    };
  }

  logout = async (response: Response, user: IUser) => {
    try {
      //update user refresh token
      await this.usersService.updateUserRefreshToken(null, user._id);
      //remove refresh token cookie
      response.clearCookie('refresh_token');
      return 'Ok';
    } catch (error) {
      throw new BadRequestException('Cannot logout');
    }
  };

  createRefreshToken = (payload) => {
    const refresh_token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn:
        ms(this.configService.get<string>('JWT_REFRESH_EXPIRE')) / 1000,
    });
    return refresh_token;
  };

  processToken = async (refresh_token: string, response: Response) => {
    try {
      const newToken = this.jwtService.verify(refresh_token, {
        secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      });
      const user = await this.usersService.findUserByToken(refresh_token);
      if (user) {
        const { _id, name, email, role } = user;
        const payload = {
          sub: 'token login',
          iss: 'from server',
          _id,
          name,
          email,
          role,
        };

        //create refresh token
        const refresh_token = this.createRefreshToken(payload);

        //update user refresh token
        await this.usersService.updateUserRefreshToken(
          refresh_token,
          _id.toString(),
        );

        //remove old cookie
        response.clearCookie('refresh_token');

        //set refresh token to cookies
        response.cookie('refresh_token', refresh_token, {
          maxAge: ms(this.configService.get<string>('JWT_REFRESH_EXPIRE')),
          httpOnly: true,
        });

        return {
          access_token: this.jwtService.sign(payload),
          _id,
          name,
          email,
          role,
        };
      } else {
        throw new BadRequestException('User not found');
      }
    } catch (error) {
      throw new BadRequestException('Token expired');
    }
  };

  // async register(registerUserDto: RegisterUserDto) {
  //   const hashPassword = this.getHashPassword(registerUserDto.password);
  //   const result = await this.userModel.create({
  //     name: registerUserDto.name,
  //     email: registerUserDto.email,
  //     password: hashPassword,
  //     address: registerUserDto.address,
  //     gender: registerUserDto.gender,
  //     age: registerUserDto.age,
  //     role: 'USER',
  //   });
  //   return { _id: result._id, createdAt: result.createdAt };
  // }

  async register(registerUserDto: RegisterUserDto) {
    const result = await this.usersService.register(registerUserDto);
    return { _id: result._id, createdAt: result.createdAt };
  }
}
