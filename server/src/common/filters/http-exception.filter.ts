import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ValidationErrorResponse {
  message: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class AllHttpExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllHttpExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';
    let field: string | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.message;
      } else {
        const body = exceptionResponse as ValidationErrorResponse;
        message = body.message ?? exception.message;
        error = body.error ?? exception.message;

        if (Array.isArray(message) && message.length > 0) {
          const firstMsg = message[0];
          const match = /^(\w+)\s/.exec(firstMsg);
          if (match) field = match[1];
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    this.logger.debug(
      `${request.method} ${request.url} → ${statusCode}: ${JSON.stringify(message)}`,
    );

    response.status(statusCode).json({
      statusCode,
      error,
      message,
      ...(field && { field }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
