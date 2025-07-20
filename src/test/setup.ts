import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock console.log to avoid noise in tests
global.console = {
  ...console,
  log: vi.fn(),
}