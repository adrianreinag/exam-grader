import { render, screen } from '@testing-library/react'
import { DemoStatusProvider, useDemo } from './DemoContext'

// Test component to consume the context
function TestComponent() {
  const isDemo = useDemo()
  return <div data-testid="demo-status">{isDemo ? 'demo' : 'production'}</div>
}

describe('DemoContext', () => {
  it('should provide demo status as true when isDemo is true', () => {
    render(
      <DemoStatusProvider isDemo={true}>
        <TestComponent />
      </DemoStatusProvider>
    )

    expect(screen.getByTestId('demo-status')).toHaveTextContent('demo')
  })

  it('should provide demo status as false when isDemo is false', () => {
    render(
      <DemoStatusProvider isDemo={false}>
        <TestComponent />
      </DemoStatusProvider>
    )

    expect(screen.getByTestId('demo-status')).toHaveTextContent('production')
  })

  it('should default to false when no provider is present', () => {
    render(<TestComponent />)

    expect(screen.getByTestId('demo-status')).toHaveTextContent('production')
  })

  it('should handle nested providers correctly', () => {
    render(
      <DemoStatusProvider isDemo={false}>
        <DemoStatusProvider isDemo={true}>
          <TestComponent />
        </DemoStatusProvider>
      </DemoStatusProvider>
    )

    // Should use the innermost provider value
    expect(screen.getByTestId('demo-status')).toHaveTextContent('demo')
  })

  it('should render children correctly', () => {
    render(
      <DemoStatusProvider isDemo={true}>
        <div data-testid="child">Child content</div>
        <TestComponent />
      </DemoStatusProvider>
    )

    expect(screen.getByTestId('child')).toHaveTextContent('Child content')
    expect(screen.getByTestId('demo-status')).toHaveTextContent('demo')
  })

  it('should handle multiple consumers', () => {
    function MultipleConsumers() {
      return (
        <>
          <TestComponent />
          <TestComponent />
        </>
      )
    }

    render(
      <DemoStatusProvider isDemo={true}>
        <MultipleConsumers />
      </DemoStatusProvider>
    )

    const elements = screen.getAllByTestId('demo-status')
    expect(elements).toHaveLength(2)
    elements.forEach(element => {
      expect(element).toHaveTextContent('demo')
    })
  })
})