import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('authotps', (table) => {
    table.increments('id').primary();
    table.string('mobile_number').notNullable();
    table.integer('otp').notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('authotps');
}