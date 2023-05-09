import { Response } from 'express';
import { ExtendedRequest } from '../types/extendedRequest';
import knex from '../database/connection';
import moment from 'moment';
import jwt from 'jsonwebtoken';

function generateOTP(): number {
  return Math.floor(100000 + Math.random() * 900000);
}

export async function sendOtp(req: ExtendedRequest, res: Response) {
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
    expiresIn:  '10d'
  });
}



export async function verifyOtp(req: ExtendedRequest, res: Response) {
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
        .insert({
          mobile_number,
          isAdmin: false,
          isActive: true,
        },
        )
        .returning('id');

      [user] = await knex('users').select('*').where('id', newUserId);

    }

    const token = generateToken(user.id);


    res.status(200).json({ message: 'OTP verified', data: { token: token, user: user } });
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Server error' });
  }
}


export async function getUser(req: ExtendedRequest, res: Response) {
  const userId = req.userId;

  const user = await knex('users').select('*').where('id', userId).first();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
}




export async function updateUser(req: ExtendedRequest, res: Response) {
  const userId = req.userId;


  const { first_name, email, mobile_number, address } = req.body;



  try {
    const updatedUser = await knex('users')
      .where('id', userId)
      .update({
        first_name,
        email,
        mobile_number,
        address,
        updated_at: new Date(),
      });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully', data: {
        "user": updatedUser
      }
    });
  } catch (error) {
    res.status(400).json({ error: 'Error updating user' });
  }
}



export async function partialUpdateUser(req: ExtendedRequest, res: Response) {
  const userId = req.userId;
  const updates = req.body;

  try {
    const updatedUser = await knex('users')
      .where('id', userId)
      .update({
        ...updates,
        updated_at: new Date(),
      });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully', data: {
        "user": updatedUser
      }
    });
  } catch (error) {
    res.status(400).json({ error: 'Error updating user' });
  }
}
