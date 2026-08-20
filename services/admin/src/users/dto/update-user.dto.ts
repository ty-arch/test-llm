import { IsOptional, IsString, MinLength } from "class-validator";

export class UpdateUserDto {
  @IsOptional() @IsString() nickname?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
}
