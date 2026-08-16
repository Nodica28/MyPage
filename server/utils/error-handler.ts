import {Request, Response, NextFunction} from "express";
import multer from "multer";

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: string;
}

/**
 * Standard error codes that the frontend can interpret
 */
export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  BAD_REQUEST: "BAD_REQUEST",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  FILE_UPLOAD_ERROR: "FILE_UPLOAD_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  SERVER_ERROR: "SERVER_ERROR"
};

/**
 * Creates a standardized API error
 */
export function createApiError(
  message: string,
  status = 500,
  code = ErrorCodes.SERVER_ERROR,
  details?: string
): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

/**
 * Middleware to handle errors in a consistent way
 */
export function apiErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(`[Error] ${req.method} ${req.path}:`, err);

  // Make sure we haven't already sent headers
  if (res.headersSent) {
    console.error("[Error] Headers already sent, cannot send error response.");
    return next(err);
  }

  // Always force content type to application/json for API errors
  res.setHeader("Content-Type", "application/json");

  // Handle multer specific errors
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: "File upload error",
      code: ErrorCodes.FILE_UPLOAD_ERROR,
      details: err.message,
      field: err.field
    });
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      error: "Invalid JSON format",
      code: ErrorCodes.BAD_REQUEST,
      details: "The request body contains malformed JSON"
    });
  }

  try {
    // Handle custom API errors
    const statusCode = err.status || 500;
    const errorCode = err.code || ErrorCodes.SERVER_ERROR;
    const errorMessage = err.message || "An unexpected error occurred";
    const errorDetails = err.details || undefined;

    // In development, include stack trace for debugging
    const devDetails =
      process.env.NODE_ENV === "development" ? err.stack : undefined;

    // Ensure we send a valid JSON response even in case of error
    return res.status(statusCode).json({
      error: errorMessage,
      code: errorCode,
      details: errorDetails || devDetails
    });
  } catch (jsonError) {
    // Fallback if we can't create a proper JSON response
    console.error("[Critical] Failed to send JSON error response:", jsonError);
    return res.status(500).json({
      error: "Internal server error",
      code: ErrorCodes.SERVER_ERROR,
      details: "Failed to generate error response"
    });
  }
}

/**
 * Helper function to handle authentication errors
 */
export function handleAuthError(res: Response, message = "Not authenticated") {
  return res.status(401).json({
    error: message,
    code: ErrorCodes.UNAUTHORIZED
  });
}

/**
 * Helper function to handle not found errors
 */
export function handleNotFoundError(
  res: Response,
  entity = "Resource",
  id?: string | number
) {
  const message = id
    ? `${entity} with id ${id} not found`
    : `${entity} not found`;
  return res.status(404).json({
    error: message,
    code: ErrorCodes.NOT_FOUND
  });
}

/**
 * Helper function to handle validation errors
 */
export function handleValidationError(
  res: Response,
  message = "Validation error",
  details?: string
) {
  return res.status(400).json({
    error: message,
    code: ErrorCodes.VALIDATION_ERROR,
    details
  });
}

/**
 * Helper function to handle file upload errors
 */
export function handleFileUploadError(
  res: Response,
  message = "File upload failed",
  details?: string
) {
  // CRITICAL FIX: Use both setHeader and contentType methods to absolutely ensure JSON response
  res.setHeader("Content-Type", "application/json");
  res.contentType("application/json");

  try {
    // Use json() which sets the right headers rather than send()
    return res.status(400).json({
      error: message,
      code: ErrorCodes.FILE_UPLOAD_ERROR,
      details
    });
  } catch (error) {
    // Absolute fallback in case of any issues
    console.error(
      "[Critical] Failed to send JSON error response for file upload:",
      error
    );

    // CRITICAL FIX: Ensure content type is set again before the final fallback
    res.setHeader("Content-Type", "application/json");
    res.contentType("application/json");

    return res.status(400).json({
      error: "File upload failed",
      code: ErrorCodes.FILE_UPLOAD_ERROR
    });
  }
}

/**
 * Try-catch wrapper for async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
