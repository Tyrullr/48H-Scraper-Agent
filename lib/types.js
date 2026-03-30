import { z } from 'zod';

export const ExhibitorSchema = z.object({
  name: z.string(),
  website: z.string().optional(),
  description: z.string().optional(),
  stand: z.string().optional(),
  country: z.string().optional(),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  categories: z.array(z.string()).optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  logo: z.string().optional(),
});
