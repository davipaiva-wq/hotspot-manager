import {
  pgTable,
  serial,
  text,
  varchar,
  bigint,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "user"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  mac: varchar("mac", { length: 17 }),
  role: roleEnum("role").notNull().default("user"),
  // quota in bytes (0 = unlimited)
  quotaBytes: bigint("quota_bytes", { mode: "number" }).notNull().default(0),
  consumedBytes: bigint("consumed_bytes", { mode: "number" }).notNull().default(0),
  // daily limit in bytes (0 = no daily limit)
  dailyLimitBytes: bigint("daily_limit_bytes", { mode: "number" }).notNull().default(0),
  dailyConsumedBytes: bigint("daily_consumed_bytes", { mode: "number" }).notNull().default(0),
  dailyResetAt: timestamp("daily_reset_at"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 128 }),
  ip: varchar("ip", { length: 45 }),
  mac: varchar("mac", { length: 17 }),
  bytesIn: bigint("bytes_in", { mode: "number" }).notNull().default(0),
  bytesOut: bigint("bytes_out", { mode: "number" }).notNull().default(0),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const dailyUsage = pgTable("daily_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  bytesTotal: bigint("bytes_total", { mode: "number" }).notNull().default(0),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type DailyUsage = typeof dailyUsage.$inferSelect;
