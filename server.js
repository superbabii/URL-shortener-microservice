require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns');
const url = require('url');

const app = express();

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
app.post('/api/shorturl', (req, res) => {
  const inputUrl = req.body.url;
  
  // Validate the URL using DNS lookup
  const urlObj = url.parse(inputUrl);
  dns.lookup(urlObj.hostname, (err, address) => {
    if (err || !address) {
      return res.json({ error: 'invalid url' });
    } else {
      // Check if the URL already exists in the database
      Url.findOne({ original_url: inputUrl }, (err, foundUrl) => {
        if (err) return res.json({ error: 'Database error' });

        if (foundUrl) {
          res.json({ original_url: foundUrl.original_url, short_url: foundUrl.short_url });
        } else {
          // Generate a new short URL
          Url.countDocuments({}, (err, count) => {
            if (err) return res.json({ error: 'Database error' });
            
            const newUrl = new Url({ original_url: inputUrl, short_url: count + 1 });
            newUrl.save((err, savedUrl) => {
              if (err) return res.json({ error: 'Database error' });
              res.json({ original_url: savedUrl.original_url, short_url: savedUrl.short_url });
            });
          });
        }
      });
    }
  });
});

// Endpoint to redirect to the original URL using the short URL
app.get('/api/shorturl/:short', (req, res) => {
  const shortUrl = req.params.short;
  
  Url.findOne({ short_url: shortUrl }, (err, foundUrl) => {
    if (err) return res.json({ error: 'Database error' });
    if (!foundUrl) {
      res.json({ error: 'No short URL found for the given input' });
    } else {
      res.redirect(foundUrl.original_url);
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
