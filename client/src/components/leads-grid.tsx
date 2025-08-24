import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Lead, LeadStatus, LeadSource } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit2, Trash2, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LeadsFilters from "./leads-filters";
import { Skeleton } from "@/components/ui/skeleton";

interface LeadsGridProps {
  onEditLead: (lead: Lead) => void;
}

interface PaginatedLeads {
  data: Lead[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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

export default function LeadsGrid({ onEditLead }: LeadsGridProps) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [filters, setFilters] = useState<LeadFilters>({});
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  // Build query parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder,
    });

    if (filters.search) params.append("search", filters.search);
    if (filters.status?.length) {
      filters.status.forEach(s => params.append("status", s));
    }
    if (filters.source?.length) {
      filters.source.forEach(s => params.append("source", s));
    }
    if (filters.scoreMin !== undefined) params.append("scoreMin", filters.scoreMin.toString());
    if (filters.scoreMax !== undefined) params.append("scoreMax", filters.scoreMax.toString());
    if (filters.valueMin !== undefined) params.append("valueMin", filters.valueMin.toString());
    if (filters.valueMax !== undefined) params.append("valueMax", filters.valueMax.toString());
    if (filters.isQualified !== undefined) params.append("isQualified", filters.isQualified.toString());

    return params.toString();
  }, [page, limit, filters, sortBy, sortOrder]);

  const { data: leadsData, isLoading, error } = useQuery<PaginatedLeads>({
    queryKey: ["/api/leads", queryParams],
    refetchInterval: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead deleted",
        description: "The lead has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && leadsData) {
      setSelectedLeads(leadsData.data.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  const getStatusBadgeVariant = (status: LeadStatus) => {
    switch (status) {
      case "new": return "default";
      case "contacted": return "secondary";
      case "qualified": return "default";
      case "lost": return "destructive";
      case "won": return "default";
      default: return "default";
    }
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case "new": return "bg-yellow-100 text-yellow-800";
      case "contacted": return "bg-blue-100 text-blue-800";
      case "qualified": return "bg-green-100 text-green-800";
      case "lost": return "bg-red-100 text-red-800";
      case "won": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const renderScoreBar = (score: number | null) => {
    if (!score) return null;
    const percentage = Math.min(100, Math.max(0, score));
    const colorClass = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500";
    
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium w-8">{score}</span>
        <div className="w-16 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${colorClass}`} 
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  const resetPage = () => setPage(1);

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Error loading leads: {error.message}</p>
        <Button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/leads"] })}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <LeadsFilters
        filters={filters}
        onFiltersChange={(newFilters) => {
          setFilters(newFilters);
          resetPage();
        }}
        onReset={() => {
          setFilters({});
          resetPage();
        }}
      />

      {/* Grid Toolbar */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700" data-testid="text-total-leads">
            {isLoading ? "Loading..." : `${leadsData?.total || 0} leads`}
          </span>
          {leadsData && (
            <>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-500">
                Page {leadsData.page} of {leadsData.totalPages}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Show</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(parseInt(e.target.value));
              resetPage();
            }}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            data-testid="select-page-size"
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span className="text-sm text-gray-500">per page</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedLeads.length > 0 && leadsData ? selectedLeads.length === leadsData.data.length : false}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("firstName")}
                  className="font-medium"
                  data-testid="sort-name"
                >
                  Lead <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("company")}
                  className="font-medium"
                  data-testid="sort-company"
                >
                  Company <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("status")}
                  className="font-medium"
                  data-testid="sort-status"
                >
                  Status <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Source</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("score")}
                  className="font-medium"
                  data-testid="sort-score"
                >
                  Score <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("leadValue")}
                  className="font-medium"
                  data-testid="sort-value"
                >
                  Value <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
              ))
            ) : leadsData?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="text-gray-500">
                    <p className="text-lg font-medium">No leads found</p>
                    <p className="text-sm">Try adjusting your filters or create a new lead</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              leadsData?.data.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-gray-50" data-testid={`row-lead-${lead.id}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                      data-testid={`checkbox-lead-${lead.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-white text-xs">
                          {lead.firstName.charAt(0)}{lead.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900" data-testid={`text-lead-name-${lead.id}`}>
                          {lead.firstName} {lead.lastName}
                        </div>
                        <div className="text-sm text-gray-500" data-testid={`text-lead-email-${lead.id}`}>
                          {lead.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm text-gray-900" data-testid={`text-lead-company-${lead.id}`}>
                        {lead.company || "—"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {[lead.city, lead.state].filter(Boolean).join(", ") || "—"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span 
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}
                      data-testid={`status-${lead.id}`}
                    >
                      {lead.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {lead.source}
                  </TableCell>
                  <TableCell>
                    {renderScoreBar(lead.score)}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-gray-900" data-testid={`text-lead-value-${lead.id}`}>
                    {lead.leadValue ? `${parseFloat(lead.leadValue).toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditLead(lead)}
                        className="text-primary hover:text-primary-600"
                        data-testid={`button-edit-${lead.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(lead.id)}
                        className="text-red-600 hover:text-red-700"
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${lead.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {leadsData && leadsData.totalPages > 1 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-medium">
                {((leadsData.page - 1) * leadsData.limit) + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(leadsData.page * leadsData.limit, leadsData.total)}
              </span>{" "}
              of{" "}
              <span className="font-medium">{leadsData.total}</span>{" "}
              results
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, leadsData.totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    data-testid={`button-page-${pageNum}`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === leadsData.totalPages}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
