import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsAfter(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfter',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          if (typeof value === 'string' && typeof relatedValue === 'string') {
            const date1 = new Date(value);
            const date2 = new Date(relatedValue);
            return date1.getTime() > date2.getTime();
          }
          return false;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} phải diễn ra sau khoảng thời gian của ${args.constraints[0]}`;
        },
      },
    });
  };
}
