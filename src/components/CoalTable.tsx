import { isValidElement, type ReactNode } from "react";

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

export default function CoalTable<T>({
  data,
  columns,
  caption,
  emptyState,
  isLoading,
  className,
}: CoalTableProps<T>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-gray-200 bg-white",
        className,
      )}
    >
      <table className="min-w-full border-collapse text-left text-sm text-gray-700">
        {caption ? (
          <caption className="px-5 py-3 text-left text-gray-500">
            {caption}
          </caption>
        ) : null}
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                scope="col"
                className={cn(
                  "border-b border-gray-200 px-5 py-3 text-xs font-semibold uppercase tracking-wide",
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
            <tr>
              <td
                colSpan={columns.length}
                className="px-5 py-8 text-center text-gray-500"
              >
                Loading data…
              </td>
            </tr>
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
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-t border-gray-200 transition-colors hover:bg-gray-50"
              >
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
