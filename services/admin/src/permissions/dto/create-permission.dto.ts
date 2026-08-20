import { IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import { PermissionType } from "@prisma/client";

export class CreatePermissionDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsEnum(PermissionType) type!: PermissionType;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsString() path?: string;
  @IsOptional() @IsInt() sort?: number;
}
