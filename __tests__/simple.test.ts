import { describe, it, expect } from '@jest/globals'

describe('Simple Tests', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should test string operations', () => {
    const testString = 'Hello World'
    expect(testString.toLowerCase()).toBe('hello world')
    expect(testString.includes('World')).toBe(true)
  })

  it('should test array operations', () => {
    const testArray = [1, 2, 3, 4, 5]
    expect(testArray.length).toBe(5)
    expect(testArray.includes(3)).toBe(true)
    expect(testArray.filter(x => x > 3)).toEqual([4, 5])
  })

  it('should test object operations', () => {
    const testObject = { name: 'Test', value: 42, active: true }
    expect(testObject.name).toBe('Test')
    expect(testObject.value).toBe(42)
    expect(testObject.active).toBe(true)
    expect(Object.keys(testObject)).toEqual(['name', 'value', 'active'])
  })

  it('should test async operations', async () => {
    const asyncFunction = async (value: number) => {
      return new Promise<number>(resolve => {
        setTimeout(() => resolve(value * 2), 10)
      })
    }

    const result = await asyncFunction(21)
    expect(result).toBe(42)
  })
})