/**
 * CategoryTree Component Tests
 *
 * Tests for the hierarchical category tree component covering:
 * - Rendering states (empty, with categories)
 * - Expand/collapse interactions
 * - Keyboard navigation
 * - Product count badges
 * - Inactive category badges
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { CategoryTree, type CategoryNode } from '@/components/domain/products/category-tree'

// Note: @testing-library/user-event is not installed. To add proper user interaction testing:
// npm install -D @testing-library/user-event

// Mock data factory
const createMockCategory = (overrides: Partial<CategoryNode> = {}): CategoryNode => ({
  id: 'cat-1',
  name: 'Test Category',
  description: null,
  parentId: null,
  productCount: 0,
  sortOrder: 0,
  isActive: true,
  children: [],
  ...overrides,
})

describe('CategoryTree', () => {
  describe('Rendering', () => {
    it('renders empty state when no categories provided', () => {
      render(<CategoryTree categories={[]} />)

      expect(screen.getByText('No categories yet')).toBeInTheDocument()
      expect(
        screen.getByText('Create your first category to organize products')
      ).toBeInTheDocument()
    })

    it('renders loading state when isLoading is true', () => {
      render(<CategoryTree categories={[]} isLoading />)

      // Check for loading spinner
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('renders category nodes with names', () => {
      const categories = [
        createMockCategory({ id: 'cat-1', name: 'Electronics' }),
        createMockCategory({ id: 'cat-2', name: 'Furniture' }),
      ]

      render(<CategoryTree categories={categories} />)

      expect(screen.getByText('Electronics')).toBeInTheDocument()
      expect(screen.getByText('Furniture')).toBeInTheDocument()
    })

    it('renders nested categories correctly', () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Electronics',
          children: [
            createMockCategory({
              id: 'cat-1-1',
              name: 'Laptops',
              parentId: 'cat-1',
            }),
            createMockCategory({
              id: 'cat-1-2',
              name: 'Phones',
              parentId: 'cat-1',
            }),
          ],
        }),
      ]

      render(<CategoryTree categories={categories} />)

      expect(screen.getByText('Electronics')).toBeInTheDocument()
      expect(screen.getByText('Laptops')).toBeInTheDocument()
      expect(screen.getByText('Phones')).toBeInTheDocument()
    })
  })

  describe('Expand/Collapse', () => {
    it('renders expand/collapse toggle for categories with children', () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Electronics',
          children: [
            createMockCategory({
              id: 'cat-1-1',
              name: 'Laptops',
              parentId: 'cat-1',
            }),
          ],
        }),
      ]

      render(<CategoryTree categories={categories} />)

      const expandButton = screen.getByLabelText('Collapse Electronics')
      expect(expandButton).toBeInTheDocument()
      expect(expandButton).not.toBeDisabled()
    })

    it('does not show toggle for categories without children', () => {
      const categories = [createMockCategory({ id: 'cat-1', name: 'Electronics' })]

      render(<CategoryTree categories={categories} />)

      // The button exists but is invisible (has 'invisible' class)
      const buttons = screen.getAllByRole('button')
      const toggleButton = buttons.find((btn) => btn.getAttribute('aria-label')?.includes('Expand'))
      expect(toggleButton).toHaveClass('invisible')
    })

    it('expands all categories on "Expand All" button click', () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Electronics',
          children: [
            createMockCategory({
              id: 'cat-1-1',
              name: 'Laptops',
              parentId: 'cat-1',
              children: [
                createMockCategory({
                  id: 'cat-1-1-1',
                  name: 'Gaming Laptops',
                  parentId: 'cat-1-1',
                }),
              ],
            }),
          ],
        }),
      ]

      render(<CategoryTree categories={categories} />)

      const expandAllButton = screen.getByRole('button', { name: 'Expand All' })
      expandAllButton.click()

      // All categories should have aria-expanded=true
      const treeItems = screen.getAllByRole('treeitem')
      const expandedItems = treeItems.filter((item) => item.getAttribute('aria-expanded') === 'true')
      expect(expandedItems.length).toBeGreaterThan(0)
    })

    it('collapses all categories on "Collapse All" button click', () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Electronics',
          children: [
            createMockCategory({
              id: 'cat-1-1',
              name: 'Laptops',
              parentId: 'cat-1',
            }),
          ],
        }),
      ]

      render(<CategoryTree categories={categories} />)

      const collapseAllButton = screen.getByRole('button', { name: 'Collapse All' })
      collapseAllButton.click()

      // Check that children are not visible
      const laptops = screen.queryByText('Laptops')
      expect(laptops).not.toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    it('allows Enter key to select category', () => {
      const onSelect = vi.fn()
      const categories = [createMockCategory({ id: 'cat-1', name: 'Electronics' })]

      render(<CategoryTree categories={categories} onSelect={onSelect} />)

      const treeItem = screen.getByRole('treeitem', { name: /Electronics/ })
      treeItem.focus()

      // Simulate Enter key
      treeItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cat-1',
          name: 'Electronics',
        })
      )
    })

    it('allows Space key to select category', () => {
      const onSelect = vi.fn()
      const categories = [createMockCategory({ id: 'cat-1', name: 'Electronics' })]

      render(<CategoryTree categories={categories} onSelect={onSelect} />)

      const treeItem = screen.getByRole('treeitem', { name: /Electronics/ })
      treeItem.focus()

      // Simulate Space key
      treeItem.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cat-1',
          name: 'Electronics',
        })
      )
    })

    it('expands category with ArrowRight key when collapsed', () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Electronics',
          children: [
            createMockCategory({
              id: 'cat-1-1',
              name: 'Laptops',
              parentId: 'cat-1',
            }),
          ],
        }),
      ]

      render(<CategoryTree categories={categories} />)

      // First collapse it
      const collapseAllButton = screen.getByRole('button', { name: 'Collapse All' })
      collapseAllButton.click()

      const treeItem = screen.getByRole('treeitem', { name: /Electronics/ })
      treeItem.focus()

      // Simulate ArrowRight key
      treeItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))

      // Check that it's expanded
      expect(treeItem).toHaveAttribute('aria-expanded', 'true')
    })

    it('collapses category with ArrowLeft key when expanded', () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Electronics',
          children: [
            createMockCategory({
              id: 'cat-1-1',
              name: 'Laptops',
              parentId: 'cat-1',
            }),
          ],
        }),
      ]

      render(<CategoryTree categories={categories} />)

      const treeItem = screen.getByRole('treeitem', { name: /Electronics/ })
      treeItem.focus()

      // Simulate ArrowLeft key
      treeItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))

      // Check that it's collapsed
      expect(treeItem).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('Product Count Badge', () => {
    it('shows product count badge when productCount > 0', () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Electronics',
          productCount: 42,
        }),
      ]

      render(<CategoryTree categories={categories} showProductCounts />)

      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('does not show product count badge when productCount is 0', () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Electronics',
          productCount: 0,
        }),
      ]

      render(<CategoryTree categories={categories} showProductCounts />)

      // Badge should not be rendered
      const badges = document.querySelectorAll('.text-xs')
      const countBadge = Array.from(badges).find((badge) => badge.textContent === '0')
      expect(countBadge).toBeUndefined()
    })

    it('hides product count badge when showProductCounts is false', () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Electronics',
          productCount: 42,
        }),
      ]

      render(<CategoryTree categories={categories} showProductCounts={false} />)

      expect(screen.queryByText('42')).not.toBeInTheDocument()
    })
  })

  describe('Inactive Badge', () => {
    it('shows inactive badge for inactive categories', () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Electronics',
          isActive: false,
        }),
      ]

      render(<CategoryTree categories={categories} />)

      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })

    it('does not show inactive badge for active categories', () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Electronics',
          isActive: true,
        }),
      ]

      render(<CategoryTree categories={categories} />)

      expect(screen.queryByText('Inactive')).not.toBeInTheDocument()
    })

    it('applies reduced opacity to inactive categories', () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Electronics',
          isActive: false,
        }),
      ]

      render(<CategoryTree categories={categories} />)

      const treeItem = screen.getByRole('treeitem', { name: /Electronics/ })
      expect(treeItem).toHaveClass('opacity-60')
    })
  })

  describe('Selection', () => {
    it('highlights selected category', () => {
      const categories = [
        createMockCategory({ id: 'cat-1', name: 'Electronics' }),
        createMockCategory({ id: 'cat-2', name: 'Furniture' }),
      ]

      render(<CategoryTree categories={categories} selectedId="cat-1" />)

      const electronicsItem = screen.getByRole('treeitem', { name: /Electronics/ })
      const furnitureItem = screen.getByRole('treeitem', { name: /Furniture/ })

      expect(electronicsItem).toHaveAttribute('aria-selected', 'true')
      expect(furnitureItem).toHaveAttribute('aria-selected', 'false')
    })

    it('calls onSelect when category is clicked', () => {
      const onSelect = vi.fn()
      const categories = [createMockCategory({ id: 'cat-1', name: 'Electronics' })]

      render(<CategoryTree categories={categories} onSelect={onSelect} />)

      const treeItem = screen.getByRole('treeitem', { name: /Electronics/ })
      treeItem.click()

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cat-1',
          name: 'Electronics',
        })
      )
    })
  })

  describe('Actions', () => {
    it('shows actions dropdown on hover', () => {
      const categories = [createMockCategory({ id: 'cat-1', name: 'Electronics' })]

      render(<CategoryTree categories={categories} />)

      // The dropdown trigger button exists but is initially hidden (opacity-0)
      const moreButton = screen.getByRole('button', { name: '' })
      expect(moreButton).toHaveClass('opacity-0')
    })

    it('calls onEdit when Edit action is clicked', () => {
      const onEdit = vi.fn()
      const categories = [createMockCategory({ id: 'cat-1', name: 'Electronics' })]

      render(<CategoryTree categories={categories} onEdit={onEdit} />)

      // Click the more button to open dropdown
      const moreButtons = screen.getAllByRole('button').filter((btn) => {
        const svg = btn.querySelector('svg')
        return svg?.classList.contains('lucide-more-horizontal')
      })
      moreButtons[0].click()

      // Click the Edit menu item
      const editButton = screen.getByText('Edit').closest('div')
      editButton?.click()

      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cat-1',
          name: 'Electronics',
        })
      )
    })

    it('calls onAddChild when Add Subcategory is clicked', () => {
      const onAddChild = vi.fn()
      const categories = [createMockCategory({ id: 'cat-1', name: 'Electronics' })]

      render(<CategoryTree categories={categories} onAddChild={onAddChild} />)

      // Click the more button to open dropdown
      const moreButtons = screen.getAllByRole('button').filter((btn) => {
        const svg = btn.querySelector('svg')
        return svg?.classList.contains('lucide-more-horizontal')
      })
      moreButtons[0].click()

      // Click the Add Subcategory menu item
      const addButton = screen.getByText('Add Subcategory').closest('div')
      addButton?.click()

      expect(onAddChild).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cat-1',
          name: 'Electronics',
        })
      )
    })

    it('shows delete confirmation dialog when Delete is clicked', () => {
      const categories = [createMockCategory({ id: 'cat-1', name: 'Electronics' })]

      render(<CategoryTree categories={categories} />)

      // Click the more button to open dropdown
      const moreButtons = screen.getAllByRole('button').filter((btn) => {
        const svg = btn.querySelector('svg')
        return svg?.classList.contains('lucide-more-horizontal')
      })
      moreButtons[0].click()

      // Click the Delete menu item
      const deleteButton = screen.getByText('Delete').closest('div')
      deleteButton?.click()

      // Check for delete dialog
      expect(screen.getByText('Delete Category')).toBeInTheDocument()
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument()
    })

    it('shows warning in delete dialog for categories with children', () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Electronics',
          children: [
            createMockCategory({
              id: 'cat-1-1',
              name: 'Laptops',
              parentId: 'cat-1',
            }),
            createMockCategory({
              id: 'cat-1-2',
              name: 'Phones',
              parentId: 'cat-1',
            }),
          ],
        }),
      ]

      render(<CategoryTree categories={categories} />)

      // Open dropdown and click delete
      const moreButtons = screen.getAllByRole('button').filter((btn) => {
        const svg = btn.querySelector('svg')
        return svg?.classList.contains('lucide-more-horizontal')
      })
      moreButtons[0].click()

      const deleteButton = screen.getByText('Delete').closest('div')
      deleteButton?.click()

      // Check for warning
      expect(screen.getByText(/This category has 2 subcategories/)).toBeInTheDocument()
    })

    it('shows warning in delete dialog for categories with products', () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Electronics',
          productCount: 15,
        }),
      ]

      render(<CategoryTree categories={categories} />)

      // Open dropdown and click delete
      const moreButtons = screen.getAllByRole('button').filter((btn) => {
        const svg = btn.querySelector('svg')
        return svg?.classList.contains('lucide-more-horizontal')
      })
      moreButtons[0].click()

      const deleteButton = screen.getByText('Delete').closest('div')
      deleteButton?.click()

      // Check for warning
      expect(screen.getByText(/15 products are in this category/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('uses proper ARIA tree roles', () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Electronics',
          children: [
            createMockCategory({
              id: 'cat-1-1',
              name: 'Laptops',
              parentId: 'cat-1',
            }),
          ],
        }),
      ]

      render(<CategoryTree categories={categories} />)

      const treeItems = screen.getAllByRole('treeitem')
      expect(treeItems.length).toBeGreaterThan(0)
    })

    it('sets correct aria-level for nested items', () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Electronics',
          children: [
            createMockCategory({
              id: 'cat-1-1',
              name: 'Laptops',
              parentId: 'cat-1',
            }),
          ],
        }),
      ]

      render(<CategoryTree categories={categories} />)

      const electronicsItem = screen.getByRole('treeitem', { name: /Electronics/ })
      const laptopsItem = screen.getByRole('treeitem', { name: /Laptops/ })

      expect(electronicsItem).toHaveAttribute('aria-level', '1')
      expect(laptopsItem).toHaveAttribute('aria-level', '2')
    })

    it('sets tabIndex correctly for keyboard navigation', () => {
      const categories = [
        createMockCategory({ id: 'cat-1', name: 'Electronics' }),
        createMockCategory({ id: 'cat-2', name: 'Furniture' }),
      ]

      render(<CategoryTree categories={categories} selectedId="cat-1" />)

      const electronicsItem = screen.getByRole('treeitem', { name: /Electronics/ })
      const furnitureItem = screen.getByRole('treeitem', { name: /Furniture/ })

      // Selected item should have tabIndex 0
      expect(electronicsItem).toHaveAttribute('tabIndex', '0')
      // Other items should have tabIndex -1
      expect(furnitureItem).toHaveAttribute('tabIndex', '-1')
    })
  })
})
