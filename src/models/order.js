const mongoose =require("mongoose");
const express =require ('express');
const app= express();

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    products: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
      },
    ],
    totalPrice: { type: Number, required: true },
  });

  const Order= new mongoose.model("Order",orderSchema);

  
module.exports = Order;