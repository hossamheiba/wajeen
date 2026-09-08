"use client";

/**
 * Search over a list already in memory.
 *
 * No debounce: the sections are all client-side, filtering 44 rows costs
 * nothing, and delaying the result would make typing feel worse rather than
 * better. Debouncing is for network round-trips, and there isn't one here.
 */

import { useId } from "react";
import { IconClose, IconSearch } from "../icons";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  label,
  clearLabel = "Clear search",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  label: string;
  clearLabel?: string;
}) {
  const id = useId();

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <IconSearch
        width={16}
        height={16}
        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-gray-muted"
      />
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            onChange("");
          }
        }}
        className="h-10 w-full rounded-ui border border-black/10 bg-white ps-9 pe-9 text-sm text-black placeholder:text-gray-muted focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={clearLabel}
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-muted transition-colors hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <IconClose width={14} height={14} />
        </button>
      ) : null}
    </div>
  );
}
