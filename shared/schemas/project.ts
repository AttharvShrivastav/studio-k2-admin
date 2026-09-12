import { z } from "zod";

export const projectCategories = ["built", "unbuilt"] as const;
export const projectStatuses = ["active", "archived"] as const;
export const templateTypes = [
  "template-1",
  "template-2",
  "template-3",
  "template-4",
] as const;

export const projectCategorySchema = z.enum(projectCategories);
export const projectStatusSchema = z.enum(projectStatuses);
export const templateTypeSchema = z.enum(templateTypes);

const requiredTitle = z.string().trim().min(1, "Project name is required").max(200);
const requiredSlug = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(160)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and single hyphens only",
  );
const optionalListingText = z.string().trim().max(200).nullable().optional();
const projectBasicsShape = {
  title: requiredTitle,
  slug: requiredSlug,
  category: projectCategorySchema,
  templateType: templateTypeSchema,
  location: optionalListingText,
  area: optionalListingText,
  year: z.string().trim().max(40).nullable().optional(),
  browserOrder: z.number().int("Browser order must be an integer").nonnegative(),
};

export const createProjectInputSchema = z.object(projectBasicsShape).strict();

export const updateProjectBasicsInputSchema = z
  .object(projectBasicsShape)
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "Provide at least one project field to update",
  });

export type ProjectCategory = z.infer<typeof projectCategorySchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type TemplateType = z.infer<typeof templateTypeSchema>;
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type UpdateProjectBasicsInput = z.infer<typeof updateProjectBasicsInputSchema>;
