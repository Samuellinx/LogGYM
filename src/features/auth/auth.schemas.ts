import {z} from 'zod';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Informe seu e-mail.')
  .email('Informe um e-mail valido.')
  .max(254, 'Use um e-mail mais curto.')
  .transform(value => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
  .max(128, 'A senha precisa ter no maximo 128 caracteres.');

const recoveryCodeSchema = z
  .string()
  .trim()
  .min(4, 'Crie um codigo de recuperacao com pelo menos 4 caracteres.')
  .max(32, 'Use um codigo de recuperacao mais curto.');

export const credentialSignInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const credentialSignUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Informe seu nome.')
      .max(120, 'Use um nome mais curto.'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    recoveryCode: recoveryCodeSchema,
  })
  .refine(values => values.password === values.confirmPassword, {
    message: 'As senhas nao conferem.',
    path: ['confirmPassword'],
  });

export const credentialResetSchema = z
  .object({
    email: emailSchema,
    recoveryCode: recoveryCodeSchema,
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine(values => values.newPassword === values.confirmNewPassword, {
    message: 'As senhas nao conferem.',
    path: ['confirmNewPassword'],
  });

export type CredentialSignInValues = z.infer<typeof credentialSignInSchema>;
export type CredentialSignUpValues = z.infer<typeof credentialSignUpSchema>;
export type CredentialResetValues = z.infer<typeof credentialResetSchema>;
