/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { IUser } from 'src/users/user.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Job, JobDocument } from './schemas/job.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import mongoose from 'mongoose';
import aqp from 'api-query-params';
import dayjs from 'dayjs';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name) private jobModel: SoftDeleteModel<JobDocument>,
  ) {}
  async create(createJobDto: CreateJobDto, user: IUser) {
    console.log(createJobDto, user);
    if (dayjs(createJobDto.startDate).isAfter(createJobDto.endDate)) {
      throw new BadRequestException('EndDate must be larger than startDate');
    }
    const job = await this.jobModel.create({
      ...createJobDto,
      company: {
        _id: new mongoose.Types.ObjectId(createJobDto.company._id),
        name: createJobDto.company.name,
      },
      createdBy: {
        _id: new mongoose.Types.ObjectId(user._id),
        email: user.email,
      },
    });

    return { _id: job._id, createAt: job.createdAt };
  }

  async findAll(current: number, pageSize: number, qs: string) {
    const { filter, sort, projection, population } = aqp(qs);
    delete filter.pageSize;
    delete filter.current;
    // console.log(filter, current, limit);
    const offset = (+current - 1) * +pageSize;
    const defaultLimit = +pageSize ? +pageSize : 10;
    const totalItems = (await this.jobModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.jobModel
      .find(filter)
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

  async findOne(id: string) {
    const job = await this.jobModel.findById(id);
    return job;
  }

  async update(id: string, updateJobDto: UpdateJobDto, user: IUser) {
    console.log(updateJobDto, id);
    const job = await this.jobModel.updateOne(
      { _id: id },
      {
        ...updateJobDto,
        company: {
          _id: new mongoose.Types.ObjectId(updateJobDto.company._id),
          name: updateJobDto.company.name,
        },
        updatedBy: {
          _id: new mongoose.Types.ObjectId(user._id),
          email: user.email,
        },
      },
    );
    return job;
  }

  async remove(id: string, user: IUser) {
    const result = await this.jobModel.softDelete({ _id: id });
    if (result.deleted > 0) {
      await this.jobModel.updateOne(
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
