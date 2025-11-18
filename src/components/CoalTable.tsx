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
      "border-t border-white/10 transition-all duration-200 hover:bg-white/10 hover:-translate-y-[1px] hover:shadow-md",
      rowIndex % 2 === 0 ? "bg-white/5" : "bg-white/[0.03]"
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
              "px-5 py-4 align-top text-white/90",
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
  <tr className="border-t border-white/10">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-5 py-4">
          <div className="h-4 animate-pulse rounded bg-white/10" />
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
        "overflow-x-auto rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-sm",
        "scrollbar-thin scrollbar-thumb-[rgba(255,255,255,0.25)] scrollbar-track-[rgba(255,255,255,0.08)]",
        className,
      )}
    >
  <table className="min-w-full border-collapse text-left text-sm text-white/90">
        {caption ? (
          <caption className="px-5 py-3 text-left text-white/70">
            {caption}
          </caption>
        ) : null}
  <thead className="sticky top-0 z-10 bg-white/5 text-[var(--color-accent1)] shadow-sm backdrop-blur-sm">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                scope="col"
                className={cn(
                  "border-b border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-wide",
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
                  className="px-5 py-8 text-center text-white/70"
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
