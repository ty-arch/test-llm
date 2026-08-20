import { IsArray, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @IsString() @MinLength(1) username!: string;
  @IsString() @MinLength(6) password!: string;
  @IsOptional() @IsString() nickname?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) roleIds?: string[];
}
