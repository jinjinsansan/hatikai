import { Module } from '@nestjs/common'
import { AppController } from '../routes/app.controller'
import { AppService } from '../services/app.service'
import { PrismaModule } from '../prisma/prisma.module'
import { RouletteModule } from '../features/roulette/roulette.module'
import { ObligationsModule } from '../features/obligations/obligations.module'
import { DevModule } from '../features/dev/dev.module'
import { MeModule } from '../features/me/me.module'
import { TiersModule } from '../features/tiers/tiers.module'
import { AdminModule } from '../features/admin/admin.module'
import { AdsModule } from '../features/ads/ads.module'
import { NotificationsModule } from '../features/notifications/notifications.module'
import { AuditModule } from '../features/audit/audit.module'
import { DrawsModule } from '../features/draws/draws.module'
import { WishlistModule } from '../features/wishlist/wishlist.module'
import { OgController } from '../features/util/og.controller'
import { UploadsController } from '../features/uploads/uploads.controller'
import { ImgProxyController } from '../features/util/img-proxy.controller'
import { RouletteWinsModule } from '../features/roulette-wins/roulette-wins.module'

@Module({
  imports: [PrismaModule, RouletteModule, ObligationsModule, DevModule, MeModule, TiersModule, AdminModule, AdsModule, NotificationsModule, AuditModule, DrawsModule, WishlistModule, RouletteWinsModule],
  controllers: [AppController, OgController, UploadsController, ImgProxyController],
  providers: [AppService]
})
export class AppModule {}
