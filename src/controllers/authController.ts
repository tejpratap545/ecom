import { Request, Response } from 'express';
import knex from '../database/connection';
import moment from 'moment';
import jwt from 'jsonwebtoken';

function generateOTP(): number {
  return Math.floor(100000 + Math.random() * 900000);
}

export async function sendOtp(req: Request, res: Response) {
  const { mobile_number } = req.body;

  try {
    const otp = generateOTP();
    const expires_at = moment().add(10, 'minutes').toDate();

    await knex('authotps')
      .insert({ mobile_number, otp, expires_at })
    res.status(200).json({ message: 'OTP sent', data: { otp: otp, mobile_number: mobile_number } });
  } catch (err) {
    console.log(err);

    res.status(500).json({ error: 'Server error' });
  }
}

function generateToken(userId: number): string {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'secret_key', {
    expiresIn: '1h',
  });
}

 

export async function verifyOtp(req: Request, res: Response) {
  const { mobile_number, otp } = req.body;

  try {
    const otpRecord = await knex('authotps')
      .where({ mobile_number })
      .andWhereRaw('expires_at > NOW()')
      .orderBy('id', 'desc')
      .first();

    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    await knex('authotps').where({ mobile_number }).del();



    const [existingUser] = await knex('users')
      .select('*')
      .where('mobile_number', mobile_number);

    let user;

    if (existingUser) {
      user = existingUser;
    } else {
      const [newUserId] = await knex('users')
        .insert({ mobile_number })
        .returning('id');

      [user] = await knex('users').select('*').where('id', newUserId);

    }

    const token = generateToken(user.id);


    res.status(200).json({ message: 'OTP verified', data: { token: token, user: user } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
