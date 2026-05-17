import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  ArrowDownToLine,
  ChevronRight,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDebounce } from '@/hooks';
import { useInventorySearch } from '@/hooks/inventory';

interface InventoryDashboardCommandBarProps {
  onRefresh: () => void | Promise<void>;
}

interface InventorySearchItem {
  id: string;
  productId?: string | null;
  productName: string;
  productSku?: string | null;
  serialNumber?: string | null;
  locationName?: string | null;
  quantityOnHand: number;
  status: string;
}

export function InventoryDashboardCommandBar({ onRefresh }: InventoryDashboardCommandBarProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: searchResults, isLoading: isSearching } = useInventorySearch(
    debouncedSearch,
    { limit: 8 },
    debouncedSearch.length >= 2
  );
  const searchItems = (searchResults?.items ?? []) as InventorySearchItem[];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
          event.preventDefault();
          document.getElementById('inventory-search')?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const clearSearch = () => {
    setIsSearchFocused(false);
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1" ref={searchRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          id="inventory-search"
          type="search"
          placeholder="Search products, SKUs, serials..."
          className="pl-10 pr-12"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              clearSearch();
            }
          }}
          aria-label="Search inventory"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded pointer-events-none z-10">
          /
        </kbd>

        {isSearchFocused && debouncedSearch.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-[320px] overflow-y-auto">
            {isSearching ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : searchItems.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No inventory found for &quot;{debouncedSearch}&quot;
              </div>
            ) : (
              <div className="py-1">
                {searchItems.map((item) => {
                  const productId = item.productId;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-3 py-3 hover:bg-muted transition-colors min-h-[44px]"
                    >
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                        onClick={() => {
                          clearSearch();
                          navigate({ to: '/inventory/$itemId', params: { itemId: item.id } });
                        }}
                      >
                        <p className="text-sm font-medium truncate">{item.productName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.serialNumber && (
                            <span className="font-mono">S/N: {item.serialNumber}</span>
                          )}
                          {item.serialNumber && (item.productSku || item.locationName) && ' · '}
                          {item.productSku && `SKU: ${item.productSku}`}
                          {item.productSku && item.locationName && ' · '}
                          {item.locationName && `@ ${item.locationName}`}
                        </p>
                      </button>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium tabular-nums">{item.quantityOnHand}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.status === 'available' ? 'available' : item.status}
                        </p>
                      </div>
                      {productId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 min-h-[44px] min-w-[44px]"
                          onClick={(event) => {
                            event.stopPropagation();
                            clearSearch();
                            navigate({
                              to: '/products/$productId',
                              params: { productId },
                              search: { tab: 'inventory' },
                            });
                          }}
                          title="View Product Inventory"
                          aria-label="View Product Inventory"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Quick Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="p-0">
              <Link to="/inventory/receiving" className="flex w-full items-center px-2 py-1.5">
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                Receive Inventory
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="p-0">
              <Link to="/inventory/counts" className="flex w-full items-center px-2 py-1.5">
                <Package className="h-4 w-4 mr-2" />
                Stock Count
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="p-0">
              <Link to="/inventory/locations" className="flex w-full items-center px-2 py-1.5">
                <MapPin className="h-4 w-4 mr-2" />
                Manage Locations
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="p-0">
              <Link to="/inventory/alerts" className="flex w-full items-center px-2 py-1.5">
                <Settings className="h-4 w-4 mr-2" />
                Alert Settings
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
