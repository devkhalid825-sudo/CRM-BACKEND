export class AppError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

export class QuotaExceededError extends AppError {
  constructor(message = 'Provider quota exceeded for today') {
    super(message, 429);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'Rate limit reached, please retry later') {
    super(message, 429);
  }
}

export class AuthError extends AppError {
  constructor(message = 'Invalid API key or authentication failed') {
    super(message, 401);
  }
}

export class TransientError extends AppError {
  constructor(message = 'Temporary network or upstream service failure') {
    super(message, 503);
  }
}

export class PermanentError extends AppError {
  constructor(message = 'Permanent request error or bad parameters') {
    super(message, 400);
  }
}

export class AllProvidersExhaustedError extends AppError {
  constructor(message = 'All keys and fallback providers for this operation have been exhausted') {
    super(message, 503);
  }
}
