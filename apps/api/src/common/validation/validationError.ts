import { ValidationError } from 'class-validator';

// Error code mapping
const errorCodeMap: Record<string, string> = {
  email: 'INVALID_EMAIL',
  password: 'INVALID_PASSWORD',
  name: 'INVALID_NAME'
};

/**
 * Maps the class validator errors to specific error types.
 * Otherwise returns VALIDATION_ERROR if error is not mapped
 * @param errors from dto validation 
 * @returns error code
 */
export function getValidationErrorCode(errors: ValidationError[]): string {
  for (const error of errors) {
    const errorCode = errorCodeMap[error.property];
    if (errorCode) {
      return errorCode;
    }
  }
  
  return 'VALIDATION_ERROR';
}
