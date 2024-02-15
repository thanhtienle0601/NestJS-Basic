/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto, RegisterUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import mongoose, { Model } from 'mongoose';
import { compareSync, genSaltSync, hashSync } from 'bcryptjs';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from './user.interface';
import aqp from 'api-query-params';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>,
  ) {}

  getHashPassword = (password: string) => {
    const salt = genSaltSync(10);
    const hash = hashSync(password, salt);
    return hash;
  };

  isValidPassword = (password: string, hash: string) => {
    return compareSync(password, hash);
  };

  findByEmail(email: string) {
    // if (!mongoose.Types.ObjectId.isValid(username)) {
    //   return 'User not found';
    // }
    return this.userModel.findOne({ email: email });
  }

  async create(createUserDto: CreateUserDto, user: IUser) {
    const countUser = await this.findByEmail(createUserDto.email);
    if (countUser) {
      return 'Email has already in use';
    } else {
      const hashPassword = this.getHashPassword(createUserDto.password);
      let result = await this.userModel.create({
        email: createUserDto.email,
        password: hashPassword,
        name: createUserDto.name,
        address: createUserDto.address,
        gender: createUserDto.gender,
        age: createUserDto.age,
        role: createUserDto.role,
        company: {
          _id: new mongoose.Types.ObjectId(createUserDto.company._id),
          name: createUserDto.company.name,
        },
        createdBy: {
          _id: new mongoose.Types.ObjectId(user._id),
          email: user.email,
        },
      });
      return { _id: result?._id, createdAt: result.createdAt };
    }
  }

  async register(registerUserDto: RegisterUserDto) {
    const { email, name, password, address, gender, age } = registerUserDto;

    // const countUser = await this.findByEmail(createUserDto.email);
    // if (countUser) {
    //   return 'Email has already in use';
    // }
    const isExist = await this.userModel.findOne({ email });
    if (isExist) {
      throw new BadRequestException(`Email ${email} has already used `);
    }
    const hashPassword = this.getHashPassword(registerUserDto.password);
    let result = await this.userModel.create({
      email,
      password: hashPassword,
      name,
      address,
      gender,
      age,
      role: 'USER',
    });
    return { _id: result?._id, createdAt: result.createdAt };
  }
  // create(createUserDto: CreateUserDto) {
  //   return 'This action adds a new user';
  // }

  async findAll(current: number, pageSize: number, qs: string) {
    const { filter, sort, projection, population } = aqp(qs);
    delete filter.pageSize;
    delete filter.current;
    // console.log(filter, current, limit);
    const offset = (+current - 1) * +pageSize;
    const defaultLimit = +pageSize ? +pageSize : 10;
    const totalItems = (await this.userModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.userModel
      .find(filter, { password: false })
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .populate(population)
      .exec();
    return {
      meta: {
        current, //trang hiện tại
        pageSize, //số lượng bản ghi đã lấy
        pages: totalPages, //tổng số trang với điều kiện query
        total: totalItems, // tổng số phần tử (số bản ghi)
      },
      result, //kết quả query
    };
  }

  findByUsername(username: string) {
    // if (!mongoose.Types.ObjectId.isValid(username)) {
    //   return 'User not found';
    // }
    return this.userModel.findOne({ email: username });
  }

  findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return 'User not found';
    }
    return this.userModel.findOne({ _id: id }, { password: false });
  }

  async update(updateUserDto: UpdateUserDto, user: IUser) {
    return await this.userModel.updateOne(
      { _id: updateUserDto._id },
      {
        ...updateUserDto,
        company: {
          _id: new mongoose.Types.ObjectId(updateUserDto.company._id),
          name: updateUserDto.company.name,
        },
        updatedBy: {
          _id: new mongoose.Types.ObjectId(user._id),
          email: user.email,
        },
      },
    );
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return 'User not found';
    }
    const result = await this.userModel.softDelete({ _id: id });
    if (result.deleted > 0) {
      await this.userModel.updateOne(
        { _id: id },
        {
          deletedBy: {
            _id: new mongoose.Types.ObjectId(user._id),
            email: user.email,
          },
        },
      );
    }
    return result;
  }

  updateUserRefreshToken = async (refreshToken: string, _id: string) => {
    return await this.userModel.updateOne({ _id }, { refreshToken });
  };

  findUserByToken = async (refreshToken: string) => {
    return await this.userModel.findOne({ refreshToken });
  };
}
