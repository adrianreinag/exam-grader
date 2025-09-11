import { render, screen } from '@testing-library/react'
import { Badge } from './badge'

describe('Badge Component', () => {
  it('renders with default props', () => {
    render(<Badge>Default Badge</Badge>)
    const badge = screen.getByText('Default Badge')
    
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-md')
  })

  it('renders different variants correctly', () => {
    const { rerender } = render(<Badge variant="secondary">Secondary</Badge>)
    expect(screen.getByText('Secondary')).toHaveClass('bg-secondary')

    rerender(<Badge variant="destructive">Destructive</Badge>)
    expect(screen.getByText('Destructive')).toHaveClass('bg-destructive')

    rerender(<Badge variant="outline">Outline</Badge>)
    expect(screen.getByText('Outline')).toHaveClass('text-foreground')
  })

  it('applies default variant when no variant is specified', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default')).toHaveClass('bg-primary')
  })

  it('accepts custom className', () => {
    render(<Badge className="custom-badge-class">Custom</Badge>)
    expect(screen.getByText('Custom')).toHaveClass('custom-badge-class')
  })

  it('supports all HTML div attributes', () => {
    render(
      <Badge 
        id="test-badge" 
        role="status" 
        aria-label="Status badge"
        data-testid="badge"
      >
        Test Badge
      </Badge>
    )
    
    const badge = screen.getByTestId('badge')
    expect(badge).toHaveAttribute('id', 'test-badge')
    expect(badge).toHaveAttribute('role', 'status')
    expect(badge).toHaveAttribute('aria-label', 'Status badge')
  })

  it('renders with different content types', () => {
    const { rerender } = render(<Badge>Text Badge</Badge>)
    expect(screen.getByText('Text Badge')).toBeInTheDocument()

    rerender(<Badge>123</Badge>)
    expect(screen.getByText('123')).toBeInTheDocument()

    rerender(
      <Badge>
        <span>Complex Content</span>
      </Badge>
    )
    expect(screen.getByText('Complex Content')).toBeInTheDocument()
  })

  it('maintains consistent styling across variants', () => {
    const variants = ['default', 'secondary', 'destructive', 'outline'] as const
    
    variants.forEach(variant => {
      const { unmount } = render(<Badge variant={variant}>{variant}</Badge>)
      const badge = screen.getByText(variant)
      
      // Common classes that should be present in all variants
      expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-md')
      expect(badge).toHaveClass('px-2.5', 'py-0.5', 'text-xs', 'font-semibold')
      
      unmount()
    })
  })
})