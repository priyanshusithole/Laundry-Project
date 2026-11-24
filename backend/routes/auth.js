const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');


const { getSecret } = require('../middleware/auth');

// POST /api/auth/register (Student Registration)
router.post('/register', async (req, res) => {
  try {
    const { cardId, usn, name, room, password } = req.body;
    if (!cardId && !usn) {
      return res.status(400).json({ error: 'Card ID or USN is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const identifier = (cardId || usn).trim().toUpperCase();
    const existing = await User.findByIdentifier(identifier);
    if (existing) {
      return res.status(409).json({ error: 'Account already exists for this ID.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      role: 'student',
      identifier,
      cardId: cardId ? cardId.trim() : identifier,
      usn: usn ? usn.trim().toUpperCase() : `STD-${identifier}`,
      name: name ? name.trim() : 'Resident Student',
      room: room ? room.trim() : 'Wing 2 - Room 302',
      password: hashedPassword
    });


    const token = jwt.sign(
      { id: newUser.id, identifier: newUser.identifier, role: newUser.role },
      getSecret(),
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        role: newUser.role,
        identifier: newUser.identifier,
        cardId: newUser.cardId,
        usn: newUser.usn,
        name: newUser.name,
        room: newUser.room
      }
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Account already exists for this ID.' });
    }
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { role, identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required.' });
    }

    const cleanId = identifier.trim().toUpperCase();
    const wantedRole = role === 'staff' ? 'staff' : 'student';
    // Students may sign in with their Card ID or USN; staff with their Employee ID
    const user = wantedRole === 'staff'
      ? await User.findStaff(cleanId)
      : await User.findStudentForLogin(cleanId, identifier.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid ID or credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid ID or credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, identifier: user.identifier, role: user.role },
      getSecret(),
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        role: user.role,
        identifier: user.identifier,
        cardId: user.cardId,
        usn: user.usn,
        name: user.name,
        room: user.room
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

module.exports = router;
