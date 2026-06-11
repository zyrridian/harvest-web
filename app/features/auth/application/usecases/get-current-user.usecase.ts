import { IAuthRepository } from "../../domain/repositories/auth.repository";
import { toUserDTO } from "../../domain/entities/user.entity";
import { UserDTO } from "../../domain/entities/user.entity";
import { AppError } from "@/core/errors";

export class GetCurrentUserUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(userId: string): Promise<UserDTO> {
    const user = await this.authRepo.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }
    return toUserDTO(user, true); // include online status for /me endpoint
  }
}
