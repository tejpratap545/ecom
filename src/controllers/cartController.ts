import {  Response } from 'express';
import knex from '../database/connection';
import { ExtendedRequest } from '../types/extendedRequest';

const CartController = {
  async createCartItem(req: ExtendedRequest, res: Response) {
    const userId = req.userId;
    const { product_id, quantity } = req.body;

    const [newCartItem] = await knex('carts').insert({
      user_id: userId,
      product_id,
      quantity,
    }).returning('*');

    res.status(201).json(newCartItem);
  },

  async getCartItems(req: ExtendedRequest, res: Response) {
    const userId = req.userId;

    const cartItems = await knex('carts')
      .select('carts.*', 'products.name as product_name', 'products.description as product_description', 'products.price as product_price', 'products.category as product_category')
      .where('user_id', userId)
      .join('products', 'carts.product_id', 'products.id');


      let totalPrice = 0;

      cartItems.forEach(item => {
        totalPrice += item.product_price * item.quantity;
      });

    res.json({cart_items:cartItems,total_price:totalPrice});
  },

  async updateCartItem(req: ExtendedRequest, res: Response) {
    const userId = req.userId;
    const { product_id, quantity } = req.body;

    const [updatedCartItem] = await knex('carts')
      .where('id', req.params.id)
      .andWhere('user_id', userId)
      .update({
        product_id,
        quantity,
      })
      .returning('*');

    if (!updatedCartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    res.json(updatedCartItem);
  },
};

export default CartController;
