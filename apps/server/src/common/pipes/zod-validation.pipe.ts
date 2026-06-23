import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validates untrusted input (query params / body) against a Zod schema.
 *
 * WHY Zod over class-validator: `z.coerce.number()` and `z.coerce.boolean()`
 * auto-convert query strings without manual `@Transform()` decorators, making
 * it ideal for query-param validation where everything arrives as a string.
 *
 * The pipe throws a structured `400` with flattened field errors when validation
 * fails, matching NestJS's standard error shape.
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const err = result.error as ZodError;
      throw new BadRequestException({
        message: 'Validation failed',
        errors: err.flatten().fieldErrors,
      });
    }
    return result.data;
  }
}
