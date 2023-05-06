import { Request, Response } from 'express';
import knex from '../database/connection';
import moment from 'moment';

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
    res.status(200).json({ message: 'OTP sent' });
  } catch (err) {
    console.log(err);
    
    res.status(500).json({ error: 'Server error' });
  }
}

export async function verifyOtp(req: Request, res: Response) {
  const { mobile_number, otp } = req.body;

  try {
    const otpRecord = await knex('authotps')
      .where({ mobile_number })
      .andWhere('expires_at', '>', new Date())
      .first();

    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    await knex('authotps').where({ mobile_number }).del();

    res.status(200).json({ message: 'OTP verified' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
