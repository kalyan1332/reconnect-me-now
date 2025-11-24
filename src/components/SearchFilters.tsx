import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
}

export interface SearchFilters {
  query: string;
  category: string;
  status: string;
  location: string;
}

export const SearchFilters = ({ onSearch }: SearchFiltersProps) => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    category: "all",
    status: "all",
    location: "",
  });

  const categories = [
    "All Categories",
    "Bag & Luggage",
    "Electronics",
    "Keys & Accessories",
    "Wallet & Cards",
    "Jewelry",
    "Clothing",
    "Documents",
    "Pet",
    "Other",
  ];

  const handleSearch = () => {
    onSearch(filters);
  };

  const clearFilters = () => {
    const cleared = {
      query: "",
      category: "all",
      status: "all",
      location: "",
    };
    setFilters(cleared);
    onSearch(cleared);
  };

  const hasActiveFilters = filters.query || filters.category !== "all" || filters.status !== "all" || filters.location;

  return (
    <div className="space-y-4 p-6 bg-card rounded-lg border border-border shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Search & Filter</h3>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Query */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Item name..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              className="pl-10"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select
            value={filters.category}
            onValueChange={(value) => setFilters({ ...filters, category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.slice(1).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ ...filters, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="lost">Lost Only</SelectItem>
              <SelectItem value="found">Found Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Location Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Location</label>
          <Input
            placeholder="Campus location..."
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.query && (
            <Badge variant="secondary">
              Search: {filters.query}
            </Badge>
          )}
          {filters.category !== "all" && (
            <Badge variant="secondary">
              Category: {filters.category}
            </Badge>
          )}
          {filters.status !== "all" && (
            <Badge variant="secondary">
              Status: {filters.status}
            </Badge>
          )}
          {filters.location && (
            <Badge variant="secondary">
              Location: {filters.location}
            </Badge>
          )}
        </div>
      )}

      <Button onClick={handleSearch} className="w-full">
        <Search className="h-4 w-4 mr-2" />
        Apply Filters
      </Button>
    </div>
  );
};
