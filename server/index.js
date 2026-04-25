const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const Student = require('./models/Student');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/legal_olympiad')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'public')));

// Endpoints
app.get('/api/counts', async (req, res) => {
  try {
    const students = await Student.find();
    const counts = {
      total: students.length,
      litigation: 0,
      drafting: 0,
      judgment: 0,
      bundle: 0
    };

    students.forEach(s => {
      s.courses.forEach(c => {
        if (counts.hasOwnProperty(c)) {
          counts[c]++;
        }
      });
    });

    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch counts' });
  }
});

app.post('/api/waitlist', async (req, res) => {
  try {
    const { name, email, phone, college, pincode, courses } = req.body;
    
    if (!name || !email || !phone || !college || !pincode || !courses || courses.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const count = await Student.countDocuments();
    const refId = 'LO-' + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2,5).toUpperCase();
    
    const newStudent = new Student({
      id: refId,
      position: count + 1,
      name,
      email,
      phone,
      college,
      pincode,
      courses
    });

    await newStudent.save();
    res.status(201).json(newStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save to waitlist' });
  }
});

app.get('/api/admin/registrations', async (req, res) => {
  try {
    const students = await Student.find().sort({ joinedAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
