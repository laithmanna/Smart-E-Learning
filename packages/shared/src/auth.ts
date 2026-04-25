import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const TokenPairSchema = z.object({
  accessToken: z.string(),
});

export type TokenPair = z.infer<typeof TokenPairSchema>;
