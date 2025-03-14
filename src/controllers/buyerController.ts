import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Buyer } from '../entities/Buyer';
import { Purchase } from '../entities/Purchase';
import { CustomError } from '../utils/errors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { verificationService } from '../utils/emailService';
import { verificationStore } from '../utils/verificationStore';

export class BuyerController {
    private buyerRepository = AppDataSource.getRepository(Buyer);
    private purchaseRepository = AppDataSource.getRepository(Purchase);

    getAllBuyers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const buyers = await this.buyerRepository.find({
                select: ['buyer_id', 'username'] 
            });
            res.json(buyers);
        } catch (error) {
            next(new CustomError('Failed to fetch buyers', 500));
        }
    }

    getBuyerById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const buyer = await this.buyerRepository.findOne({
                where: { buyer_id: req.params.id },
                select: ['buyer_id', 'username']
            });

            if (!buyer) {
                return next(new CustomError('Buyer not found', 404));
            }

            res.json(buyer);
        } catch (error) {
            next(new CustomError('Failed to fetch buyer', 500));
        }
    }

    registerFormView = async (req: Request, res: Response) => {
        try {
            res.render('buyers/register-step1', {
                title: 'Register'
            });
        } catch (error) {
            console.error('Error rendering register page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while loading the register page'
            });
        }
    }
    

    // registerBuyer = async (req: Request, res: Response, next: NextFunction) => {
    //     try {
    //         const { username, password, email } = req.body;
    
    //         if (!username || !password || !email) {
    //             return next(new CustomError('Username, password, and email are required', 400));
    //         }
    
    //         // Check if username or email already exists
    //         const existingBuyer = await this.buyerRepository.findOne({ 
    //             where: [{ username }]
    //         });
    
    //         if (existingBuyer) {
    //             return next(new CustomError('Username already exists', 400));
    //         }
    
    //         // Generate token and store registration data temporarily
    //         const token = verificationStore.addToken(email, username, password);
            
    //         // Send verification email
    //         await sendVerificationEmail(email, token);
    
    //         if (req.xhr || req.headers.accept?.includes('application/json')) {
    //             return res.status(200).json({
    //                 message: 'Please check your email for verification code',
    //                 email
    //             });
    //         }
            
    //         // Redirect to verification page
    //         res.redirect(`/verify-email?email=${encodeURIComponent(email)}`);
    //     } catch (error) {
    //         next(error);
    //     }
    // }
    
    // Add verification methods
    verifyEmailView = async (req: Request, res: Response) => {
        try {
            const email = req.query.email as string;
            
            res.render('buyers/verify-email', {
                title: 'Verify Email',
                email: email || ''
            });
        } catch (error) {
            console.error('Error rendering verify email page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while loading the verification page'
            });
        }
    }
    
    verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { token, email } = req.body;
            
            if (!token) {
                return next(new CustomError('Verification code is required', 400));
            }
            
            // Get verification data
            const verificationData = verificationStore.getByToken(token);
            
            if (!verificationData) {
                return next(new CustomError('Invalid or expired verification code', 400));
            }
            
            // Verify email matches
            if (email && email !== verificationData.email) {
                return next(new CustomError('Email does not match verification code', 400));
            }
            
            // Create the user account now that it's verified
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(verificationData.password, saltRounds);
            
            const buyer = this.buyerRepository.create({
                username: verificationData.username,
                password_hash
            });
            
            const savedBuyer = await this.buyerRepository.save(buyer);
            
            // Remove the verification data
            verificationStore.removeToken(token);
            
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                const { password_hash: _, ...buyerWithoutPassword } = savedBuyer;
                return res.status(201).json({
                    ...buyerWithoutPassword,
                    message: 'Account verified and created successfully'
                });
            }
            
            res.redirect('/login?verified=true');
        } catch (error) {
            next(error);
        }
    }
    registerStep1View = async (req: Request, res: Response) => {
        try {
          res.render('buyers/register-step1', {
            title: 'Register'
          });
        } catch (error) {
          console.error('Error rendering register step 1 page:', error);
          res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred while loading the registration page'
          });
        }
      }
      
      registerStep2View = async (req: Request, res: Response) => {
        try {
          console.log('body', req.body)
          const email = req.query.email as string || '';
          
          res.render('buyers/register-step2', {
            title: 'Verify Email',
            email
          });
        } catch (error) {
          console.error('Error rendering register step 2 page:', error);
          res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred while loading the verification page'
          });
        }
      }
      
      initiateRegistration = async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { username, password, email } = req.body;
          console.log('username in back', username, password)
          if (!username || !password || !email) {
            return next(new CustomError('Username, password, and email are required', 400));
          }
      
          // Check if username already exists
          const existingBuyer = await this.buyerRepository.findOne({
            where: { username }
          });
      
          if (existingBuyer) {
            return next(new CustomError('Username already exists', 400));
          }
      
          // Create verification token and send email
          try {
            await verificationService.createVerification(username, password, email);
            
            if (req.xhr || req.headers.accept?.includes('application/json')) {
              return res.json({
                success: true,
                message: 'Verification code sent to your email',
                email,
                username, 
                password
              });
            }
            
            res.redirect(`/register/verify?email=${encodeURIComponent(email)}`);
          } catch (error) {
            console.error('Verification error:', error);
            return next(new CustomError('Failed to send verification email. Please try again.', 500));
          }
        } catch (error) {
          next(error);
        }
      }
      
      completeRegistration = async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { token, email, username, password } = req.body;
          
          if (!/^\d{6}$/.test(token)) {
            return res.status(400).json({
              success: false,
              message: 'Invalid verification code format'
            });
          }
          
          // Get verification data
          const verificationData = verificationService.getVerification(token);
          
          if (!verificationData) {
            return res.status(400).json({
              success: false,
              message: 'Invalid or expired verification code'
            });
          }
          
          // Verify email matches
          if (email !== verificationData.email) {
            return res.status(400).json({
              success: false,
              message: 'Email does not match verification code'
            });
          }
          
          // Use the username and password from the request
          // If not provided, fall back to the stored values
          const finalUsername = username || verificationData.username;
          const finalPassword = password || verificationData.password;
          
          // Check if username already exists
          const existingBuyer = await this.buyerRepository.findOne({
            where: { username: finalUsername }
          });
          
          if (existingBuyer) {
            return res.status(400).json({
              success: false,
              message: 'Username already exists'
            });
          }
          
          const saltRounds = 10;
          const password_hash = await bcrypt.hash(finalPassword, saltRounds);
          
          const buyer = this.buyerRepository.create({
            username: finalUsername,
            password_hash
          });
          
          const savedBuyer = await this.buyerRepository.save(buyer);
          
          // Remove the verification data
          verificationService.removeVerification(token);
          
          return res.status(201).json({
            success: true,
            message: 'Registration successful'
          });
        } catch (error) {
          console.error('Error in completeRegistration:', error);
          return res.status(500).json({
            success: false,
            message: 'Registration failed'
          });
        }
      }
      
      resendVerification = async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { email } = req.body;
      
          if (!email) {
            return next(new CustomError('Email is required', 400));
          }
      
          // Find existing verification
          const verification = verificationService.getByEmail(email);
      
          if (!verification) {
            return next(new CustomError('No pending verification found for this email', 404));
          }
      
          // Resend the verification email
          await verificationService.sendEmail(email, verification.token);
      
          res.json({
            success: true,
            message: 'Verification code has been resent to your email'
          });
        } catch (error) {
          next(error);
        }
      }
    

    loginBuyer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return next(new CustomError('Username and password are required', 400));
            }

            const buyer = await this.buyerRepository.findOne({
                where: { username }
            });

            if (!buyer) {
                return next(new CustomError('Invalid credentials', 401));
            }

            const isPasswordValid = await bcrypt.compare(password, buyer.password_hash);

            if (!isPasswordValid) {
                return next(new CustomError('Invalid credentials', 401));
            }

            const token = jwt.sign(
                { buyer_id: buyer.buyer_id, username: buyer.username },
                process.env.JWT_SECRET || 'default-secret-key',
                { expiresIn: '24h' }
            );

            res.json({
                message: 'Login successful',
                token,
                buyer: {
                    buyer_id: buyer.buyer_id,
                    username: buyer.username
                }
            });
        } catch (error) {
            next(error);
        }
    }

    updateBuyer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { username, password } = req.body;
            const buyerId = req.params.id;

            const buyer = await this.buyerRepository.findOne({
                where: { buyer_id: buyerId }
            });

            if (!buyer) {
                return next(new CustomError('Buyer not found', 404));
            }

            if (username && username !== buyer.username) {
                const existingBuyer = await this.buyerRepository.findOne({
                    where: { username }
                });

                if (existingBuyer) {
                    return next(new CustomError('Username already exists', 400));
                }

                buyer.username = username;
            }

            if (password) {
                const saltRounds = 10;
                buyer.password_hash = await bcrypt.hash(password, saltRounds);
            }

            await this.buyerRepository.save(buyer);

            res.json({
                message: 'Buyer updated successfully',
                buyer: {
                    buyer_id: buyer.buyer_id,
                    username: buyer.username
                }
            });
        } catch (error) {
            next(error);
        }
    }

    deleteBuyer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.buyerRepository.delete(req.params.id);

            if (result.affected === 0) {
                return next(new CustomError('Buyer not found', 404));
            }

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    getBuyerPurchases = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const purchases = await this.purchaseRepository.find({
                where: { buyer: { buyer_id: req.params.id } },
                relations: ['product']
            });

            res.json(purchases);
        } catch (error) {
            next(new CustomError('Failed to fetch purchases', 500));
        }
    }

    registerView = async (req: Request, res: Response) => {
        try {
            res.render('buyers/register', {
                title: 'Register'
            });
        } catch (error) {
            console.error('Error rendering register page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while loading the register page'
            });
        }
    }

    loginView = async (req: Request, res: Response) => {
        try {
          res.render('buyers/login', {
            title: 'Login',
            query: req.query 
          });
        } catch (error) {
          console.error('Error rendering login page:', error);
          res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred while loading the login page'
          });
        }
      }

    profileView = async (req: Request, res: Response) => {
        try {
            const buyerId = req.user?.buyer_id;
            
            if (!buyerId) {
                return res.redirect('/login');
            }

            const buyer = await this.buyerRepository.findOne({
                where: { buyer_id: buyerId },
                select: ['buyer_id', 'username']
            });

            if (!buyer) {
                return res.status(404).render('error', {
                    title: 'Not Found',
                    message: 'Buyer profile not found'
                });
            }

            const purchases = await this.purchaseRepository.find({
                where: { buyer: { buyer_id: buyerId } },
                relations: ['product'],
                order: { purchase_date: 'DESC' }
            });

            res.render('buyers/profile', {
                title: 'My Profile',
                buyer,
                purchases
            });
        } catch (error) {
            console.error('Error rendering profile page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while loading the profile page'
            });
        }
    }
}