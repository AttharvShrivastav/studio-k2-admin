import { relations } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { SiteSettingsInput } from "../../shared/schemas/contact.js";
import type { HomepageSpotlightConfigDraft } from "../../shared/schemas/homepage.js";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date()),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const projectCategory = pgEnum("project_category", ["built", "unbuilt"]);
export const projectStatus = pgEnum("project_status", ["active", "archived"]);
export const projectTemplateType = pgEnum("project_template_type", [
  "template-1",
  "template-2",
  "template-3",
  "template-4",
]);
export const contactSubmissionStatus = pgEnum("contact_submission_status", ["new", "read"]);

type ProjectConfig = Record<string, unknown>;

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    category: projectCategory("category").notNull(),
    status: projectStatus("status").default("active").notNull(),
    templateType: projectTemplateType("template_type").notNull(),
    location: text("location"),
    area: text("area"),
    year: text("year"),
    browserOrder: integer("browser_order").default(0).notNull(),
    browserImage: jsonb("browser_image").$type<ProjectConfig>().default({}).notNull(),
    hero: jsonb("hero").$type<ProjectConfig>().default({}).notNull(),
    themeConfig: jsonb("theme_config").$type<ProjectConfig>().default({}).notNull(),
    templateConfig: jsonb("template_config").$type<ProjectConfig>().default({}).notNull(),
    galleryConfig: jsonb("gallery_config").$type<ProjectConfig>().default({}).notNull(),
    footerConfig: jsonb("footer_config").$type<ProjectConfig>().default({}).notNull(),
    seoConfig: jsonb("seo_config").$type<ProjectConfig>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("projects_slug_unique").on(table.slug),
    index("projects_status_browser_order_idx").on(table.status, table.browserOrder),
    check("projects_browser_order_non_negative", sql`${table.browserOrder} >= 0`),
  ],
);

export const contactSubmissions = pgTable(
  "contact_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    message: text("message").notNull(),
    status: contactSubmissionStatus("status").default("new").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("contact_submissions_created_at_idx").on(table.createdAt)],
);

export const siteSettings = pgTable(
  "site_settings",
  {
    id: integer("id").primaryKey().default(1),
    address: text("address").notNull(),
    email: text("email").notNull(),
    contactBackground: jsonb("contact_background")
      .$type<SiteSettingsInput["contactBackground"]>()
      .default({
        src: "/assets/Portfolio_Image.png",
        alt: "Studio K2 Architecture Monograph & Design Studio Atmosphere",
        focalPosition: "center center",
      })
      .notNull(),
  },
  (table) => [check("site_settings_singleton", sql`${table.id} = 1`)],
);

export const homepageConfig = pgTable(
  "homepage_config",
  {
    id: integer("id").primaryKey().default(1),
    spotlightConfig: jsonb("spotlight_config")
      .$type<HomepageSpotlightConfigDraft>()
      .default({
        slots: [
          { projectId: "", desktop: { src: "", alt: "", focalPosition: "center" } },
          { projectId: "", desktop: { src: "", alt: "", focalPosition: "center" } },
          { projectId: "", desktop: { src: "", alt: "", focalPosition: "center" } },
          { projectId: "", desktop: { src: "", alt: "", focalPosition: "center" } },
        ],
      })
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [check("homepage_config_singleton", sql`${table.id} = 1`)],
);
