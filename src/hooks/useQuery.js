import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

/**
 * Custom hook to encapsulate the logic of parsing URL search parameters.
 * 
 * @returns {URLSearchParams} A memoized URLSearchParams object.
 * 
 * @example
 * const query = useQuery();
 * const category = query.get('cat');
 */
export function useQuery() {
    const { search } = useLocation();

    return useMemo(() => new URLSearchParams(search), [search]);
}
