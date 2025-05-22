"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
const userRepository = database_1.AppDataSource.getRepository(User_1.User);
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
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        // Create new user
        const user = userRepository.create({
            username,
            email,
            password: hashedPassword
        });
        const result = await userRepository.save(user);
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: result.id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        res.status(201).json({
            user: {
                id: result.id,
                username: result.username,
                email: result.email
            },
            token
        });
    }
    catch (error) {
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
        const isValidPassword = await bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            },
            token
        });
    }
    catch (error) {
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
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
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
    }
    catch (error) {
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
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
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
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating profile', error });
    }
});
exports.userRouter = router;
