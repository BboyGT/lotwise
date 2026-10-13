"use client";

import * as React from "react";
import { Check, ChevronDown, Search, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SymbolSpec, groupedSymbolsByClass, AssetClass } from "@/lib/symbols";

interface SearchableSymbolPickerProps {
  assetClass: AssetClass;
  value: string;
  onChange: (id: string) => void;
}

/**
 * Searchable combobox for picking a trading symbol.
 * - Type to filter across ALL sub-categories at once.
 * - Grouped results by category when no search query.
 * - Filtered flat results when searching.
 * - "LIVE" badge shown for synthetic symbols with Deriv feed.
 */
export function SearchableSymbolPicker({
  assetClass,
  value,
  onChange,
}: SearchableSymbolPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const groups = React.useMemo(
    () => groupedSymbolsByClass(assetClass),
    [assetClass]
  );

  const selected = React.useMemo(
    () => groups.flatMap((g) => g.symbols).find((s) => s.id === value),
    [groups, value]
  );

  // When user types, filter all symbols across groups (case-insensitive,
  // matches label, id, derivSymbol).
  const filtered = React.useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase().trim();
    return groups
      .flatMap((g) => g.symbols)
      .filter((s) =>
        s.label.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.tvSymbol.toLowerCase().includes(q) ||
        (s.derivSymbol?.toLowerCase().includes(q) ?? false)
      );
  }, [groups, query]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls="symbol-listbox"
          aria-haspopup="listbox"
          className="flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-black/60 transition-colors"
        >
          <span className="flex items-center gap-2 truncate">
            {selected ? (
              <>
                <span className="text-white truncate">{selected.label}</span>
                {selected.derivSymbol && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-emerald-500/15 text-emerald-400 text-[9px] font-mono uppercase tracking-wider">
                    <Zap className="h-2 w-2" />
                    Live
                  </span>
                )}
              </>
            ) : (
              <span className="text-slate-500">Select symbol…</span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 opacity-50 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 bg-[#0a0f1a] border-white/10"
        align="start"
      >
        <Command
          className="bg-transparent"
          shouldFilter={false}
        >
          <div className="flex h-9 items-center gap-2 border-b border-white/10 px-3">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search symbols (e.g. boom, eur, vol, btc)…"
              className="flex h-10 w-full bg-transparent text-sm font-mono text-white outline-none placeholder:text-slate-600"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-[10px] font-mono uppercase text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>
          <CommandList className="max-h-80 rm-scroll">
            <CommandEmpty className="py-6 text-center text-xs font-mono text-slate-500">
              No symbols match "{query}"
            </CommandEmpty>

            {filtered ? (
              // Search mode — flat list, no group headers
              <CommandGroup
                heading={`Matches (${filtered.length})`}
                className="[&_[cmdk-group-heading]]:text-amber-400/70 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[10px]"
              >
                {filtered.map((s) => (
                  <SymbolOption
                    key={s.id}
                    symbol={s}
                    selected={s.id === value}
                    onSelect={() => {
                      onChange(s.id);
                      setOpen(false);
                      setQuery("");
                    }}
                  />
                ))}
              </CommandGroup>
            ) : (
              // Browse mode — grouped by category
              groups.map((group) => (
                <CommandGroup
                  key={group.category}
                  heading={group.category}
                  className="[&_[cmdk-group-heading]]:text-amber-400/70 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[10px]"
                >
                  {group.symbols.map((s) => (
                    <SymbolOption
                      key={s.id}
                      symbol={s}
                      selected={s.id === value}
                      onSelect={() => {
                        onChange(s.id);
                        setOpen(false);
                        setQuery("");
                      }}
                    />
                  ))}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SymbolOption({
  symbol,
  selected,
  onSelect,
}: {
  symbol: SymbolSpec;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={symbol.id}
      onSelect={onSelect}
      className="font-mono text-sm cursor-pointer data-[selected=true]:bg-amber-500/10 data-[selected=true]:text-amber-300"
    >
      <Check
        className={cn(
          "mr-1 h-3 w-3",
          selected ? "opacity-100 text-amber-400" : "opacity-0"
        )}
      />
      <span className="flex-1 truncate">{symbol.label}</span>
      {symbol.derivSymbol && (
        <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-400 text-[9px] font-mono uppercase tracking-wider">
          <Zap className="h-2 w-2" />
          Live
        </span>
      )}
      {selected && (
        <span className="ml-2 text-[9px] font-mono uppercase tracking-wider text-amber-400/60">
          Active
        </span>
      )}
    </CommandItem>
  );
}
