import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export class LoginDto extends createZodDto(LoginSchema) {}
