import { mongodb, Job as JobInterface } from '../mongodb';
import { Collection } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

export class JobModel {
  private collection: Collection<JobInterface> | null = null;

  private async getCollection(): Promise<Collection<JobInterface>> {
    if (!this.collection) {
      this.collection = await mongodb.getCollection<JobInterface>('jobs');
    }
    return this.collection;
  }

  async create(jobData: Omit<JobInterface, '_id' | 'createdAt' | 'updatedAt'>): Promise<JobInterface> {
    const collection = await this.getCollection();
    
    const job: JobInterface = {
      ...jobData,
      status: jobData.status || 'created',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(job);
    return { ...job, _id: result.insertedId.toString() };
  }

  async findByJobId(jobId: string): Promise<JobInterface | null> {
    const collection = await this.getCollection();
    return await collection.findOne({ jobId });
  }

  async findById(id: string): Promise<JobInterface | null> {
    const collection = await this.getCollection();
    return await collection.findOne({ _id: id } as any);
  }

  async findByConsumer(consumer: string, options?: {
    status?: JobInterface['status'];
    limit?: number;
    offset?: number;
  }): Promise<JobInterface[]> {
    const collection = await this.getCollection();
    
    const query: any = { consumer: consumer.toLowerCase() };
    if (options?.status) {
      query.status = options.status;
    }

    return await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 50)
      .toArray();
  }

  async findByProvider(providerAddress: string, providerType: 'data' | 'compute', options?: {
    status?: JobInterface['status'];
    limit?: number;
  }): Promise<JobInterface[]> {
    const collection = await this.getCollection();
    
    const query: any = {};
    if (providerType === 'data') {
      query['participants.dataProviders'] = providerAddress.toLowerCase();
    } else {
      query['participants.computeProviders'] = providerAddress.toLowerCase();
    }

    if (options?.status) {
      query.status = options.status;
    }

    return await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(options?.limit || 50)
      .toArray();
  }

  async findByStatus(status: JobInterface['status'], options?: {
    category?: JobInterface['category'];
    limit?: number;
  }): Promise<JobInterface[]> {
    const collection = await this.getCollection();
    
    const query: any = { status };
    if (options?.category) {
      query.category = options.category;
    }

    return await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(options?.limit || 100)
      .toArray();
  }

  async findByCategory(category: JobInterface['category'], options?: {
    status?: JobInterface['status'];
    limit?: number;
  }): Promise<JobInterface[]> {
    const collection = await this.getCollection();
    
    const query: any = { category };
    if (options?.status) {
      query.status = options.status;
    }

    return await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(options?.limit || 50)
      .toArray();
  }

  async updateStatus(jobId: string, status: JobInterface['status']): Promise<boolean> {
    const collection = await this.getCollection();
    
    const result = await collection.updateOne(
      { jobId },
      { 
        $set: { 
          status,
          updatedAt: new Date()
        }
      }
    );

    return result.matchedCount > 0;
  }

  async updateParticipants(jobId: string, participants: JobInterface['participants']): Promise<boolean> {
    const collection = await this.getCollection();
    
    const result = await collection.updateOne(
      { jobId },
      { 
        $set: { 
          participants,
          updatedAt: new Date()
        }
      }
    );

    return result.matchedCount > 0;
  }

  async setFinalPrice(jobId: string, finalPrice: number): Promise<boolean> {
    const collection = await this.getCollection();
    
    const result = await collection.updateOne(
      { jobId },
      { 
        $set: { 
          finalPrice,
          updatedAt: new Date()
        }
      }
    );

    return result.matchedCount > 0;
  }

  async updateResults(jobId: string, results: JobInterface['results']): Promise<boolean> {
    const collection = await this.getCollection();
    
    const updateData = {
      results: {
        ...results,
        completedAt: new Date()
      },
      status: 'completed' as const,
      updatedAt: new Date()
    };

    const result = await collection.updateOne(
      { jobId },
      { $set: updateData }
    );

    return result.matchedCount > 0;
  }

  async findExpiredJobs(beforeDate?: Date): Promise<JobInterface[]> {
    const collection = await this.getCollection();
    const cutoffDate = beforeDate || new Date();
    
    return await collection
      .find({
        deadline: { $lt: cutoffDate },
        status: { $in: ['created', 'bidding'] }
      })
      .toArray();
  }

