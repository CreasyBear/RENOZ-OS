/**
 * SettingsSection Component
 *
 * Product flags, inventory settings, and warranty policy.
 */
import { Controller } from 'react-hook-form';
import { FolderTree, Shield } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useWarrantyPolicies } from '@/hooks';

import { FormSection } from './form-section';
import type { SettingsSectionProps } from '../types';

export function SettingsSection({ control, watch }: SettingsSectionProps) {
  const productType = watch('type');
  const showInventorySettings = productType === 'physical' || productType === 'bundle';

  // Fetch warranty policies for the dropdown
  // All policy types are shown - users can select any appropriate warranty for the product
  const { data: warrantyPolicies, isLoading: policiesLoading } = useWarrantyPolicies({
    isActive: true,
  });

  return (
    <FormSection title="Settings" description="Inventory and product settings" icon={FolderTree}>
      <div className="grid gap-6">
        {/* Flags */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Sellable</Label>
              <p className="text-muted-foreground text-sm">Available for sale to customers</p>
            </div>
            <Controller
              name="isSellable"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Purchasable</Label>
              <p className="text-muted-foreground text-sm">Available to purchase from suppliers</p>
            </div>
            <Controller
              name="isPurchasable"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        </div>

        {/* Inventory settings */}
        {showInventorySettings && (
          <>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Track Inventory</Label>
                  <p className="text-muted-foreground text-sm">Monitor stock levels</p>
                </div>
                <Controller
                  name="trackInventory"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Serialized</Label>
                  <p className="text-muted-foreground text-sm">
                    Track individual units by serial number
                  </p>
                </div>
                <Controller
                  name="isSerialized"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Controller
                  name="reorderPoint"
                  control={control}
                  render={({ field }) => (
                    <Input id="reorderPoint" type="number" min="0" placeholder="0" {...field} />
                  )}
                />
                <p className="text-muted-foreground text-xs">
                  Alert when stock falls below this level
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reorderQty">Reorder Quantity</Label>
                <Controller
                  name="reorderQty"
                  control={control}
                  render={({ field }) => (
                    <Input id="reorderQty" type="number" min="0" placeholder="0" {...field} />
                  )}
                />
                <p className="text-muted-foreground text-xs">Suggested quantity when reordering</p>
              </div>
            </div>
          </>
        )}

        {/* Warranty Policy */}
        <Separator />
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="text-muted-foreground h-4 w-4" />
            <Label>Warranty Policy</Label>
          </div>

          <Controller
            name="warrantyPolicyId"
            control={control}
            render={({ field }) => (
              <div className="space-y-2">
                {policiesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={field.value ?? 'none'}
                    onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Use category default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Use category default</SelectItem>
                      {warrantyPolicies?.map((policy) => (
                        <SelectItem key={policy.id} value={policy.id}>
                          <div className="flex items-center gap-2">
                            <span>{policy.name}</span>
                            <span className="text-muted-foreground text-xs">
                              ({Math.floor(policy.durationMonths / 12)}y
                              {policy.durationMonths % 12 > 0
                                ? ` ${policy.durationMonths % 12}m`
                                : ''}
                              )
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-muted-foreground text-xs">
                  Override the category&apos;s default warranty policy for this product
                </p>
              </div>
            )}
          />
        </div>
      </div>
    </FormSection>
  );
}
