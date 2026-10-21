import { ClientResponseError } from 'pocketbase';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/** Error of one field as PocketBase reports it: a stable `code` plus the English `message`. */
type FieldError = { code?: string; message?: string; params?: Record<string, unknown> };

/** Messages that replace the default translation of a code, per field name and per code. */
export type MessageOverrides = Record<string, Record<string, string>>;

/** A server error split into what belongs to each field and what belongs to the whole form. */
export type ParsedServerError = {
    fields: Record<string, string>;
    form: string | null;
};

/** Formats a limit the way the user reads it, e.g. 999999.99 as 999.999,99. */
function formatNumber(value: unknown): string {
    return typeof value === 'number'
        ? value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
        : String(value);
}

/** Message shown when a field fails with a code the app does not know. */
const UNKNOWN_FIELD_MESSAGE = 'Valor inválido.';

/**
 * Portuguese message for each validation code the server sends (I-08). The server answers in
 * English and the app never shows that text; unknown codes fall back to a generic message.
 */
const FIELD_MESSAGES: Record<string, (params: Record<string, unknown>) => string> = {
    validation_required: () => 'Campo obrigatório.',
    validation_not_unique: () => 'Já existe um registro com este valor.',
    validation_invalid_value: () => 'Valor inválido.',
    validation_invalid_email: () => 'Informe um e-mail válido.',
    validation_invalid_format: () => 'Formato inválido.',
    validation_min_text_constraint: ({ min }) => `Use pelo menos ${min} caracteres.`,
    validation_max_text_constraint: ({ max }) => `Use no máximo ${max} caracteres.`,
    validation_min_number_constraint: ({ min }) =>
        min === 0 ? 'O valor não pode ser negativo.' : `O valor mínimo é ${formatNumber(min)}.`,
    validation_max_number_constraint: ({ max }) => `O valor máximo é ${formatNumber(max)}.`,
    validation_too_many_decimals: () => 'Use no máximo duas casas decimais.',
};

/** Translates the error of one field, preferring the override for that field and code. */
function describeFieldError(field: string, error: FieldError, overrides: MessageOverrides): string {
    const code = error.code ?? '';
    const override = overrides[field]?.[code];
    if (override) {
        return override;
    }

    return FIELD_MESSAGES[code]?.(error.params ?? {}) ?? UNKNOWN_FIELD_MESSAGE;
}

/**
 * Message for a failure that names no field. PocketBase answers 400 with an empty `data` when an
 * API rule refuses a creation, and invalid values always come with their fields, so a 400 here
 * is a refused rule.
 */
function describeFormError(error: unknown): string {
    if (!(error instanceof ClientResponseError)) {
        return 'Não foi possível salvar. Tente novamente.';
    }

    switch (error.status) {
        case 0:
            return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
        case 400:
            return 'Você não tem permissão para esta ação.';
        case 401:
        case 403:
            return 'Você não tem permissão para esta ação.';
        case 404:
            return 'O registro não foi encontrado.';
        case 429:
            return 'Muitas tentativas. Aguarde um instante e tente novamente.';
        default:
            return 'Não foi possível salvar. Tente novamente.';
    }
}

/**
 * Splits a failed request into per-field messages and one form-level message (I-08). Field
 * errors come from the schema constraints and the hooks; a failure with no field data comes from
 * an API rule, from the network or from the server, and becomes the form message.
 */
export function parseServerError(
    error: unknown,
    overrides: MessageOverrides = {},
): ParsedServerError {
    const data = error instanceof ClientResponseError ? error.response?.data : undefined;
    const fields: Record<string, string> = {};

    if (data && typeof data === 'object') {
        for (const [field, fieldError] of Object.entries(data as Record<string, FieldError>)) {
            fields[field] = describeFieldError(field, fieldError ?? {}, overrides);
        }
    }

    return {
        fields,
        form: Object.keys(fields).length > 0 ? null : describeFormError(error),
    };
}

/**
 * Puts the server's field errors on the form and returns the message that belongs to the form
 * as a whole, or null. An error on a field the form does not have is returned as the form
 * message too, so that it is never lost.
 */
export function applyServerError<T extends FieldValues>(
    error: unknown,
    setError: UseFormSetError<T>,
    formFields: readonly Path<T>[],
    overrides: MessageOverrides = {},
): string | null {
    const { fields, form } = parseServerError(error, overrides);
    const orphans: string[] = [];

    for (const [field, message] of Object.entries(fields)) {
        if ((formFields as readonly string[]).includes(field)) {
            setError(field as Path<T>, { type: 'server', message });
        } else {
            orphans.push(message);
        }
    }

    return form ?? orphans[0] ?? null;
}
