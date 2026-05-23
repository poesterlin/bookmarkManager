import { ZodError } from 'zod';

export function formatZodError(error: ZodError) {
	const fields: Record<string, string> = {};
	for (const issue of error.issues) {
		const path = issue.path.join('.') || '_root';
		if (!fields[path]) {
			fields[path] = issue.message;
		}
	}
	return {
		error: {
			code: 'VALIDATION_ERROR',
			message: 'Invalid input',
			fields
		}
	};
}
