const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const Product = require('./models/product');
const User = require('./models/user');
const Order = require('./models/order');
const Cart  =  require('./models/cart');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Initialize the app and connect to the database
const app = express();
app.use(bodyParser.json());
mongoose.connect('mongodb://localhost:27017/yash', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log('Connected to MongoDB database');
});

app.get("/",(req,res) => {
    res.send("success");
})

//register endpoint
app.post('/register', async (req, res) => {     
    try {
      const user = new User(req.body);            //creating new user
      await user.save();
      const token = sign({ userId: user._id }, secretKey);
      res.json({ user, token });           
    } catch (err) {
      if (err.code === 11000) {                   //checking for duplicate key error
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(400).json({ error: err.message });
    }
  });
  
  //login Endpoint
  app.post('/login', async (req, res) => {    
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });   //searching the database for a user with that email
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const isPasswordValid = await user.comparePassword(password); //checking validity of password
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }
      const token = sign({ userId: user._id }, secretKey);
      res.json({ user, token });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

   // Create a new product
router.post('/products', [
    body('name').isLength({ min: 3 }),
    body('description').isLength({ min: 10 }),
    body('category').isLength({ min: 3 }),
    body('price').isNumeric(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, category, price } = req.body;

    // Check if product already exists
    const existingProduct = await Product.findOne({ name: name });
    if (existingProduct) {
        return res.status(400).json({ message: 'Product already exists' });
    }

    const product = new Product({
        name: name,
        description: description,
        category: category,
        price: price,
    });

    try {
        await product.save();
        res.status(201).json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all products with pagination
router.get('/products', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    try {
        const products = await Product.find()
            .skip((page - 1) * limit)
            .limit(limit);
        const count = await Product.countDocuments();

        res.json({
            products: products,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update a product
router.put('/products/:id', [
    body('name').isLength({ min: 3 }),
    body('description').isLength({ min: 10 }),
    body('category').isLength({ min: 3 }),
    body('price').isNumeric(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, category, price } = req.body;

    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        product.name = name;
        product.description = description;
        product.category = category;
        product.price = price;

        await product.save();
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete a product
router.delete('/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Search products by name, description, and category
router.get('/products/search', async (req, res) => {
    try {
      const { name, description, category } = req.query;
  
      const query = {};
  
      if (name) {
        query.name = new RegExp(name, 'i');
      }
  
      if (description) {
        query.description = new RegExp(description, 'i');
      }
  
      if (category) {
        query.category = new RegExp(category, 'i');
      }
  
      const products = await Product.find(query);
  
      res.json(products);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  

  // Add multiple products to the cart
app.post('/cart',  async (req, res) => {
    try {
      const userId = req.userId;
      const products = req.body.products;
  
      // Validate request body
      if (!Array.isArray(products)) {
        return res.status(400).json({ error: 'Invalid request body' });
      }
  
      // Get user's cart
      const cart = await cart.findOne({ userId });
  
      // Add products to the cart
      for (let product of products) {
        const productId = product.id;
        const quantity = product.quantity || 1;
  
        // Check if product exists
        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
          return res.status(404).json({ error: `Product with ID ${productId} not found` });
        }
  
        // Check if product is already in the cart
        const existingCartItem = cart.items.find(item => item.productId == productId);
        if (existingCartItem) {
          existingCartItem.quantity += quantity;
        } else {
          cart.items.push({ productId, quantity });
        }
      }
  
      // Save cart
      await cart.save();
  
      res.json({ message: 'Products added to cart successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Place an order
  app.post('/order', async (req, res) => {
    try {
      const userId = req.userId;
  
      // Get user's cart
      const cart = await Cart.findOne({ userId });
  
      // Check if cart is empty
      if (cart.items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
      }
  
      // Create order
      const order = new Order({
        userId,
        items: cart.items.map(item => ({ productId: item.productId, quantity: item.quantity })),
        totalAmount: cart.totalAmount,
      });
  
      // Save order
      await order.save();
  
      // Clear cart
      cart.items = [];
      cart.totalAmount = 0;
      await cart.save();
  
      res.json({ message: 'Order placed successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


app.listen(8000, () => {
  console.log('Server is listening on port 8000');
});
