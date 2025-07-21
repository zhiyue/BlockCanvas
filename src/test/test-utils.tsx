import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { CoordinateSystemProvider } from '../contexts/CoordinateSystemContext'

// Custom render function that includes all necessary providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add any custom options here if needed
}

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <CoordinateSystemProvider>
      <DndContext>
        {children}
      </DndContext>
    </CoordinateSystemProvider>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: CustomRenderOptions,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { customRender as render }

// Export the wrapper for cases where you need it directly
export { AllTheProviders as TestWrapper }
