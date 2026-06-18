// Simplified auth utilities for demo

export class Web3Auth {
  static generateAuthMessage(walletAddress: string, nonce: string): string {
    const domain = 'http://localhost:3000';
    const timestamp = new Date().toISOString();
    
    return `Welcome to SMPC Protocol!

Please sign this message to authenticate your wallet.

Domain: ${domain}
Address: ${walletAddress}
Nonce: ${nonce}
Timestamp: ${timestamp}

This signature will not trigger any blockchain transaction or cost any gas fees.`;
  }

  static async createSignatureRequest(walletAddress: string) {
    const nonce = Math.random().toString(36).substring(2, 15);
    const message = this.generateAuthMessage(walletAddress, nonce);
    
    return {
      message,
      nonce,
      timestamp: Date.now(),
      address: walletAddress.toLowerCase()
    };
  }

  static async verifySignature(signature: string, message: string, walletAddress: string) {
    // Demo verification - always returns true
    return {
      isValid: true,
      address: walletAddress.toLowerCase(),
      message,
      signature,
      recoveredAddress: walletAddress.toLowerCase()
    };
  }

  static async authenticateUser(walletAddress: string, signature: string, message: string, nonce: string) {
    // Demo authentication - always succeeds
    return {
      success: true,
      user: {
        walletAddress: walletAddress.toLowerCase(),
        chainId: 1,
        role: 'data-provider',
        signature,
        nonce,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
  }

  static async createUserProfile(walletAddress: string, role: string, chainId: number) {
    return {
      id: `user_${walletAddress.toLowerCase()}`,
      walletAddress: walletAddress.toLowerCase(),
      role,
      isVerified: false,
      permissions: [],
      metadata: {
        preferredChain: chainId,
        theme: 'system',
        language: 'en'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static async createSession(walletAddress: string, role: string, chainId: number) {
    const userId = `user_${walletAddress.toLowerCase()}`;
    const sessionId = `session_${userId}_${Date.now()}`;
    
    return {
      id: sessionId,
      userId,
      walletAddress: walletAddress.toLowerCase(),
      role,
      chainId,
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      lastActive: new Date()
    };
  }

  static async validateSession(sessionId: string) {
    // Demo validation - always valid
    return {
      id: sessionId,
      userId: 'demo_user',
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: 'data-provider',
      chainId: 1,
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      lastActive: new Date()
    };
  }

  static async logout(sessionId: string) {
    return true;
  }

  static async getUserProfile(userId: string) {
    return {
      id: userId,
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: 'data-provider',
      isVerified: false,
      permissions: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static async updateUserProfile(userId: string, updates: any) {
    return true;
  }
}

export default Web3Auth;