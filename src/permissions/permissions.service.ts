/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { IUser } from 'src/users/user.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Permission, PermissionDocument } from './schemas/permission.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import mongoose from 'mongoose';
import aqp from 'api-query-params';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name)
    private permissionModel: SoftDeleteModel<PermissionDocument>,
  ) {}

  async findByApiPath(apiPath: string) {
    return await this.permissionModel.findOne({ apiPath });
  }

  async findByMethod(method: string) {
    return await this.permissionModel.findOne({ method });
  }

  async create(createPermissionDto: CreatePermissionDto, user: IUser) {
    const { name, apiPath, method, module } = createPermissionDto;
    const existedApiPath = await this.findByApiPath(apiPath);
    const existedMethod = await this.findByMethod(method);
    const isExisted = await this.permissionModel.findOne({ apiPath, method });
    if (isExisted) {
      throw new BadRequestException(
        `apiPath ${apiPath} and method ${method} are existed`,
      );
    }
    const permission = await this.permissionModel.create({
      name,
      apiPath,
      method,
      module,
      createdBy: {
        _id: new mongoose.Types.ObjectId(user._id),
        email: user.email,
      },
    });
    return { _id: permission?._id, createdAt: permission?.createdAt };
  }

  async findAll(current: number, pageSize: number, qs: string) {
    const { filter, sort, projection, population } = aqp(qs);
    delete filter.pageSize;
    delete filter.current;
    // console.log(filter, current, limit);
    const offset = (+current - 1) * +pageSize;
    const defaultLimit = +pageSize ? +pageSize : 10;
    const totalItems = (await this.permissionModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.permissionModel
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
      throw new BadRequestException(`id: ${id} is not a mongo id`);
    }
    return await this.permissionModel.findById(id);
  }

  async update(
    id: string,
    updatePermissionDto: UpdatePermissionDto,
    user: IUser,
  ) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`id: ${id} is not a mongo id`);
    }
    const result = await this.permissionModel.updateOne({
      ...updatePermissionDto,
      updatedBy: {
        _id: new mongoose.Types.ObjectId(user._id),
        email: user.email,
      },
    });
    return { result };
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`id: ${id} is not a mongo id`);
    }
    const result = await this.permissionModel.softDelete({ _id: id });
    if (result.deleted > 0) {
      await this.permissionModel.updateOne({
        updatedBy: {
          _id: new mongoose.Types.ObjectId(user._id),
          email: user.email,
        },
      });
    }
    return { result };
  }
}
