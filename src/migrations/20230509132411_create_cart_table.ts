import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('carts', table => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().notNullable();
        table.integer('product_id').unsigned().notNullable();
        table.integer('quantity').unsigned().notNullable();
        table.foreign('user_id').references('id').inTable('users');
        table.foreign('product_id').references('id').inTable('products');
        table.timestamps(true, true);
      });
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable('carts');
}

