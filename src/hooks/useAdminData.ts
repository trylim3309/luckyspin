"use client";

import useSWR, { SWRConfiguration } from "swr";

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json());

export function useAdminData<T>(endpoint: string, config?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<T>(
    endpoint,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 0,
      ...config,
    }
  );

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  };
}