import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface Column {
  header: string;
  key: string;
  width?: string;
  render?: (value: any, row?: any) => React.ReactNode;
  centerHeader?: boolean;
  centerData?: boolean;
}

interface TableProps {
  columns: Column[];
  data: any[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export default function Table({ columns, data, isLoading = false, emptyMessage = "No data found" }: TableProps) {
  return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
          <tr>
            {columns.map((column) => (
                <th
                    key={column.key}
                    scope="col"
                    className={`table-header ${column.width ? column.width : ''} ${column.centerHeader ? 'text-center' : ''}`}
                >
                  {column.header}
                </th>
            ))}
          </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
          {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4 text-center">
                  <LoadingSpinner />
                </td>
              </tr>
          ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
          ) : (
              data.map((row, rowIndex) => (
                  <tr key={rowIndex} className="table-row">
                    {columns.map((column) => (
                        <td
                            key={column.key}
                            className={`table-cell ${column.centerData ? 'text-center' : ''}`}
                        >
                          {column.render ? column.render(row[column.key], row) : row[column.key]}
                        </td>
                    ))}
                  </tr>
              ))
          )}
          </tbody>
        </table>
      </div>
  );
}