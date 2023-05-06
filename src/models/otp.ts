import { Knex } from 'knex';

declare module 'knex/types/tables' {
    interface AuthOtp {
      id: number;
      mobile: string;
      created_at: string;
      updated_at: string;
      otp:string;
      status: "ACTIVE"| "FAILED"| "VERIFIED";
    }
    
   
  }