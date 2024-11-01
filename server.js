require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns');
const url = require('url');

const app = express();
const cors = require('cors');
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create URL Schema and Model
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

const Url = mongoose.model('Url', urlSchema);

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));

// Root Endpoint
app.get('/', (req, res) => {
  res.send('URL Shortener Microservice. Use /api/shorturl/new to shorten a URL.');
});

// Endpoint to create a shortened URL
app.post('/api/shorturl', async (req, res) => {
  const inputUrl = req.body.url;
  
  // Validate the URL using DNS lookup
  const urlObj = url.parse(inputUrl);
  dns.lookup(urlObj.hostname, async (err, address) => {
    if (err || !address) {
      return res.json({ error: 'invalid url' });
    } else {
      try {
        // Check if the URL already exists in the database
        const foundUrl = await Url.findOne({ original_url: inputUrl });
        if (foundUrl) {
          return res.json({ original_url: foundUrl.original_url, short_url: foundUrl.short_url });
        } else {
          // Generate a new short URL
          const count = await Url.countDocuments({});
          const newUrl = new Url({ original_url: inputUrl, short_url: count + 1 });
          const savedUrl = await newUrl.save();
          res.json({ original_url: savedUrl.original_url, short_url: savedUrl.short_url });
        }
      } catch (err) {
        res.json({ error: 'Database error' });
      }
    }
  });
});


// Endpoint to redirect to the original URL using the short URL
app.get('/api/shorturl/:short', async (req, res) => {
  try {
    // Parse the short URL from the request parameters
    const shortUrl = parseInt(req.params.short);

    // Find the corresponding URL document in the database
    const foundUrl = await Url.findOne({ short_url: shortUrl });

    // If found, redirect to the original URL
    if (foundUrl) {
      res.redirect(foundUrl.original_url);
    } else {
      // If not found, return an error message
      res.json({ error: 'No short URL found for the given input' });
    }
  } catch (err) {
    res.json({ error: 'Database error' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
