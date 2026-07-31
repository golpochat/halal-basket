import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DriverService } from './driver.service';
import { DriverFeedbackDto, DriverUpdateStatusDto } from './dto/driver.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../../common/decorators/current-user.decorator';

@Controller('driver')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.driver)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get('orders/today')
  today(@CurrentUser() user: JwtPayloadUser) {
    return this.driverService.todaysOrders(user.userId, user.role);
  }

  @Patch('orders/:fulfillmentId/status')
  updateStatus(
    @CurrentUser() user: JwtPayloadUser,
    @Param('fulfillmentId', ParseUUIDPipe) fulfillmentId: string,
    @Body() dto: DriverUpdateStatusDto,
  ) {
    return this.driverService.updateStatus(
      user.userId,
      user.role,
      fulfillmentId,
      dto.status,
    );
  }

  @Post('orders/:fulfillmentId/feedback')
  feedback(
    @CurrentUser() user: JwtPayloadUser,
    @Param('fulfillmentId', ParseUUIDPipe) fulfillmentId: string,
    @Body() dto: DriverFeedbackDto,
  ) {
    return this.driverService.feedback(
      user.userId,
      user.role,
      fulfillmentId,
      dto,
    );
  }
}
