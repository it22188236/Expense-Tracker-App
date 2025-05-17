// __tests__/controllers/authController.test.js

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../models/userModel');
const express = require('express');
const authController = require('../../controllers/authController');
const emailService = require('../../services/emailService');

// Mock dependencies
jest.mock('../../services/emailService');
jest.mock('jsonwebtoken');
jest.mock('bcrypt');

let app;

// Setup Express app for testing
const setupApp = () => {
  const app = express();
  app.use(express.json());
  
  // Routes
  app.post('/api/auth/register', authController.register);
  app.post('/api/auth/login', authController.login);
  app.post('/api/auth/forgot-password', authController.forgotPassword);
  app.post('/api/auth/reset-password/:token', authController.resetPassword);
  
  // Error handler middleware
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
      message: err.message || 'Internal Server Error'
    });
  });
  
  return app;
};

beforeAll(async () => {
  // Setup MongoDB Memory Server
  
  
  // Setup Express app
  app = setupApp();
  
  // Setup environment variables
  process.env.JWT_SECRET = 'test-secret-key';
});



beforeEach(async () => {
  // Clear database collections before each test
  await User.deleteMany({});
  
  // Reset all mocks
  jest.clearAllMocks();
});

describe('Auth Controller Tests', () => {
  describe('User Registration', () => {
    test('should register a new user successfully', async () => {
      // Mock bcrypt.hash
      bcrypt.hash.mockResolvedValue('hashedPassword123');
      
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
      
      // Check response
      expect(response.body.message).toBe('New user created.');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.name).toBe(userData.name);
      expect(response.body.data.email).toBe(userData.email);
      
      // Verify user was saved to database
      const savedUser = await User.findOne({ email: userData.email });
      expect(savedUser).toBeTruthy();
      expect(savedUser.name).toBe(userData.name);
      
      // Verify bcrypt was called
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
    });
    
    test('should return error if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test User' })
        .expect(400);
      
      expect(response.body.message).toBe('Input fields are empty. Please fill the fields.');
    });
    
    test('should return error if user already exists', async () => {
      // Create a user first
      await User.create({
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'hashedPassword'
      });
      
      // Try to register with the same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'existing@example.com',
          password: 'Password123'
        })
        .expect(400);
      
      expect(response.body.message).toBe('User already registered. Please use login for process.');
    });
  });

  describe('User Login', () => {
    test('should login successfully with correct credentials', async () => {
      // Create a user first
      const hashedPassword = 'hashedPassword123';
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'user'
      });
      
      // Mock bcrypt.compare and jwt.sign
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('fake-token-123');
      
      const loginData = {
        email: 'test@example.com',
        password: 'Password123'
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);
      
      expect(response.body.message).toBe('Login successful.');
      expect(response.body.data).toBe('fake-token-123');
      
      // Verify JWT token was generated
      expect(jwt.sign).toHaveBeenCalled();
      const jwtPayload = jwt.sign.mock.calls[0][0];
      expect(jwtPayload).toHaveProperty('role', 'user');
    });
    
    test('should return error if email is not registered', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123'
        })
        .expect(400);
      
      expect(response.body.message).toBe('User not registered. Please create account using register and login again.');
    });
    
    test('should return error if password is incorrect', async () => {
      // Create a user first
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedPassword123'
      });
      
      // Mock bcrypt.compare to return false (incorrect password)
      bcrypt.compare.mockResolvedValue(false);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        })
        .expect(400);
      
      expect(response.body.message).toBe('Password incorrect. Please try again');
    });
    
    test('should return error if fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);
      
      expect(response.body.message).toBe('Input fields are empty.');
    });
  });

  describe('Forgot Password', () => {
    test('should send reset token when email exists', async () => {
      // Create a user first
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedPassword123'
      });
      
      // Mock JWT sign to return a test token
      jwt.sign.mockReturnValue('reset-token-123');
      
      // Mock email service
      emailService.mockResolvedValue(true);
      
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);
      
      // Verify the user was updated with a reset token
      const updatedUser = await User.findOne({ email: 'test@example.com' });
      expect(updatedUser.resetToken).toBe('reset-token-123');
      expect(updatedUser.resetTokenExpiration).toBeDefined();
      
      // Verify that email service was called
      expect(emailService).toHaveBeenCalled();
      expect(emailService.mock.calls[0][0]).toBe('test@example.com');
      expect(emailService.mock.calls[0][1]).toBe('Password reset for Financial Tracker');
    });
    
    test('should return error if email is not registered', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(404);
      
      expect(response.body.message).toBe('User not found.');
    });
    
    test('should return error if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);
      
      expect(response.body.message).toBe('Input filed is empty');
    });
  });

  describe('Reset Password', () => {
    test('should reset password with valid token', async () => {
      // Create a user with reset token
      const resetToken = 'valid-reset-token';
      const expiration = Date.now() + 3600000; // 1 hour in the future
      
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'oldHashedPassword',
        resetToken,
        resetTokenExpiration: expiration
      });
      
      // Mock bcrypt.hash
      bcrypt.hash.mockResolvedValue('newHashedPassword');
      
      const response = await request(app)
        .post(`/api/auth/reset-password/${resetToken}`)
        .send({ password: 'NewPassword123' })
        .expect(200);
      
      expect(response.body.message).toBe('Password reset successful.');
      
      // Verify user password was updated and reset token was cleared
      const updatedUser = await User.findOne({ email: 'test@example.com' });
      expect(updatedUser.password).toBe('newHashedPassword');
      expect(updatedUser.resetToken).toBeUndefined();
      expect(updatedUser.resetTokenExpiration).toBeUndefined();
      
      // Verify bcrypt.hash was called
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123', 10);
    });
    
    test('should return error if token is invalid or expired', async () => {
      // Create a user with an expired reset token
      const resetToken = 'expired-token';
      const expiration = Date.now() - 3600000; // 1 hour in the past
      
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'oldHashedPassword',
        resetToken,
        resetTokenExpiration: expiration
      });
      
      const response = await request(app)
        .post(`/api/auth/reset-password/${resetToken}`)
        .send({ password: 'NewPassword123' })
        .expect(400);
      
      expect(response.body.message).toBe('Password reset token expired or invalid.');
    });
    
    test('should return error if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password/some-token')
        .send({})
        .expect(400);
      
      expect(response.body.message).toBe('Enter your new password.');
    });
  });
});