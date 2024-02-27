import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { CreateUserCvDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { User } from 'src/decorator/customize';
import { IUser } from 'src/users/user.interface';

@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post()
  create(
    @Body()
    createUserCvDto: CreateUserCvDto,
    @User() user: IUser,
  ) {
    return this.resumesService.create(createUserCvDto, user);
  }

  @Get()
  findAll(
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
    @Query() qs: string,
  ) {
    return this.resumesService.findAll(+current, +pageSize, qs);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resumesService.findOne(id);
  }

  @Post('/by-user')
  findResumeByUser(@User() user: IUser) {
    return this.resumesService.findResumeByUser(user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateResumeDto: UpdateResumeDto,
    @User() user: IUser,
  ) {
    return this.resumesService.update(id, updateResumeDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.resumesService.remove(id, user);
  }
}
