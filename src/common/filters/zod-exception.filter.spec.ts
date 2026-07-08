import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { z, ZodError } from 'zod';
import { ZodExceptionFilter } from './zod-exception.filter';

function createZodError(schema: z.ZodTypeAny, invalidInput: unknown): ZodError {
  const result = schema.safeParse(invalidInput);
  if (result.success) {
    throw new Error('Expected schema validation to fail in test setup');
  }
  return result.error;
}

describe('ZodExceptionFilter', () => {
  let filter: ZodExceptionFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new ZodExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ArgumentsHost;
  });

  describe('when exception is a ZodError', () => {
    it('should respond with 400 and validation.failed code', () => {
      const schema = z.object({ email: z.string().email() });
      const zodError = createZodError(schema, { email: 123 });

      filter.catch(zodError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const jsonArg = mockResponse.json.mock.calls[0]?.[0] as {
        code: string;
        error: Array<{ field: string; message: string }>;
      };
      expect(jsonArg.code).toBe('validation.failed');
      expect(jsonArg.error[0]?.field).toBe('email');
    });

    it('should join nested path with dots', () => {
      const schema = z.object({
        user: z.object({ profile: z.object({ name: z.string().min(1) }) }),
      });
      const zodError = createZodError(schema, {
        user: { profile: { name: '' } },
      });

      filter.catch(zodError, mockHost);

      const jsonArg = mockResponse.json.mock.calls[0]?.[0] as {
        error: Array<{ field: string }>;
      };
      expect(jsonArg.error[0]?.field).toBe('user.profile.name');
    });

    it('should include multiple errors when multiple fields are invalid', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });
      const zodError = createZodError(schema, { email: 123, age: 5 });

      filter.catch(zodError, mockHost);

      const jsonArg = mockResponse.json.mock.calls[0]?.[0] as {
        error: Array<{ field: string }>;
      };
      expect(jsonArg.error).toHaveLength(2);
    });
  });

  describe('when exception is an HttpException', () => {
    it('should use the string response as message', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Not found', code: 'error' }),
      );
    });

    it('should extract message and code from object response', () => {
      const exception = new HttpException(
        { message: 'Email already registered', code: 'auth.user.exists' },
        HttpStatus.CONFLICT,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Email already registered',
          code: 'auth.user.exists',
        }),
      );
    });

    it('should fallback to code "error" when response has no code', () => {
      const exception = new HttpException(
        { message: 'Something went wrong' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'error' }),
      );
    });

    it('should fallback to exception.message when response has no string message', () => {
      const exception = new HttpException(
        { code: 'some.code' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      const jsonArg = mockResponse.json.mock.calls[0]?.[0] as {
        message: string;
      };
      expect(jsonArg.message).toBe(exception.message);
    });
  });

  describe('when exception is an unrecognized type', () => {
    it('should respond with 500 and server.error code', () => {
      filter.catch(new Error('unexpected'), mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'server.error' }),
      );
    });
  });

  describe('requestId', () => {
    it('should include a requestId matching the expected format', () => {
      filter.catch(new Error('boom'), mockHost);

      const jsonArg = mockResponse.json.mock.calls[0]?.[0] as {
        requestId: string;
      };
      expect(jsonArg.requestId).toMatch(/^req_[0-9a-f-]{36}$/);
    });
  });
});
