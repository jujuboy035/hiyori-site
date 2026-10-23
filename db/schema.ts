import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', { id: text('id').primaryKey(), value: text('value').notNull() });
export const sessions = sqliteTable('sessions', { id: text('id').primaryKey(), name: text('name').notNull(), expires: integer('expires').notNull() });
