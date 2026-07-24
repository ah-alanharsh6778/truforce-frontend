import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PaginationControls({
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    onPageChange,
    disabled = false
}) {
    if (totalPages === 0 || totalItems === 0) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Showing <span className="text-blue-600">{startItem}</span> to{" "}
                <span className="text-blue-600">{endItem}</span> of{" "}
                <span className="text-blue-600">{totalItems}</span> entries
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || disabled}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    aria-label="Previous page"
                >
                    <ChevronLeft size={16} strokeWidth={3} />
                </button>

                <div className="text-xs font-black text-slate-600 px-3 bg-white border border-slate-200 rounded-lg py-1.5 shadow-sm">
                    {currentPage} / {totalPages}
                </div>

                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || totalPages === 0 || disabled}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    aria-label="Next page"
                >
                    <ChevronRight size={16} strokeWidth={3} />
                </button>
            </div>
        </div>
    );
}
