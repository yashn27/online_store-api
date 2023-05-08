const mongoose =require("mongoose");
const express =require ('express');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
  });

  const Product= new mongoose.model("Product",productSchema);

  

module.exports = Product;