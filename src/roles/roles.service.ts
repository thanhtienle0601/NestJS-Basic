/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { IUser } from 'src/users/user.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Role, RoleDocument } from './schemas/role.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import mongoose from 'mongoose';
import aqp from 'api-query-params';
import { ADMIN_ROLE } from 'src/databases/sample';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name)
    private roleModel: SoftDeleteModel<RoleDocument>,
  ) {}
  async findByName(name: string) {
    return await this.roleModel.findOne({ name });
  }
  async create(createRoleDto: CreateRoleDto, user: IUser) {
    const { name, description, isActive, permissions } = createRoleDto;
    const isExistedName = await this.findByName(name);
    if (isExistedName) {
      throw new BadRequestException(`Name: ${name} is existed`);
    }
    const role = await this.roleModel.create({
      name,
      description,
      isActive,
      permissions,
      createdBy: {
        _id: new mongoose.Types.ObjectId(user._id),
        email: user.email,
      },
    });
    return { _id: role?._id, createdAt: role?.createdAt };
  }

  async findAll(current: number, pageSize: number, qs: string) {
    const { filter, sort, projection, population } = aqp(qs);
    delete filter.pageSize;
    delete filter.current;
    // console.log(filter, current, limit);
    const offset = (+current - 1) * +pageSize;
    const defaultLimit = +pageSize ? +pageSize : 10;
    const totalItems = (await this.roleModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.roleModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .populate(population)
      .select(projection as any)
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
    return (await this.roleModel.findById(id)).populate({
      path: 'permissions',
      select: {
        _id: true,
        apiPath: true,
        name: true,
        method: true,
        module: true,
      },
    });
  }

  async update(id: string, updateRoleDto: UpdateRoleDto, user: IUser) {
    const { name, description, isActive, permissions } = updateRoleDto;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`id: ${id} is not a mongo id`);
    }
    const result = await this.roleModel.updateOne(
      { _id: id },
      {
        name,
        description,
        isActive,
        permissions,
        updatedBy: {
          _id: new mongoose.Types.ObjectId(user._id),
          email: user.email,
        },
      },
    );
    return { result };
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`id: ${id} is not a mongo id`);
    }
    const foundRole = await this.roleModel.findById(id);
    if (foundRole.name === ADMIN_ROLE) {
      throw new BadRequestException(`Cannot delete this role`);
    }
    const result = await this.roleModel.softDelete({ _id: id });
    if (result.deleted > 0) {
      await this.roleModel.updateOne({
        deletedBy: {
          _id: new mongoose.Types.ObjectId(user._id),
          email: user.email,
        },
      });
    }
    return { result };
  }
}
