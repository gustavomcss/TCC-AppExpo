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

/**
 * Password change form (RB19), with the field names the server expects, so its errors land on the
 * right field. The old password is checked by the server only; here it just has to be filled in.
 * The new one has at least 8 characters, the PocketBase minimum, differs from the old one and is
 * typed twice.
 */
export const changePasswordSchema = z
    .object({
        oldPassword: z.string().min(1, 'Informe a senha atual.'),
        password: z.string().min(8, 'A nova senha deve ter no mínimo 8 caracteres.'),
        passwordConfirm: z.string().min(1, 'Confirme a nova senha.'),
    })
    .refine((values) => values.password !== values.oldPassword, {
        message: 'A nova senha deve ser diferente da atual.',
        path: ['password'],
    })
    .refine((values) => values.passwordConfirm === values.password, {
        message: 'A confirmação não confere com a nova senha.',
        path: ['passwordConfirm'],
    });

/** Values of the password change form. */
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
