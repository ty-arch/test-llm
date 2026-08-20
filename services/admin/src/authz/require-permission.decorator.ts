import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "permissions";
export const RequirePermission = (...codes: string[]) => SetMetadata(PERMISSIONS_KEY, codes);
