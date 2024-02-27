/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateResumeDto, CreateUserCvDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { IUser } from 'src/users/user.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Resume, ResumeDocument } from './schemas/resume.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import mongoose from 'mongoose';
import aqp from 'api-query-params';

@Injectable()
export class ResumesService {
  constructor(
    @InjectModel(Resume.name)
    private resumeModel: SoftDeleteModel<ResumeDocument>,
  ) {}

  async create(createUserCvDto: CreateUserCvDto, user: IUser) {
    console.log(createUserCvDto, user);
    const { url, companyId, jobId } = createUserCvDto;
    const resume = await this.resumeModel.create({
      url,
      companyId,
      jobId,
      email: user.email,
      userId: user._id,
      status: 'PENDING',
      history: [
        {
          status: 'PENDING',
          updatedAt: new Date(),
          updatedBy: {
            _id: new mongoose.Types.ObjectId(user._id),
            email: user.email,
          },
        },
      ],
      createdBy: {
        _id: new mongoose.Types.ObjectId(user._id),
        email: user.email,
      },
    });
    return { _id: resume._id, createdAt: resume.createdAt };
  }

  async findAll(current: number, pageSize: number, qs: string) {
    const { filter, sort, projection, population } = aqp(qs);
    delete filter.pageSize;
    delete filter.current;
    // console.log(filter, current, limit);
    const offset = (+current - 1) * +pageSize;
    const defaultLimit = +pageSize ? +pageSize : 10;
    const totalItems = (await this.resumeModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.resumeModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .select(projection as any)
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`${id} is not a mongo id`);
    }
    const resume = await this.resumeModel.findById(id);
    return resume;
  }

  async update(id: string, updateResumeDto: UpdateResumeDto, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`${id} is not a mongo id`);
    }
    const resume = await this.resumeModel.updateOne(
      { _id: id },
      {
        status: updateResumeDto.status,
        $push: {
          history: {
            status: updateResumeDto.status,
            updatedAt: new Date(),
            updatedBy: {
              _id: new mongoose.Types.ObjectId(user._id),
              email: user.email,
            },
          },
        },
      },
    );
    return resume;
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`${id} is not a mongo id`);
    }
    const result = await this.resumeModel.softDelete({ _id: id });
    if (result.deleted > 0) {
      await this.resumeModel.updateOne(
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

  findResumeByUser = async (user: IUser) => {
    const resume = await this.resumeModel
      .find({ userId: user._id })
      .sort('-createdAt')
      .populate([
        { path: 'companyId', select: { name: true } },
        { path: 'jobId', select: { name: true } },
      ]);
    return resume;
  };
}
