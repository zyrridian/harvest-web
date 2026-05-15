import { IAuthRepository } from "../../domain/repositories/auth.repository";

export class LogoutUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(userId: string): Promise<void> {
    // 1. Revoke all refresh tokens
    await this.authRepo.deleteRefreshTokens(userId);

    // 2. Mark user offline
    await this.authRepo.updateOnlineStatus(userId, false);
  }
}
