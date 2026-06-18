// Mock wagmi hooks for testing
export const useAccount = jest.fn(() => ({
  address: undefined,
  isConnected: false,
  isConnecting: false,
  isDisconnected: true,
  isReconnecting: false,
  status: 'disconnected'
}))

export const useConnect = jest.fn(() => ({
  connect: jest.fn(),
  connectors: [],
  error: null,
  isLoading: false,
  pendingConnector: null,
}))

export const useDisconnect = jest.fn(() => ({
  disconnect: jest.fn(),
}))

export const useBalance = jest.fn(() => ({
  data: undefined,
  error: null,
  isLoading: false,
}))

export const useContractRead = jest.fn(() => ({
  data: undefined,
  error: null,
  isLoading: false,
}))

export const useContractWrite = jest.fn(() => ({
  data: undefined,
  error: null,
  isLoading: false,
  write: jest.fn(),
}))

export const usePrepareContractWrite = jest.fn(() => ({
  config: {},
  error: null,
  isLoading: false,
}))

export const useWaitForTransaction = jest.fn(() => ({
  data: undefined,
  error: null,
  isLoading: false,
}))