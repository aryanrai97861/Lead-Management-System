import { Lead, LeadStatus, LeadSource } from "@shared/schema";

export type { Lead, LeadStatus, LeadSource };

export interface LeadFilters {
  search?: string;
  status?: LeadStatus[];
  source?: LeadSource[];
  scoreMin?: number;
  scoreMax?: number;
  valueMin?: number;
  valueMax?: number;
  isQualified?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  lastActivityAfter?: Date;
  lastActivityBefore?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
