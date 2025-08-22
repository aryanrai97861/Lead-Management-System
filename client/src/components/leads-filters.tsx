import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Search, Filter } from "lucide-react";
import { LeadStatus, LeadSource } from "@shared/schema";

interface LeadFilters {
  search?: string;
  status?: string[];
  source?: string[];
  scoreMin?: number;
  scoreMax?: number;
  valueMin?: number;
  valueMax?: number;
  isQualified?: boolean;
}

interface LeadsFiltersProps {
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
  onReset: () => void;
}

const statusOptions: LeadStatus[] = ["new", "contacted", "qualified", "lost", "won"];
const sourceOptions: LeadSource[] = ["website", "facebook_ads", "google_ads", "referral", "events", "other"];

export default function LeadsFilters({ filters, onFiltersChange, onReset }: LeadsFiltersProps) {
  const [localFilters, setLocalFilters] = useState<LeadFilters>(filters);

  const updateFilter = (key: keyof LeadFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const addStatusFilter = (status: string) => {
    const currentStatus = localFilters.status || [];
    if (!currentStatus.includes(status)) {
      updateFilter("status", [...currentStatus, status]);
    }
  };

  const removeStatusFilter = (status: string) => {
    const currentStatus = localFilters.status || [];
    updateFilter("status", currentStatus.filter(s => s !== status));
  };

  const addSourceFilter = (source: string) => {
    const currentSource = localFilters.source || [];
    if (!currentSource.includes(source)) {
      updateFilter("source", [...currentSource, source]);
    }
  };

  const removeSourceFilter = (source: string) => {
    const currentSource = localFilters.source || [];
    updateFilter("source", currentSource.filter(s => s !== source));
  };

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof LeadFilters];
    return value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0);
  });

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search leads by name, email, or company..."
            value={localFilters.search || ""}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <Button
          variant="outline"
          onClick={onReset}
          disabled={!hasActiveFilters}
          data-testid="button-reset-filters"
        >
          Clear Filters
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Status:</span>
          <Select onValueChange={addStatusFilter} data-testid="select-status-filter">
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Source:</span>
          <Select onValueChange={addSourceFilter} data-testid="select-source-filter">
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              {sourceOptions.map((source) => (
                <SelectItem key={source} value={source}>
                  {source.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Score Range */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Score:</span>
          <Input
            type="number"
            placeholder="Min"
            value={localFilters.scoreMin || ""}
            onChange={(e) => updateFilter("scoreMin", e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-20"
            min={0}
            max={100}
            data-testid="input-score-min"
          />
          <span className="text-sm text-gray-500">to</span>
          <Input
            type="number"
            placeholder="Max"
            value={localFilters.scoreMax || ""}
            onChange={(e) => updateFilter("scoreMax", e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-20"
            min={0}
            max={100}
            data-testid="input-score-max"
          />
        </div>

        {/* Value Range */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Value:</span>
          <Input
            type="number"
            placeholder="Min $"
            value={localFilters.valueMin || ""}
            onChange={(e) => updateFilter("valueMin", e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-24"
            min={0}
            step={0.01}
            data-testid="input-value-min"
          />
          <span className="text-sm text-gray-500">to</span>
          <Input
            type="number"
            placeholder="Max $"
            value={localFilters.valueMax || ""}
            onChange={(e) => updateFilter("valueMax", e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-24"
            min={0}
            step={0.01}
            data-testid="input-value-max"
          />
        </div>
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {localFilters.status?.map((status) => (
            <Badge
              key={status}
              variant="secondary"
              className="gap-1"
              data-testid={`badge-status-${status}`}
            >
              Status: {status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeStatusFilter(status)}
              />
            </Badge>
          ))}
          {localFilters.source?.map((source) => (
            <Badge
              key={source}
              variant="secondary"
              className="gap-1"
              data-testid={`badge-source-${source}`}
            >
              Source: {source.replace("_", " ")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeSourceFilter(source)}
              />
            </Badge>
          ))}
          {localFilters.scoreMin !== undefined && (
            <Badge variant="secondary" className="gap-1">
              Score ≥ {localFilters.scoreMin}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("scoreMin", undefined)}
              />
            </Badge>
          )}
          {localFilters.scoreMax !== undefined && (
            <Badge variant="secondary" className="gap-1">
              Score ≤ {localFilters.scoreMax}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("scoreMax", undefined)}
              />
            </Badge>
          )}
          {localFilters.valueMin !== undefined && (
            <Badge variant="secondary" className="gap-1">
              Value ≥ ${localFilters.valueMin}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("valueMin", undefined)}
              />
            </Badge>
          )}
          {localFilters.valueMax !== undefined && (
            <Badge variant="secondary" className="gap-1">
              Value ≤ ${localFilters.valueMax}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("valueMax", undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
