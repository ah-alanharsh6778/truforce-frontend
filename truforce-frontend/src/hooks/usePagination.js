import { useState, useMemo } from "react";

export function usePagination(items, itemsPerPage = 10, filters = {}) {
    const [currentPage, setCurrentPage] = useState(1);

    // Keep track of previous filters to reset page on change during render
    const filtersJson = JSON.stringify(filters);
    const [prevFiltersJson, setPrevFiltersJson] = useState(filtersJson);

    if (filtersJson !== prevFiltersJson) {
        setPrevFiltersJson(filtersJson);
        setCurrentPage(1);
    }

    const filteredItems = useMemo(() => {
        return items;
    }, [items]);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredItems.slice(startIndex, endIndex);
    }, [filteredItems, currentPage, itemsPerPage]);

    const goToPage = (page) => {
        const pageNum = Math.max(1, Math.min(page, totalPages || 1));
        setCurrentPage(pageNum);
    };

    const nextPage = () => goToPage(currentPage + 1);
    const prevPage = () => goToPage(currentPage - 1);

    return {
        currentPage,
        totalPages,
        paginatedItems,
        goToPage,
        nextPage,
        prevPage,
        totalItems: filteredItems.length
    };
}
