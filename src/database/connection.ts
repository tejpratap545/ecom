import Knex from 'knex';
import knexConfig from '../knexfile';

const connection = Knex(knexConfig);

export default connection;
