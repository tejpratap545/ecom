import { Response } from 'express';
import knex from '../database/connection';
import { ExtendedRequest } from '../types/extendedRequest';

const ProductController = {
  async createProduct(req:ExtendedRequest, res:Response) {
    const { name, description, price, quantity, category } = req.body;

    const [newProduct] = await knex('products').insert({
      name,
      description,
      price,
      quantity,
      category,
    }).returning('*');

    res.status(201).json(newProduct);
  },

  async listProducts(req:ExtendedRequest, res:Response) {
    const products = await knex('products').select('*');

    res.json(products);
  },

  async updateProduct(req:ExtendedRequest, res:Response) {
    const { name, description, price, quantity, category } = req.body;

    const [updatedProduct] = await knex('products')
      .where('id', req.params.id)
      .update({
        name,
        description,
        price,
        quantity,
        category,
      })
      .returning('*');

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(updatedProduct);
  },
};

export default ProductController;
