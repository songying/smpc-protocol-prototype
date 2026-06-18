import { mongodb, User as UserInterface } from '../mongodb';
import { Collection } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

export class UserModel {
  private collection: Collection<UserInterface> | null = null;

  private async getCollection(): Promise<Collection<UserInterface>> {
    if (!this.collection) {
      this.collection = await mongodb.getCollection<UserInterface>('users');
    }
    return this.collection;
  }

  async create(userData: Omit<UserInterface, '_id' | 'createdAt'>): Promise<UserInterface> {
    const collection = await this.getCollection();
    
    const user: UserInterface = {
      ...userData,
      reputation: userData.reputation || 500, // Default neutral reputation
      totalJobs: userData.totalJobs || 0,
      successfulJobs: userData.successfulJobs || 0,
      totalEarnings: userData.totalEarnings || 0,
      createdAt: new Date(),
      lastActive: new Date(),
    };

    const result = await collection.insertOne(user);
    return { ...user, _id: result.insertedId.toString() };
  }

  async findByWalletAddress(walletAddress: string): Promise<UserInterface | null> {
    const collection = await this.getCollection();
    return await collection.findOne({ walletAddress: walletAddress.toLowerCase() });
  }

  async findById(id: string): Promise<UserInterface | null> {
    const collection = await this.getCollection();
    return await collection.findOne({ _id: id } as any);
  }

  async updateProfile(walletAddress: string, updates: Partial<UserInterface>): Promise<boolean> {
    const collection = await this.getCollection();
    
    const updateData = {
      ...updates,
      lastActive: new Date(),
    };

    const result = await collection.updateOne(
      { walletAddress: walletAddress.toLowerCase() },
      { $set: updateData }
    );

    return result.matchedCount > 0;
  }

  async updateKYCStatus(walletAddress: string, status: UserInterface['kycStatus']): Promise<boolean> {
    const collection = await this.getCollection();
    
    const result = await collection.updateOne(
      { walletAddress: walletAddress.toLowerCase() },
      { 
        $set: { 
          kycStatus: status,
          lastActive: new Date(),
        }
      }
    );

    return result.matchedCount > 0;
  }

  async addRole(walletAddress: string, role: NonNullable<UserInterface['roles']>[0]): Promise<boolean> {
    const collection = await this.getCollection();
    
    const result = await collection.updateOne(
      { walletAddress: walletAddress.toLowerCase() },
      { 
        $addToSet: { roles: role },
        $set: { lastActive: new Date() }
      }
    );

    return result.matchedCount > 0;
  }

  async removeRole(walletAddress: string, role: NonNullable<UserInterface['roles']>[0]): Promise<boolean> {
    const collection = await this.getCollection();
    
    const result = await collection.updateOne(
      { walletAddress: walletAddress.toLowerCase() },
      { 
        $pull: { roles: role },
        $set: { lastActive: new Date() }
      }
    );

    return result.matchedCount > 0;
  }

  async updateJobStats(walletAddress: string, increment: { totalJobs?: number; successfulJobs?: number; totalEarnings?: number }): Promise<boolean> {
    const collection = await this.getCollection();
    
    const incData: any = {};
    if (increment.totalJobs) incData.totalJobs = increment.totalJobs;
    if (increment.successfulJobs) incData.successfulJobs = increment.successfulJobs;
    if (increment.totalEarnings) incData.totalEarnings = increment.totalEarnings;

    const result = await collection.updateOne(
      { walletAddress: walletAddress.toLowerCase() },
      { 
        $inc: incData,
        $set: { lastActive: new Date() }
      }
    );

    return result.matchedCount > 0;
  }

  async updateReputation(walletAddress: string, newReputation: number): Promise<boolean> {
    const collection = await this.getCollection();
    
    // Ensure reputation stays within bounds (0-1000)
    const clampedReputation = Math.max(0, Math.min(1000, newReputation));
    
    const result = await collection.updateOne(
      { walletAddress: walletAddress.toLowerCase() },
      { 
        $set: { 
          reputation: clampedReputation,
          lastActive: new Date()
        }
      }
    );

    return result.matchedCount > 0;
  }

  async findByRole(role: NonNullable<UserInterface['roles']>[0], options?: {
    limit?: number;
    minReputation?: number;
    kycRequired?: boolean;
  }): Promise<UserInterface[]> {
    const collection = await this.getCollection();
    
    const query: any = { roles: role };
    
    if (options?.minReputation) {
      query.reputation = { $gte: options.minReputation };
    }
    
    if (options?.kycRequired) {
      query.kycStatus = 'approved';
    }

    return await collection
      .find(query)
      .sort({ reputation: -1 })
      .limit(options?.limit || 50)
      .toArray();
  }

  async getTopProviders(limit: number = 10): Promise<UserInterface[]> {
    const collection = await this.getCollection();
    
    return await collection
      .find({ 
        $or: [
          { roles: 'data_provider' },
          { roles: 'compute_provider' }
        ],
        successfulJobs: { $gt: 0 }
      })
      .sort({ 
        reputation: -1,
        successfulJobs: -1,
        totalEarnings: -1
      })
      .limit(limit)
      .toArray();
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    dataProviders: number;
    computeProviders: number;
    dataConsumers: number;
    avgReputation: number;
  }> {
    const collection = await this.getCollection();
    
    const [stats] = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: {
              $cond: [
                { $gt: ['$lastActive', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
                1,
                0
              ]
            }
          },
          dataProviders: {
            $sum: {
              $cond: [
                { $in: ['data_provider', { $ifNull: ['$roles', []] }] },
                1,
                0
              ]
            }
          },
          computeProviders: {
            $sum: {
              $cond: [
                { $in: ['compute_provider', { $ifNull: ['$roles', []] }] },
                1,
                0
              ]
            }
          },
          dataConsumers: {
            $sum: {
              $cond: [
                { $in: ['data_consumer', { $ifNull: ['$roles', []] }] },
                1,
                0
              ]
            }
          },
          avgReputation: { $avg: '$reputation' }
        }
      }
    ]).toArray();

    return stats || {
      totalUsers: 0,
      activeUsers: 0,
      dataProviders: 0,
      computeProviders: 0,
      dataConsumers: 0,
      avgReputation: 0
    };
  }

  async searchUsers(query: string, options?: {
    role?: NonNullable<UserInterface['roles']>[0];
    limit?: number;
  }): Promise<UserInterface[]> {
    const collection = await this.getCollection();
    
    const searchQuery: any = {
      $or: [
        { walletAddress: { $regex: query, $options: 'i' } },
        { 'profile.email': { $regex: query, $options: 'i' } }
      ]
    };

    if (options?.role) {
      searchQuery.roles = options.role;
    }

    return await collection
      .find(searchQuery)
      .sort({ reputation: -1 })
      .limit(options?.limit || 20)
      .toArray();
  }

  async delete(walletAddress: string): Promise<boolean> {
    const collection = await this.getCollection();
    
    const result = await collection.deleteOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });

    return result.deletedCount > 0;
  }

  // Bulk operations for admin/maintenance
  async bulkUpdateReputation(updates: Array<{ walletAddress: string; reputation: number }>): Promise<number> {
    const collection = await this.getCollection();
    
    const operations = updates.map(update => ({
      updateOne: {
        filter: { walletAddress: update.walletAddress.toLowerCase() },
        update: { 
          $set: { 
            reputation: Math.max(0, Math.min(1000, update.reputation)),
            lastActive: new Date()
          }
        }
      }
    }));

    const result = await collection.bulkWrite(operations);
    return result.matchedCount;
  }
}

// Export singleton instance
export const userModel = new UserModel();