/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import { IUser } from 'src/users/user.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Subscriber, SubscriberDocument } from './schemas/subscriber.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import mongoose from 'mongoose';
import aqp from 'api-query-params';

@Injectable()
export class SubscribersService {
  constructor(
    @InjectModel(Subscriber.name)
    private subscriberModel: SoftDeleteModel<SubscriberDocument>,
  ) {}
  async create(createSubscriberDto: CreateSubscriberDto, user: IUser) {
    const { name, email, skills } = createSubscriberDto;
    const isExist = await this.subscriberModel.findOne({ email });
    if (isExist) {
      throw new BadRequestException(`Email ${email} has already existed`);
    }
    const subscriber = await this.subscriberModel.create({
      name,
      email,
      skills,
      createdBy: {
        _id: new mongoose.Types.ObjectId(user._id),
        email: user.email,
      },
    });
    return { _id: subscriber?._id, createdAt: subscriber?.createdAt };
  }

  async findAll(current: number, pageSize: number, qs: string) {
    const { filter, sort, projection, population } = aqp(qs);
    delete filter.pageSize;
    delete filter.current;
    // console.log(filter, current, limit);
    const offset = (+current - 1) * +pageSize;
    const defaultLimit = +pageSize ? +pageSize : 10;
    const totalItems = (await this.subscriberModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.subscriberModel
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

  findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('id is not mongo id');
    }
    return this.subscriberModel.findOne({ _id: id });
  }

  async update(
    id: string,
    updateSubscriberDto: UpdateSubscriberDto,
    user: IUser,
  ) {
    const { name, email, skills } = updateSubscriberDto;
    const result = await this.subscriberModel.updateOne(
      { _id: id },
      {
        name,
        email,
        skills,
        updatedBy: {
          _id: new mongoose.Types.ObjectId(user._id),
          email: user.email,
        },
      },
    );
    return result;
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('id is not mongo id');
    }
    const result = await this.subscriberModel.softDelete({ _id: id });
    if (result.deleted > 0) {
      await this.subscriberModel.updateOne(
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
}