  async findActiveJobs(): Promise<JobInterface[]> {
    const collection = await this.getCollection();
    
    return await collection
      .find({
        status: { $in: ['created', 'bidding', 'assigned', 'computing'] }
      })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async searchJobs(searchTerm: string, options?: {
    category?: JobInterface['category'];
    status?: JobInterface['status'];
    limit?: number;
  }): Promise<JobInterface[]> {
    const collection = await this.getCollection();
    
    const query: any = {
      $or: [
        { jobId: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ]
    };

    if (options?.category) {
      query.category = options.category;
    }
    
    if (options?.status) {
      query.status = options.status;
    }

    return await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(options?.limit || 20)
      .toArray();
  }

  async getJobStats(): Promise<{
    totalJobs: number;
    completedJobs: number;
    activeJobs: number;
    failedJobs: number;
    totalVolume: number;
    avgJobValue: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const collection = await this.getCollection();
    
    const [stats] = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          completedJobs: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          activeJobs: {
            $sum: { 
              $cond: [
                { $in: ['$status', ['created', 'bidding', 'assigned', 'computing']] },
                1,
                0
              ]
            }
          },
          failedJobs: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          totalVolume: {
            $sum: { $ifNull: ['$finalPrice', 0] }
          },
          avgJobValue: {
            $avg: { $ifNull: ['$finalPrice', 0] }
          }
        }
      }
    ]).toArray();

    // Get category breakdown
    const categoryStats = await collection.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]).toArray();

    // Get status breakdown
    const statusStats = await collection.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();

    const byCategory: Record<string, number> = {};
    categoryStats.forEach(stat => {
      byCategory[stat._id] = stat.count;
    });

    const byStatus: Record<string, number> = {};
    statusStats.forEach(stat => {
      byStatus[stat._id] = stat.count;
    });

    return {
      ...stats,
      totalJobs: stats?.totalJobs || 0,
      completedJobs: stats?.completedJobs || 0,
      activeJobs: stats?.activeJobs || 0,
      failedJobs: stats?.failedJobs || 0,
      totalVolume: stats?.totalVolume || 0,
      avgJobValue: stats?.avgJobValue || 0,
      byCategory,
      byStatus
    };
  }

  async getJobsByDateRange(startDate: Date, endDate: Date): Promise<JobInterface[]> {
    const collection = await this.getCollection();
    
    return await collection
      .find({
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async updateComputationParameters(jobId: string, computation: JobInterface['computation']): Promise<boolean> {
    const collection = await this.getCollection();
    
    const result = await collection.updateOne(
      { jobId },
      { 
        $set: { 
          computation,
          updatedAt: new Date()
        }
      }
    );

    return result.matchedCount > 0;
  }

  async delete(jobId: string): Promise<boolean> {
    const collection = await this.getCollection();
    
    const result = await collection.deleteOne({ jobId });
    return result.deletedCount > 0;
  }

  // Administrative functions
  async bulkUpdateStatus(jobIds: string[], status: JobInterface['status']): Promise<number> {
    const collection = await this.getCollection();
    
    const result = await collection.updateMany(
      { jobId: { $in: jobIds } },
      { 
        $set: { 
          status,
          updatedAt: new Date()
        }
      }
    );

    return result.matchedCount;
  }

  async getJobsRequiringCleanup(olderThanDays: number = 30): Promise<JobInterface[]> {
    const collection = await this.getCollection();
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    return await collection
      .find({
        status: { $in: ['completed', 'failed', 'cancelled'] },
        updatedAt: { $lt: cutoffDate }
      })
      .toArray();
  }

  // Healthcare demo specific methods
  async createHealthcareDemo(): Promise<JobInterface> {
    const demoJobId = `demo_healthcare_${Date.now()}`;
    
    const demoJob: Omit<JobInterface, '_id' | 'createdAt' | 'updatedAt'> = {
      jobId: demoJobId,
      consumer: '0x2345678901234567890123456789012345678901', // Demo consumer from init script
      category: 'healthcare',
      description: 'Statistical analysis of health screening data for population health study',
      reservePrice: 0.05,
      buyNowPrice: 0.1,
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      maxComputeTime: 3600, // 1 hour
      status: 'created',
      computation: {
        type: 'statistical_analysis',
        parameters: {
          analysisType: 'correlation',
          metrics: ['bmi', 'blood_pressure', 'cholesterol'],
          privacyLevel: 'high'
        },
        requirements: ['minimum_3_parties', 'differential_privacy']
      },
      privacy: {
        level: 'high',
        requirements: ['zero_knowledge_proof', 'metadata_privacy']
      }
    };

    return await this.create(demoJob);
  }
}

// Export singleton instance
export const jobModel = new JobModel();