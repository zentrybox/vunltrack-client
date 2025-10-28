import { isValidElement, memo, type ReactNode, useCallback } from "react";

import { cn } from "@/lib/utils";

export interface CoalTableColumn<T> {
  key: keyof T | string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  render?: (row: T) => ReactNode;
}

interface CoalTableProps<T> {
  data: T[];
  columns: Array<CoalTableColumn<T>>;
  caption?: ReactNode;
  emptyState?: ReactNode;
  isLoading?: boolean;
  className?: string;
}

interface TableRowProps {
  row: unknown;
  columns: Array<CoalTableColumn<unknown>>;
  rowIndex: number;
}

const TableRow = memo(function TableRow({
  row,
  columns,
  rowIndex,
}: TableRowProps) {
  return (
    <tr className={cn(
      "border-t border-gray-200 transition-all duration-150 hover:bg-blue-50/40",
      rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
    )}>
      {columns.map((column) => {
        const rawValue = column.render
          ? column.render(row)
          : (row as Record<string, unknown>)[column.key as string];

        let resolved: ReactNode;

        if (rawValue === null || rawValue === undefined || rawValue === "") {
          resolved = "—";
        } else if (typeof rawValue === "object" && !isValidElement(rawValue)) {
          resolved = JSON.stringify(rawValue);
        } else {
          resolved = rawValue as ReactNode;
        }

        return (
          <td
            key={String(column.key)}
            className={cn(
              "px-5 py-4 align-top text-gray-900",
              column.align === "right" && "text-right",
              column.align === "center" && "text-center",
              column.className,
            )}
          >
            {resolved}
          </td>
        );
      })}
    </tr>
  );
});

const LoadingSkeleton = memo(function LoadingSkeleton({ columns }: { columns: number }) {
  return (
  <tr className="border-t border-gray-200">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-5 py-4">
          <div className="h-4 animate-pulse rounded bg-gray-200" />
        </td>
      ))}
    </tr>
  );
});

export default function CoalTable<T>({
  data,
  columns,
  caption,
  emptyState,
  isLoading,
  className,
}: CoalTableProps<T>) {
  const renderTableRow = useCallback((row: T, rowIndex: number) => (
    <TableRow
      key={rowIndex}
      row={row}
      columns={columns as Array<CoalTableColumn<unknown>>}
      rowIndex={rowIndex}
    />
  ), [columns]);

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-2xl border border-gray-900/10 bg-gradient-to-br from-gray-50 via-white to-blue-50 shadow-xl",
        "scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-gray-100",
        className,
      )}
    >
  <table className="min-w-full border-collapse text-left text-sm text-gray-700">
        {caption ? (
          <caption className="px-5 py-3 text-left text-gray-500">
            {caption}
          </caption>
        ) : null}
        <thead className="sticky top-0 z-10 bg-gradient-to-r from-blue-100 via-blue-50 to-white text-blue-700 shadow-sm">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                scope="col"
                className={cn(
                  "border-b border-gray-200 px-5 py-3 text-xs font-bold uppercase tracking-wide",
                  column.align === "right" && "text-right",
                  column.align === "center" && "text-center",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <>
              <LoadingSkeleton columns={columns.length} />
              <LoadingSkeleton columns={columns.length} />
              <LoadingSkeleton columns={columns.length} />
            </>
          ) : data.length === 0 ? (
            <tr>
              <td
                  colSpan={columns.length}
                  className="px-5 py-8 text-center text-gray-500"
                >
                {emptyState ?? "No records found."}
              </td>
            </tr>
          ) : (
            data.map(renderTableRow)
          )}
        </tbody>
      </table>
    </div>
  );
}
