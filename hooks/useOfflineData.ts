import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseOfflineDataReturn<T> {
    data: T;
    isLoading: boolean;
    isRefetching: boolean;
    error: any;
    refetch: () => Promise<void>;
}

export function useOfflineData<T>(
    key: string,
    fetchFn: () => Promise<any>, // Modified to allow AxiosResponse wrapper if needed, but ideally returns data T or {data: T}
    initialData: T,
    transformData?: (response: any) => T // Optional transformer if api returns { data: ... }
): UseOfflineDataReturn<T> {
    const [data, setData] = useState<T>(initialData);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);
    const [error, setError] = useState<any>(null);

    const CACHE_KEY = `offline_cache_${key}`;

    // Use refs for functions that might be defined inline to prevent render loops
    const fetchFnRef = useRef(fetchFn);
    const transformDataRef = useRef(transformData);

    useEffect(() => {
        fetchFnRef.current = fetchFn;
        transformDataRef.current = transformData;
    }, [fetchFn, transformData]);

    const loadFromCache = useCallback(async () => {
        try {
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached) {
                setData(JSON.parse(cached));
                setIsLoading(false); // Stop loading if we have cached data
            }
        } catch (e) {
            console.log('Error reading cache:', e);
        }
    }, [CACHE_KEY]);

    const fetchData = useCallback(async (isBackground = false) => {
        if (!isBackground) setIsLoading(true);
        else setIsRefetching(true);

        try {
            const response = await fetchFnRef.current();
            const result = transformDataRef.current ? transformDataRef.current(response) : response;

            setData(result);
            setError(null);

            // Save to cache
            AsyncStorage.setItem(CACHE_KEY, JSON.stringify(result)).catch(e =>
                console.log('Error saving to cache:', e)
            );
        } catch (err) {
            console.log(`Error fetching ${key}:`, err);
            setError(err);
        } finally {
            setIsLoading(false);
            setIsRefetching(false);
        }
    }, [CACHE_KEY, key]);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            // 1. Load cache first immediately
            await loadFromCache();

            // 2. Then fetch fresh data
            if (mounted) {
                fetchData(true); // Pass true to indicate this is a "background" update (since cache might be showing)
            }
        };

        init();

        return () => {
            mounted = false;
        };
    }, [key, loadFromCache, fetchData]); // Run when key changes

    const refetch = async () => {
        await fetchData(true);
    };

    return { data, isLoading, isRefetching, error, refetch };
}
