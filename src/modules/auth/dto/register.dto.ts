import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}
