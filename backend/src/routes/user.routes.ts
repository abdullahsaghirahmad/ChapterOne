import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();
const userRepository = AppDataSource.getRepository(User);

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await userRepository.findOne({
      where: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = userRepository.create({
      username,
      email,
      password: hashedPassword
    });

    const result = await userRepository.save(user);

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    res.status(201).json({
      user: {
        id: result.id,
        username: result.username,
        email: result.email
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await userRepository.findOneBy({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error });
  }
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
    const user = await userRepository.findOneBy({ id: decoded.userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      favoriteGenres: user.favoriteGenres,
      preferredPace: user.preferredPace,
      favoriteThemes: user.favoriteThemes
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
    const user = await userRepository.findOneBy({ id: decoded.userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields
    const { favoriteGenres, preferredPace, favoriteThemes } = req.body;
    user.favoriteGenres = favoriteGenres;
    user.preferredPace = preferredPace;
    user.favoriteThemes = favoriteThemes;

    const result = await userRepository.save(user);

    res.json({
      id: result.id,
      username: result.username,
      email: result.email,
      favoriteGenres: result.favoriteGenres,
      preferredPace: result.preferredPace,
      favoriteThemes: result.favoriteThemes
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error });
  }
});

export const userRouter = router; 