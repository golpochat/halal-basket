import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { UserRole } from '@prisma/client';
import { FavouritesService } from './favourites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../../common/decorators/current-user.decorator';

class AddFavouriteDto {
  @IsUUID()
  productId!: string;
}

@Controller('customers/me/favourites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.customer)
export class FavouritesController {
  constructor(private readonly favourites: FavouritesService) {}

  @Get('ids')
  listIds(@CurrentUser() user: JwtPayloadUser) {
    return this.favourites.listIds(user.userId);
  }

  @Get()
  list(@CurrentUser() user: JwtPayloadUser) {
    return this.favourites.list(user.userId);
  }

  @Post()
  add(@CurrentUser() user: JwtPayloadUser, @Body() dto: AddFavouriteDto) {
    return this.favourites.add(user.userId, dto.productId);
  }

  @Delete(':productId')
  remove(
    @CurrentUser() user: JwtPayloadUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.favourites.remove(user.userId, productId);
  }
}
