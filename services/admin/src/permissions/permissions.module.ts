import { Module } from "@nestjs/common";
import { PermissionAdminService } from "./permissions.service";
import { PermissionsController } from "./permissions.controller";

@Module({ controllers: [PermissionsController], providers: [PermissionAdminService] })
export class PermissionsModule {}
