import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';
import { ApiResponse } from '../types/api-response';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
    mockContext = {} as ExecutionContext;
  });

  function createCallHandler(returnValue: unknown): CallHandler {
    return {
      handle: () => of(returnValue),
    };
  }

  it('should format an ApiResponse instance correctly', async () => {
    const apiResponse = new ApiResponse(
      'User created',
      { id: '1' },
      { page: 1 },
    );
    const callHandler = createCallHandler(apiResponse);

    const result = await lastValueFrom(
      interceptor.intercept(mockContext, callHandler),
    );

    expect(result.message).toBe('User created');
    expect(result.data).toEqual({ id: '1' });
    expect(result.meta).toEqual({ page: 1 });
  });

  it('should wrap plain data with a default "Success" message', async () => {
    const plainData = { foo: 'bar' };
    const callHandler = createCallHandler(plainData);

    const result = await lastValueFrom(
      interceptor.intercept(mockContext, callHandler),
    );

    expect(result.message).toBe('Success');
    expect(result.data).toEqual(plainData);
  });

  it('should wrap null/undefined data without throwing', async () => {
    const callHandler = createCallHandler(undefined);

    const result = await lastValueFrom(
      interceptor.intercept(mockContext, callHandler),
    );

    expect(result.message).toBe('Success');
    expect(result.data).toBeUndefined();
  });

  it('should include a requestId matching the expected format', async () => {
    const callHandler = createCallHandler({ foo: 'bar' });

    const result = await lastValueFrom(
      interceptor.intercept(mockContext, callHandler),
    );

    expect(result.requestId).toMatch(/^req_[0-9a-f-]{36}$/);
  });

  it('should generate a different requestId for each call', async () => {
    const callHandler = createCallHandler({ foo: 'bar' });

    const result1 = await lastValueFrom(
      interceptor.intercept(mockContext, callHandler),
    );
    const result2 = await lastValueFrom(
      interceptor.intercept(mockContext, callHandler),
    );

    expect(result1.requestId).not.toBe(result2.requestId);
  });
});
