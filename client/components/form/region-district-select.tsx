'use client';

import { useLocations } from '@/hooks/queries';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface RegionDistrictValue {
  region: string;
  district: string;
}

/**
 * Paired region → district selects sourced from the canonical Ghana location list.
 * Picking a region filters the available districts; changing the region clears the
 * district so the two never drift out of sync.
 */
export function RegionDistrictSelect({
  value,
  onChange,
  required,
  disabled,
  regionLabel = 'Region',
  districtLabel = 'District',
  className = 'grid gap-4 sm:grid-cols-2',
}: {
  value: RegionDistrictValue;
  onChange: (value: RegionDistrictValue) => void;
  required?: boolean;
  disabled?: boolean;
  regionLabel?: string;
  districtLabel?: string;
  className?: string;
}) {
  const { data: regions = [], isLoading } = useLocations();
  const districts = regions.find((r) => r.name === value.region)?.districts ?? [];

  return (
    <div className={className}>
      <div className="space-y-1.5">
        <Label>
          {regionLabel}
          {required && <span className="text-destructive"> *</span>}
        </Label>
        <Select
          value={value.region || undefined}
          onValueChange={(region) => onChange({ region, district: '' })}
          disabled={disabled || isLoading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={isLoading ? 'Loading…' : 'Select a region'} />
          </SelectTrigger>
          <SelectContent>
            {regions.map((r) => (
              <SelectItem key={r.id} value={r.name}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>
          {districtLabel}
          {required && <span className="text-destructive"> *</span>}
        </Label>
        <Select
          value={value.district || undefined}
          onValueChange={(district) => onChange({ ...value, district })}
          disabled={disabled || isLoading || !value.region}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={value.region ? 'Select a district' : 'Pick a region first'} />
          </SelectTrigger>
          <SelectContent>
            {districts.map((d) => (
              <SelectItem key={d.id} value={d.name}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
