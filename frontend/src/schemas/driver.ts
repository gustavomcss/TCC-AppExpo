import { z } from 'zod';

/**
 * Driver registration form (RF03, RB19), with the field names of the `users` collection so the
 * server errors land on the right field. The e-mail is lowercased because PocketBase matches it
 * case-sensitively and the login lowercases it too. The initial password has at least 8
 * characters, the PocketBase minimum; the supervisor passes it on and the driver may change it
 * later, nothing forces that (RB19).
 */
export const driverSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Informe o nome.')
        .max(255, 'O nome deve ter no máximo 255 caracteres.'),
    email: z
        .string()
        .trim()
        .toLowerCase()
        .min(1, 'Informe o e-mail.')
        .email('Informe um e-mail válido.'),
    password: z
        .string()
        .min(1, 'Informe a senha inicial.')
        .min(8, 'A senha deve ter no mínimo 8 caracteres.'),
});

/** Values of the driver form. */
export type DriverValues = z.infer<typeof driverSchema>;
