declare module 'express' {
  interface Request {
    cookies: Record<string, string>;
    user?: Record<string, unknown>;
    headers: Record<string, string | string[] | undefined>;
  }
  interface Response {
    cookie(name: string, val: string, options?: Record<string, unknown>): this;
    clearCookie(name: string, options?: Record<string, unknown>): this;
    redirect(status: number, url: string): void;
    json(body: Record<string, unknown>): this;
    status(code: number): this;
  }
}
