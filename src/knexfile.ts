import path from 'path';


const knexConfig = {
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'postgres',
    database: 'ifeelblankodb',
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: path.join(__dirname, 'migrations'),
  },
};

export default knexConfig;

