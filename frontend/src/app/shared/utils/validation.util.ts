
export class ValidationUtil {
  static isInvalidField(value: any): boolean {
    return value == null || value.toString().trim() === '';
  }

  static showRequiredError(fieldName: string, value: any, notyf: any): boolean {
    if (this.isInvalidField(value)) {
      notyf.error(`${fieldName} is required`);
      return false;
    }
    return true;
  }

}
