import { IsNotEmpty, IsString, Allow } from 'class-validator';

export class StripeWebhookDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @Allow()
  data?: any;
}
