const CustomError = require("../util/CustomError");
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const emailService = require('../services/emailService');

//user registration
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
       return next(
        new CustomError("Input fields are empty. Please fill the fields.", 400)
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
       return next(
        new CustomError(
          "User already registered. Please use login for process.",
          400
        )
      );
    }
    //hashing password
    const hashPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, email, password: hashPassword, role });
    await newUser.save();

    if (newUser) {
      res
        .status(201)
        .json({ message: `New user created.`, data: newUser });
    } else {
       return next(new CustomError("Registration process failed.", 400));
    }
  } catch (error) {
     return next(new CustomError(error.message, 500));
  }
};

//for user logging
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
       return next(new CustomError("Input fields are empty.", 400));
    }

    const existUser = await User.findOne({ email });

    if (!existUser) {
       next(
        new CustomError(
          "User not registered. Please create account using register and login again.",
          400
        )
      );
    }

    //compare password with user entered and hashed password
    const comparePassword = await bcrypt.compare(password, existUser.password);

    if (!comparePassword) {
       return next(new CustomError("Password incorrect. Please try again", 400));
    }

    if (existUser && comparePassword) {
      const accessToken = jwt.sign(
        { id: existUser._id, role: existUser.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      res.cookie("authToken", accessToken, { httpOnly: true, maxAge: 3600000 });

      if (accessToken) {
        res
          .status(200)
          .json({ message: "Login successful.", data: accessToken });
      }

      console.log(`${existUser.role} logged.`);
    }
  } catch (error) {
     return next(new CustomError(error.message, 500));
  }
};

//for forgot password option
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
       return next(new CustomError("Input filed is empty", 400));
    }

    const existUser = await User.findOne({ email });
    if (!existUser) {
       return next(new CustomError("User not found.", 404));
    }

    const resetToken = jwt.sign(
      { email: existUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    existUser.resetToken = resetToken;
    existUser.resetTokenExpiration = Date.now() + 18000000;
    await existUser.save();

    const subject = "Password reset for Financial Tracker";
    // const text =  `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
    //     `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
    //     `http://${req.headers.host}/api/auth/reset-password/${resetToken}\n\n` +
    //     `If you did not request this, please ignore this email and your password will remain unchanged.\n`;

    const text =  `<div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; margin: auto;">
    <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
    <p style="font-size: 16px; color: #555;">You recently requested to reset your password for your account. Click the button below to proceed:</p>
    <div style="text-align: center; margin: 20px 0;">
      <a href="http://${req.headers.host}/api/auth/reset-password/${resetToken}\n\n" 
         style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; font-size: 16px; border-radius: 5px; display: inline-block;">
        Reset Password
      </a>
    </div>
     <a>"http://${req.headers.host}/api/auth/reset-password/${resetToken}\n\n"</a>
    <p style="font-size: 14px; color: #777;">If you didn’t request a password reset, you can safely ignore this email.</p>
    <p style="font-size: 14px; color: #777;">This link will expire in 30 minutes.</p>
    <hr style="border: none; border-top: 1px solid #ddd;">
    <p style="font-size: 12px; text-align: center; color: #aaa;">© 2025 Financial Tracker Company. All rights reserved.</p>
  </div>`

        await emailService(existUser.email,subject,text);
  } catch (error) {
     return next(new CustomError(error.message, 500));
  }
};


//for reset password
const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
       return next(new CustomError("Enter your new password.", 400));
    }

    const existUser = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpiration: { $gt: Date.now() },
    });

    if (!existUser) {
       return next(new CustomError("Password reset token expired or invalid.",404));
    }

    existUser.password = await bcrypt.hash(password, 10);
    existUser.resetToken = undefined;
    existUser.resetTokenExpiration = undefined;
    await existUser.save();

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
     return next(new CustomError(error.message, 500));
  }
};

module.exports = { register, login, forgotPassword, resetPassword };
