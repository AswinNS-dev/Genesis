"use client";

import { useState } from "react";
import { Search, Filter, RotateCcw, Calendar, MapPin, Tag, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface NetworkFilters {
  searchQuery?: string;
  crimeType?: string;
  district?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface NetworkFilterBarProps {
  onApplyFilters: (filters: NetworkFilters) => void;
  onResetFilters: () => void;
  loading?: boolean;
}

const CRIME_TYPES = [
  "ALL",
  "Theft",
  "Narcotics",
  "Financial Fraud",
  "Cyber Crime",
  "Violent Crime",
  "Human Trafficking",
  "Organized Syndicate",
];

const DISTRICTS = [
  "ALL",
  "Bengaluru",
  "Chennai",
  "Madurai",
  "Coimbatore",
  "Hyderabad",
  "Mumbai",
  "Delhi",
];

const ENTITY_TYPES = [
  "ALL",
  "PERSON",
  "PHONE",
  "VEHICLE",
  "LOCATION",
  "ORGANIZATION",
  "FINANCIAL",
];

export function NetworkFilterBar({ onApplyFilters, onResetFilters, loading }: NetworkFilterBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [crimeType, setCrimeType] = useState("ALL");
  const [district, setDistrict] = useState("ALL");
  const [entityType, setEntityType] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onApplyFilters({
      searchQuery: searchQuery.trim() || undefined,
      crimeType: crimeType !== "ALL" ? crimeType : undefined,
      district: district !== "ALL" ? district : undefined,
      entityType: entityType !== "ALL" ? entityType : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
  };

  const handleReset = () => {
    setSearchQuery("");
    setCrimeType("ALL");
    setDistrict("ALL");
    setEntityType("ALL");
    setDateFrom("");
    setDateTo("");
    onResetFilters();
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    crimeType !== "ALL" ||
    district !== "ALL" ||
    entityType !== "ALL" ||
    dateFrom !== "" ||
    dateTo !== "";

  return (
    <div className="rounded-xl border border-border bg-surface p-3.5 space-y-3 shadow-card">
      <form onSubmit={handleApply} className="flex flex-wrap items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search suspect name, phone, vehicle, or case ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-surface-raised pl-8 pr-3 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Crime Type Filter */}
        <div className="flex items-center gap-1">
          <ShieldAlert className="h-3.5 w-3.5 text-muted shrink-0" />
          <select
            value={crimeType}
            onChange={(e) => setCrimeType(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface-raised px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="ALL">All Crime Types</option>
            {CRIME_TYPES.filter((t) => t !== "ALL").map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* District Filter */}
        <div className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-muted shrink-0" />
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface-raised px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="ALL">All Districts</option>
            {DISTRICTS.filter((d) => d !== "ALL").map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Entity Type Filter */}
        <div className="flex items-center gap-1">
          <Tag className="h-3.5 w-3.5 text-muted shrink-0" />
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface-raised px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="ALL">All Entities</option>
            {ENTITY_TYPES.filter((e) => e !== "ALL").map((e) => (
              <option key={e} value={e}>
                {e.toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Toggle Date Range button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors ${
            dateFrom || dateTo
              ? "border-accent bg-accent/10 text-accent font-semibold"
              : "border-border bg-surface-raised text-muted hover:text-foreground"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Date Range</span>
        </button>

        {/* Apply & Reset Buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          <Button type="submit" size="sm" disabled={loading} className="h-9 text-xs">
            <Filter className="h-3.5 w-3.5 mr-1" />
            Apply Filters
          </Button>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={loading}
              className="h-9 text-xs text-muted hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </form>

      {/* Date Range Drawer */}
      {isExpanded && (
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-2.5 text-xs text-muted animate-fade-in">
          <span className="font-semibold text-foreground">Incident Date Range:</span>
          <div className="flex items-center gap-2">
            <span>From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-border bg-surface-raised px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div className="flex items-center gap-2">
            <span>To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-border bg-surface-raised px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2 text-[11px]">
          <span className="text-muted font-bold uppercase text-[10px]">Active Filters:</span>
          {searchQuery && (
            <Badge variant="info" className="text-[10px]">
              Query: &quot;{searchQuery}&quot;
            </Badge>
          )}
          {crimeType !== "ALL" && (
            <Badge variant="info" className="text-[10px]">
              Crime: {crimeType}
            </Badge>
          )}
          {district !== "ALL" && (
            <Badge variant="info" className="text-[10px]">
              District: {district}
            </Badge>
          )}
          {entityType !== "ALL" && (
            <Badge variant="info" className="text-[10px]">
              Type: {entityType}
            </Badge>
          )}
          {(dateFrom || dateTo) && (
            <Badge variant="info" className="text-[10px]">
              Dates: {dateFrom || "Start"} to {dateTo || "End"}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
