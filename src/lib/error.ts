class BaseError extends Error {
  constructor(message: string, name: string) {
    super(message);
    this.name = name || "BaseError";
  }
}

class ConflictError extends BaseError {
  constructor(message: string) {
    super(message, "ConflictError");
  }
}
class NotFoundError extends BaseError {
  constructor(message: string) {
    super(message, "NotFoundError");
  }
}

export { BaseError, ConflictError, NotFoundError };
