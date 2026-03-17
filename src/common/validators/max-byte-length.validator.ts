import {
	registerDecorator,
	ValidationOptions,
	ValidatorConstraint,
	ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ name: "maxByteLength", async: false })
class MaxByteLengthConstraint implements ValidatorConstraintInterface {
	validate(value: unknown): boolean {
		if (typeof value !== "string") return false;
		return Buffer.byteLength(value, "utf8") <= 72;
	}

	defaultMessage(): string {
		return "Password is too long; please use fewer or simpler characters";
	}
}

export function MaxByteLength(
	validationOptions?: ValidationOptions,
): PropertyDecorator {
	return function (target: object, propertyKey: string | symbol) {
		registerDecorator({
			target: target.constructor,
			propertyName: String(propertyKey),
			options: validationOptions,
			constraints: [],
			validator: MaxByteLengthConstraint,
		});
	};
}
