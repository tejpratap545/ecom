import path from 'path';


const knexConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_PASSWORD ||'postgres',
    database: process.env.DB_NAME ||'ifeelblankodb',
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: path.join(__dirname, 'migrations'),
  },
};

export default knexConfig;

