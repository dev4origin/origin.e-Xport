import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getGroupedRowModel, // Added
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight, ChevronsUpDown, Search, ChevronUp } from 'lucide-react'; // Updated icons
import { useState } from 'react';

export const DataGrid = ({
  data,
  columns,
  title,
  searchPlaceholder = "Search...",
  globalFilter: controlledGlobalFilter,
  onGlobalFilterChange,
  columnVisibility: controlledColumnVisibility,
  onColumnVisibilityChange,
  rowSelection,
  onRowSelectionChange,
  onRowContextMenu,
  ...props
}) => {
  const [sorting, setSorting] = useState([]);
  const [internalGlobalFilter, setInternalGlobalFilter] = useState('');
  const [internalColumnVisibility, setInternalColumnVisibility] = useState({});
  const [internalRowSelection, setInternalRowSelection] = useState({});
  const [grouping, setGrouping] = useState([]); // Added state

  const globalFilter = controlledGlobalFilter !== undefined ? controlledGlobalFilter : internalGlobalFilter;
  const setGlobalFilter = onGlobalFilterChange || setInternalGlobalFilter;

  const columnVisibility = controlledColumnVisibility !== undefined ? controlledColumnVisibility : internalColumnVisibility;
  const setColumnVisibility = onColumnVisibilityChange || setInternalColumnVisibility;

  const resolvedRowSelection = rowSelection !== undefined ? rowSelection : internalRowSelection;
  const setResolvedRowSelection = onRowSelectionChange || setInternalRowSelection;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      grouping, // Added
      rowSelection: resolvedRowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setResolvedRowSelection,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onGroupingChange: setGrouping, // Added
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(), // Added
  });

  return (
    <div className={`w-full space-y-4 ${props.className}`}>
      {/* Custom Toolbar via renderToolbar prop */}
      {props.renderToolbar ? (
        props.renderToolbar({ table, globalFilter, setGlobalFilter })
      ) : (
        /* Default Toolbar */
        !props.hideToolbar && (
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                placeholder={searchPlaceholder || "Search..."}
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full bg-background border border-input rounded-md py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )
      )}

      {/* Table */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="h-10 px-4 align-middle font-medium cursor-pointer select-none hover:text-foreground whitespace-nowrap border-r border-border/40 last:border-r-0"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center space-x-1">
                        <span>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </span>
                        {{
                          asc: <ChevronUp className="h-4 w-4" />,
                          desc: <ChevronDown className="h-4 w-4" />,
                        }[header.column.getIsSorted()] ?? null}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onContextMenu={(e) => onRowContextMenu && onRowContextMenu(e, row)}
                    className={`hover:bg-muted/50 transition-colors data-[state=selected]:bg-muted ${row.getIsSelected() ? 'bg-primary/5' : ''} ${typeof props.getRowClassName === 'function' ? props.getRowClassName(row) : ''
                      }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-4 align-middle whitespace-nowrap border-r border-border/40 last:border-r-0">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No results.
                  </td>
                </tr>
              )}
              {props.renderAppendixRow && props.renderAppendixRow({ table })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
