import { z } from 'zod';

/**
 * Login form. The e-mail is lowercased because PocketBase matches it case-sensitively and the
 * accounts are created in lowercase. The password has no minimum length here, because the server
 * decides whether the credentials are valid; the form only rejects empty fields.
 */
export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .min(1, 'Informe o e-mail.')
        .email('Informe um e-mail válido.'),
    password: z.string().min(1, 'Informe a senha.'),
});

/** Values of the login form. */
export type LoginValues = z.infer<typeof loginSchema>;
