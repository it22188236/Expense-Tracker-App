const mongoose = require('mongoose');
const User = require('../../models/userModel');

describe('User Model Test', () => {
  it('should create & save user successfully', async () => {
    const userData = { 
      name: 'Test User', 
      email: 'test@example.com' ,
      password: 'test123'
    };
    
    const validUser = new User(userData);
    const savedUser = await validUser.save();
    
    // Object Id should be defined when successfully saved to MongoDB
    expect(savedUser._id).toBeDefined();
    expect(savedUser.name).toBe(userData.name);
    expect(savedUser.email).toBe(userData.email);
  });

  it('should fail when required fields are missing', async () => {
    const userWithoutRequiredField = new User({ name: 'Test User' });
    let err;
    
    try {
      await userWithoutRequiredField.save();
    } catch (error) {
      err = error;
    }
    
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.email).toBeDefined();
  });
});