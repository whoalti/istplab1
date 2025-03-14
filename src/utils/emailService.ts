// src/utils/emailService.ts
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Simple in-memory storage
interface VerificationData {
  username: string;
  password: string;
  email: string;
  token: string;
  expires: Date;
}

class VerificationService {
  private tokens: Map<string, VerificationData> = new Map();
  private transporter: nodemailer.Transporter;
  
  constructor() {
    this.transporter = nodemailer.createTransport({
       host: "sandbox.smtp.mailtrap.io",
      // service: process.env.EMAIL_SERVICE,
      port: 2525,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    // Log to confirm we can see the environment variables (masked for security)
    console.log(`Email Configuration: Service=${process.env.EMAIL_SERVICE}, User=${process.env.EMAIL_USER}, Pass=${process.env.EMAIL_PASSWORD ? '****' : 'not set'}`);
  }
  
  async createVerification(username: string, password: string, email: string): Promise<string> {
    // Generate 6-digit code
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store for 24 hours
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);
    
    this.tokens.set(token, {
      username,
      password,
      email,
      token,
      expires
    });
    
    // Send email
    try {
      await this.sendEmail(email, token);
      return token;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
  
  async sendEmail(email: string, token: string): Promise<void> {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify your MyShop account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3498db;">MyShop Email Verification</h1>
          <p>Thank you for registering with MyShop. Please use the verification code below to complete your registration:</p>
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${token}
          </div>
          <p>This code will expire in 24 hours.</p>
          <p style="font-size: 12px; color: #777;">If you did not request this verification, please ignore this email.</p>
        </div>
      `
    };
    
    const result = await this.transporter.sendMail(mailOptions);
    console.log('Email sent:', result.response);
  }
  
  getVerification(token: string): VerificationData | null {
    const data = this.tokens.get(token);
    
    if (!data) {
      return null;
    }
    
    // Check if expired
    if (data.expires < new Date()) {
      this.tokens.delete(token);
      return null;
    }
    
    return data;
  }
  
  removeVerification(token: string): void {
    this.tokens.delete(token);
  }
  
  getByEmail(email: string): VerificationData | null {
    for (const data of this.tokens.values()) {
      if (data.email === email && data.expires > new Date()) {
        return data;
      }
    }
    return null;
  }
}

export const verificationService = new VerificationService();