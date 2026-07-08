import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateUrlSchema = z.object({
  url: z.string().url('Invalid URL format'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Slug can only contain letters, numbers, underscores, and hyphens',
    )
    .optional(),
});

export class CreateUrlDto extends createZodDto(CreateUrlSchema) {}
