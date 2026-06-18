import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { CONTRACT_ADDRESSES } from '@/lib/wagmi'
import DataRegistryABI from '../../artifacts/contracts/DataRegistry.sol/DataRegistry.json'

export const useDataRegistry = () => {
  // Write contract hook for registering data
  const { 
    writeContract, 
    data: registerHash,
    isPending: isRegistering,
    error: registerError 
  } = useWriteContract()

  // Wait for registration transaction
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed 
  } = useWaitForTransactionReceipt({ 
    hash: registerHash 
  })

  // Read total data entries
  const { data: totalEntries } = useReadContract({
    address: CONTRACT_ADDRESSES.DataRegistry,
    abi: DataRegistryABI.abi,
    functionName: 'totalDataEntries'
  })

  // Register data function
  const registerData = async ({
    dataHash,
    metadataURI,
    price,
    category,
    tags,
    isEncrypted,
    dataSize
  }: {
    dataHash: string
    metadataURI: string  
    price: string
    category: number
    tags: string[]
    isEncrypted: boolean
    dataSize: number
  }) => {
    try {
      writeContract({
        address: CONTRACT_ADDRESSES.DataRegistry,
        abi: DataRegistryABI.abi,
        functionName: 'registerData',
        args: [
          dataHash,
          metadataURI,
          parseEther(price),
          category,
          tags,
          isEncrypted,
          BigInt(dataSize)
        ]
      })
    } catch (error) {
      console.error('Error registering data:', error)
      throw error
    }
  }

  // Get data entry function
  const getDataEntry = async (dataHash: string) => {
    try {
      const { data } = await useReadContract({
        address: CONTRACT_ADDRESSES.DataRegistry,
        abi: DataRegistryABI.abi,
        functionName: 'getDataEntry',
        args: [dataHash]
      })
      return data
    } catch (error) {
      console.error('Error getting data entry:', error)
      return null
    }
  }

  return {
    registerData,
    getDataEntry,
    isRegistering,
    isConfirming,
    isConfirmed,
    registerError,
    totalEntries: totalEntries ? Number(totalEntries) : 0
  }
}