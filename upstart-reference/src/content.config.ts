import { defineCollection, z } from "astro:content";
import parseTomlToJson from "./lib/utils/parseTomlToJson";

const config = parseTomlToJson("./src/config/config.toml");
const { integration_folder } = config.settings;

// Universal Page Schema
const page = z.object({
  title: z.string(),
  date: z.date().optional(), // example date format 2022-01-01 or 2022-01-01T00:00:00+00:00 (Year-Month-Day Hour:Minute:Second+Timezone)
  description: z.string().optional(),
  image: z.string().optional(),
  draft: z.boolean().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  robots: z.string().optional(),
  exclude_from_sitemap: z.boolean().optional(),
  custom_slug: z.string().optional(),
  canonical: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  disable_tagline: z.boolean().optional(),
});

// Marquee Schema
// const marquee_config = z.object({
//   element_width: z.string(),
//   element_width_in_small_devices: z.string(),
//   pause_on_hover: z.boolean(),
//   reverse: z.enum(["reverse", ""]).optional(), // Optional: "reverse" or an empty string
//   duration: z.string(),
// });

// Call to Action Button
const buttonSchema = z.object({
  enable: z.boolean(),
  label: z.string(),
  url: z.string(),
  rel: z.string().optional(),
  target: z.string().optional(),
});

// Pages collection schema
const pages_collection = defineCollection({
  schema: page,
});

// Post collection schema
const blog_collection = defineCollection({
  schema: page.merge(
    z.object({
      categories: z.array(z.string()).default(["others"]),
      author: z.string().optional(),
      excerpt: z.string().optional(),
    }),
  ),
});

// Integration Collection
const integration_collection = defineCollection({
  schema: page.merge(
    z.object({
      categories: z.array(z.string()).optional(),
      excerpt: z.string().optional(),
      cta_btn: buttonSchema.optional(),
      sections: z
        .array(
          z.object({
            title: z.string(),
            description: z.string(),
            category: z.string(),
          }),
        )
        .optional(),
      fields: z
        .array(
          z.object({
            name: z.string(),
            content: z.string(),
          }),
        )
        .optional(),
    }),
  ),
});

// Export collections
export const collections = {
  blog: blog_collection,
  integration: integration_collection,
  [integration_folder]: integration_collection,

  pages: pages_collection,
  sections: defineCollection({}),
  contact: defineCollection({}),
  faq: defineCollection({}),
  pricing: defineCollection({}),
  homepage: defineCollection({}),
  author: defineCollection({}),
  changelog: defineCollection({}),
};
