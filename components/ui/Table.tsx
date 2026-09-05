import React from 'react';

interface TableColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function Table<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'No data available',
  isLoading = false,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden animate-pulse">
        <div className="h-12 bg-gray-100" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-white border-t border-[#E5E7EB]">
            <div className="h-4 bg-gray-100 m-4 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-12 text-center">
        <p className="text-[#667085] text-[14px]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA]">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="py-3 px-4 text-[12px] font-semibold text-[#667085] uppercase tracking-wider"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {data.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={`transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-[#F9FAFB]' : ''
                }`}
              >
                {columns.map((col, idx) => (
                  <td
                    key={idx}
                    className={`py-3 px-4 text-[13px] text-[#111827] ${col.className || ''}`}
                  >
                    {typeof col.accessor === 'function'
                      ? col.accessor(row)
                      : String(row[col.accessor])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
