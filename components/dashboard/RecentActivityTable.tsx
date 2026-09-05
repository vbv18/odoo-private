import React, { useState, useMemo } from 'react';
import {
  SearchIcon,
  FilterIcon,
  ColumnsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpDownIcon,
  CheckIcon,
  XIcon,
  FileTextIcon,
} from '@/components/icons';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  formatCurrency,
} from '@/lib/dashboard-data';

interface RecentActivityTableProps {
  transactions: Transaction[];
  onSelectTransaction: (tx: Transaction) => void;
  onOpenNewTransaction: () => void;
  isLoading?: boolean;
}

type SortField = 'date' | 'type' | 'referenceNo' | 'partner' | 'amount' | 'status';
type SortOrder = 'asc' | 'desc';

export function RecentActivityTable({
  transactions,
  onSelectTransaction,
  onOpenNewTransaction,
  isLoading,
}: RecentActivityTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    type: true,
    referenceNo: true,
    partner: true,
    amount: true,
    status: true,
  });

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter & Sort Logic
  const filteredAndSortedTransactions = useMemo(() => {
    let list = [...transactions];

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          t.referenceNo.toLowerCase().includes(q) ||
          t.partner.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q)
      );
    }

    // Type filter
    if (selectedType !== 'ALL') {
      list = list.filter((t) => t.type === selectedType);
    }

    // Status filter
    if (selectedStatus !== 'ALL') {
      list = list.filter((t) => t.status === selectedStatus);
    }

    // Sorting
    list.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'amount') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();

      if (sortOrder === 'asc') {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });

    return list;
  }, [transactions, searchTerm, selectedType, selectedStatus, sortField, sortOrder]);

  // Pagination slice
  const totalCount = filteredAndSortedTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTransactions.slice(start, start + itemsPerPage);
  }, [filteredAndSortedTransactions, currentPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((cur) => (cur === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case 'Draft':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
            Draft
          </span>
        );
      case 'Confirmed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#2563EB] border border-blue-200">
            Confirmed
          </span>
        );
      case 'Paid':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#16A34A] border border-emerald-200">
            Paid
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-[#DC2626] border border-rose-200">
            Overdue
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  // Type Badge Component
  const renderTypeBadge = (type: TransactionType) => {
    switch (type) {
      case 'SO':
        return (
          <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded-md bg-blue-50 text-[#2563EB] border border-blue-200 tracking-wide">
            SO
          </span>
        );
      case 'PO':
        return (
          <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded-md bg-slate-100 text-slate-800 border border-slate-200 tracking-wide">
            PO
          </span>
        );
      case 'Invoice':
        return (
          <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 tracking-wide">
            Invoice
          </span>
        );
      case 'Bill':
        return (
          <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded-md bg-amber-50 text-amber-800 border border-amber-200 tracking-wide">
            Bill
          </span>
        );
      case 'Payment':
        return (
          <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded-md bg-emerald-50 text-[#16A34A] border border-emerald-200 tracking-wide">
            Payment
          </span>
        );
      case 'Journal':
        return (
          <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded-md bg-purple-50 text-[#7C3AED] border border-purple-200 tracking-wide">
            Journal
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-5 space-y-4 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-6 w-44 bg-gray-200 rounded-sm" />
          <div className="flex gap-2">
            <div className="h-8 w-36 bg-gray-100 rounded-enterprise" />
            <div className="h-8 w-20 bg-gray-100 rounded-enterprise" />
          </div>
        </div>
        <div className="space-y-3 pt-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-11 bg-gray-50 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-enterprise shadow-2xs overflow-hidden">
      {/* Table Header Controls Toolbar */}
      <div className="p-4 sm:p-5 border-b border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[16px] font-semibold text-[#111827]">
            Recent Transactions
          </h2>
          <span className="px-2 py-0.5 text-[11px] font-medium bg-[#F7F8FA] text-[#667085] rounded-full border border-[#E5E7EB]">
            {filteredAndSortedTransactions.length} records
          </span>
        </div>

        {/* Right Controls: Search, Filter, Column Visibility */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search input with icon */}
          <div className="relative flex-1 sm:flex-none min-w-[180px] sm:min-w-[240px]">
            <SearchIcon
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3]"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search ref, partner, type..."
              className="w-full pl-8 pr-7 py-1.5 text-[12px] bg-[#F7F8FA] border border-[#E5E7EB] rounded-enterprise text-[#111827] placeholder-[#98A2B3] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-hidden transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#111827]"
              >
                <XIcon size={12} />
              </button>
            )}
          </div>

          {/* Filters Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setFilterDropdownOpen(!filterDropdownOpen);
                setColumnsDropdownOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-enterprise border transition-colors ${
                selectedType !== 'ALL' || selectedStatus !== 'ALL'
                  ? 'bg-blue-50 text-[#2563EB] border-blue-200'
                  : 'bg-white text-[#667085] border-[#E5E7EB] hover:bg-[#F7F8FA] hover:text-[#111827]'
              }`}
              aria-label="Filter transactions"
            >
              <FilterIcon size={13} />
              <span>Filters</span>
              {(selectedType !== 'ALL' || selectedStatus !== 'ALL') && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
              )}
            </button>

            {/* Filter Popover */}
            {filterDropdownOpen && (
              <div className="absolute right-0 mt-1 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-enterprise shadow-xl border border-[#E5E7EB] p-3 z-40 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
                  <span className="text-[12px] font-semibold text-[#111827]">
                    Filter Records
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType('ALL');
                      setSelectedStatus('ALL');
                    }}
                    className="text-[11px] text-[#2563EB] hover:underline font-medium"
                  >
                    Reset all
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#667085] mb-1">
                    Record Type
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => {
                      setSelectedType(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full text-[12px] p-1.5 bg-[#F7F8FA] border border-[#E5E7EB] rounded-enterprise text-[#111827] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-hidden"
                  >
                    <option value="ALL">All Types</option>
                    <option value="Invoice">Customer Invoice</option>
                    <option value="Bill">Vendor Bill</option>
                    <option value="SO">Sales Order</option>
                    <option value="PO">Purchase Order</option>
                    <option value="Payment">Payment</option>
                    <option value="Journal">Journal Entry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#667085] mb-1">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full text-[12px] p-1.5 bg-[#F7F8FA] border border-[#E5E7EB] rounded-enterprise text-[#111827] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-hidden"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Draft">Draft</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-[#E5E7EB] flex justify-end">
                  <button
                    type="button"
                    onClick={() => setFilterDropdownOpen(false)}
                    className="px-3 py-1 bg-[#2563EB] hover:bg-blue-700 text-white text-[11px] font-semibold rounded-enterprise transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Column Visibility Icon Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setColumnsDropdownOpen(!columnsDropdownOpen);
                setFilterDropdownOpen(false);
              }}
              className="p-2 text-[#667085] bg-white border border-[#E5E7EB] rounded-enterprise hover:bg-[#F7F8FA] hover:text-[#111827] transition-colors"
              aria-label="Toggle column visibility"
              title="Column visibility"
            >
              <ColumnsIcon size={14} />
            </button>

            {columnsDropdownOpen && (
              <div className="absolute right-0 mt-1 w-48 max-w-[calc(100vw-2rem)] bg-white rounded-enterprise shadow-xl border border-[#E5E7EB] p-2 z-40 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[11px] font-semibold text-[#98A2B3] px-2 py-1 uppercase tracking-wider">
                  Columns
                </div>
                {Object.entries(visibleColumns).map(([col, isVisible]) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => toggleColumn(col as keyof typeof visibleColumns)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-[12px] text-[#111827] hover:bg-[#F7F8FA] rounded-md transition-colors"
                  >
                    <span className="capitalize">{col}</span>
                    {isVisible && <CheckIcon size={13} className="text-[#2563EB]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="overflow-x-auto">
        <table
          className="w-full text-left border-collapse min-w-[700px]"
          aria-label="Recent Transactions Table"
        >
          {/* Sticky Header with sortable columns */}
          <thead>
            <tr className="bg-[#F7F8FA] border-b border-[#E5E7EB] text-[11px] uppercase tracking-wider font-semibold text-[#667085] select-none sticky top-0">
              {visibleColumns.date && (
                <th
                  scope="col"
                  onClick={() => handleSort('date')}
                  className="py-2.5 px-4 cursor-pointer hover:text-[#111827] transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDownIcon size={12} className="opacity-40 group-hover:opacity-100" />
                  </div>
                </th>
              )}

              {visibleColumns.type && (
                <th
                  scope="col"
                  onClick={() => handleSort('type')}
                  className="py-2.5 px-4 cursor-pointer hover:text-[#111827] transition-colors group w-28"
                >
                  <div className="flex items-center gap-1">
                    <span>Type</span>
                    <ArrowUpDownIcon size={12} className="opacity-40 group-hover:opacity-100" />
                  </div>
                </th>
              )}

              {visibleColumns.referenceNo && (
                <th
                  scope="col"
                  onClick={() => handleSort('referenceNo')}
                  className="py-2.5 px-4 cursor-pointer hover:text-[#111827] transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Reference No.</span>
                    <ArrowUpDownIcon size={12} className="opacity-40 group-hover:opacity-100" />
                  </div>
                </th>
              )}

              {visibleColumns.partner && (
                <th
                  scope="col"
                  onClick={() => handleSort('partner')}
                  className="py-2.5 px-4 cursor-pointer hover:text-[#111827] transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Partner</span>
                    <ArrowUpDownIcon size={12} className="opacity-40 group-hover:opacity-100" />
                  </div>
                </th>
              )}

              {visibleColumns.amount && (
                <th
                  scope="col"
                  onClick={() => handleSort('amount')}
                  className="py-2.5 px-4 cursor-pointer hover:text-[#111827] text-right transition-colors group"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount</span>
                    <ArrowUpDownIcon size={12} className="opacity-40 group-hover:opacity-100" />
                  </div>
                </th>
              )}

              {visibleColumns.status && (
                <th
                  scope="col"
                  onClick={() => handleSort('status')}
                  className="py-2.5 px-4 cursor-pointer hover:text-[#111827] text-right transition-colors group w-32"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Status</span>
                    <ArrowUpDownIcon size={12} className="opacity-40 group-hover:opacity-100" />
                  </div>
                </th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#E5E7EB] text-[13px]">
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => onSelectTransaction(tx)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectTransaction(tx);
                    }
                  }}
                  className="hover:bg-[#F9FAFB] cursor-pointer transition-colors focus:bg-[#F9FAFB] focus:outline-hidden"
                >
                  {visibleColumns.date && (
                    <td className="py-3 px-4 text-[#667085] whitespace-nowrap text-[12px]">
                      {tx.date}
                    </td>
                  )}

                  {visibleColumns.type && (
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderTypeBadge(tx.type)}
                    </td>
                  )}

                  {visibleColumns.referenceNo && (
                    <td className="py-3 px-4 font-semibold text-[#111827] whitespace-nowrap font-mono text-[12px]">
                      {tx.referenceNo}
                    </td>
                  )}

                  {visibleColumns.partner && (
                    <td className="py-3 px-4 text-[#111827] max-w-xs truncate">
                      <div className="font-medium truncate">{tx.partner}</div>
                      {tx.partnerGst && (
                        <div className="text-[11px] text-[#98A2B3] truncate">
                          GST: {tx.partnerGst}
                        </div>
                      )}
                    </td>
                  )}

                  {visibleColumns.amount && (
                    <td className="py-3 px-4 text-right font-semibold text-[#111827] tabular-nums whitespace-nowrap">
                      {formatCurrency(tx.amount)}
                    </td>
                  )}

                  {visibleColumns.status && (
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {renderStatusBadge(tx.status)}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="py-12 px-4 text-center"
                >
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[#98A2B3] mb-3">
                      <FileTextIcon size={20} />
                    </div>
                    <h3 className="text-[14px] font-semibold text-[#111827]">
                      No transactions found
                    </h3>
                    <p className="text-[12px] text-[#667085] mt-1 mb-4 text-center">
                      {searchTerm || selectedType !== 'ALL' || selectedStatus !== 'ALL'
                        ? 'Try adjusting your search criteria or active filters.'
                        : 'No transactions recorded yet in this reporting cycle.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (searchTerm || selectedType !== 'ALL' || selectedStatus !== 'ALL') {
                          setSearchTerm('');
                          setSelectedType('ALL');
                          setSelectedStatus('ALL');
                        } else {
                          onOpenNewTransaction();
                        }
                      }}
                      className="px-3.5 py-2 text-[12px] font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-enterprise transition-colors shadow-xs"
                    >
                      {searchTerm || selectedType !== 'ALL' || selectedStatus !== 'ALL'
                        ? 'Clear all filters'
                        : 'Record New Transaction'}
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 border-t border-[#E5E7EB] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#667085]">
        <div>
          Showing{' '}
          <span className="font-semibold text-[#111827]">
            {totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
          </span>
          –
          <span className="font-semibold text-[#111827]">
            {Math.min(currentPage * itemsPerPage, totalCount)}
          </span>{' '}
          of <span className="font-semibold text-[#111827]">{totalCount}</span> transactions
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-enterprise border border-[#E5E7EB] text-[#667085] hover:bg-[#F7F8FA] hover:text-[#111827] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeftIcon size={14} />
          </button>

          <span className="px-2 py-0.5 font-medium text-[#111827]">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-enterprise border border-[#E5E7EB] text-[#667085] hover:bg-[#F7F8FA] hover:text-[#111827] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRightIcon size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
