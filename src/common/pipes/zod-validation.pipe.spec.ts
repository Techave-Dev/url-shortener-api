import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

interface ValidationErrorResponse {
  message: string;
  code: string;
  error: Array<{ field: string; message: string }>;
}

function isValidationErrorResponse(
  value: unknown,
): value is ValidationErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'error' in value &&
    Array.isArray((value as { error: unknown }).error)
  );
}

function getValidationErrorResponse(
  exception: BadRequestException,
): ValidationErrorResponse {
  const response = exception.getResponse();

  if (!isValidationErrorResponse(response)) {
    throw new Error('Response is not a valid ValidationErrorResponse');
  }

  return response;
}

describe('ZodValidationPipe', () => {
  describe('with a simple flat schema', () => {
    const schema = z.object({
      email: z.string().email(),
      age: z.number().min(18),
    });
    let pipe: ZodValidationPipe;

    beforeEach(() => {
      pipe = new ZodValidationPipe(schema);
    });

    it('should return parsed data when input is valid', () => {
      const input = { email: 'test@example.com', age: 25 };

      const result = pipe.transform(input);

      expect(result).toEqual(input);
    });

    it('should throw BadRequestException when input is invalid', () => {
      const input = { email: 'not-an-email', age: 25 };

      expect(() => pipe.transform(input)).toThrow(BadRequestException);
    });

    it('should include field name and message in the error response', () => {
      const input = { email: 'not-an-email', age: 25 };

      expect(() => pipe.transform(input)).toThrow(BadRequestException);

      try {
        pipe.transform(input);
      } catch (error) {
        if (!(error instanceof BadRequestException)) {
          throw error;
        }

        const response = getValidationErrorResponse(error);

        expect(response.code).toBe('validation.failed');
        expect(response.error).toEqual(
          expect.arrayContaining([expect.objectContaining({ field: 'email' })]),
        );
      }
    });

    it('should report multiple field errors when multiple fields are invalid', () => {
      const input = { email: 'not-an-email', age: 10 };

      try {
        pipe.transform(input);
      } catch (error) {
        if (!(error instanceof BadRequestException)) {
          throw error;
        }

        const response = getValidationErrorResponse(error);
        const fields = response.error.map((e) => e.field);

        expect(fields).toContain('email');
        expect(fields).toContain('age');
      }
    });

    it('should throw when required field is missing', () => {
      const input = { email: 'test@example.com' };

      expect(() => pipe.transform(input)).toThrow(BadRequestException);
    });
  });

  describe('with a nested schema', () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          name: z.string().min(1),
        }),
      }),
    });
    let pipe: ZodValidationPipe;

    beforeEach(() => {
      pipe = new ZodValidationPipe(schema);
    });

    it('should join nested path with dots in the field name', () => {
      const input = { user: { profile: { name: '' } } };

      try {
        pipe.transform(input);
      } catch (error) {
        if (!(error instanceof BadRequestException)) {
          throw error;
        }

        const response = getValidationErrorResponse(error);

        expect(response.error[0]?.field).toBe('user.profile.name');
      }
    });
  });

  describe('with a schema that transforms data', () => {
    const schema = z.object({
      slug: z.string().trim().toLowerCase(),
    });
    let pipe: ZodValidationPipe;

    beforeEach(() => {
      pipe = new ZodValidationPipe(schema);
    });

    it('should return the transformed value, not the raw input', () => {
      const input = { slug: '  PROMO-2026  ' };

      const result = pipe.transform(input);

      expect(result).toEqual({ slug: 'promo-2026' });
    });
  });
});
