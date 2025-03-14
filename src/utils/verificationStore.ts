// src/utils/verificationStore.ts

interface VerificationData {
    email: string;
    username: string;
    password: string;
    token: string;
    expires: Date;
  }
  
  class VerificationStore {
    private store: Map<string, VerificationData> = new Map();
    
    addToken(email: string, username: string, password: string): string {
      const token = Math.floor(100000 + Math.random() * 900000).toString();
      
      const expires = new Date();
      expires.setHours(expires.getHours() + 24);
      
      this.store.set(token, {
        email,
        username,
        password,
        token,
        expires
      });
      
      return token;
    }
    
    getByToken(token: string): VerificationData | undefined {
      const data = this.store.get(token);
      
      if (data && data.expires > new Date()) {
        return data;
      }
      
      if (data) {
        this.store.delete(token);
      }
      
      return undefined;
    }
    
    getByEmail(email: string): VerificationData | undefined {
      for (const data of this.store.values()) {
        if (data.email === email && data.expires > new Date()) {
          return data;
        }
      }
      return undefined;
    }

    removeToken(token: string): void {
      this.store.delete(token);
    }
  }
  
  export const verificationStore = new VerificationStore();