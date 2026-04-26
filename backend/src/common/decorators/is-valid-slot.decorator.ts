import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsValidSlot(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidSlot',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const date = new Date(value);
          if (isNaN(date.getTime())) return false;
          
          const minutes = date.getMinutes();
          const seconds = date.getSeconds();
          const ms = date.getMilliseconds();
          
          // Phút phải là 0 hoặc 30, giây và ms phải là 0
          return (minutes === 0 || minutes === 30) && seconds === 0 && ms === 0;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} phải là giờ chẵn (VD: 14:00) hoặc giờ rưỡi (VD: 14:30).`;
        }
      },
    });
  };
}
