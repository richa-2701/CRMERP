//frontend/components/ui/combobox.tsx
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
    options: { value: string; label: string }[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    className?: string;
    disabled?: boolean;
}

export const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
    ({ options, value, onChange, placeholder, searchPlaceholder, className, disabled }, ref) => {
    const [open, setOpen] = React.useState(false)
    const [searchValue, setSearchValue] = React.useState("")

    // Filter options based on search
    const filteredOptions = React.useMemo(() => {
        if (!searchValue) return options;
        return options.filter(option =>
            option.label.toLowerCase().includes(searchValue.toLowerCase())
        );
    }, [options, searchValue]);

    // Reset search when popover closes
    React.useEffect(() => {
        if (!open) {
            setSearchValue("");
        }
    }, [open]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
            <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between font-normal", className)}
            disabled={disabled}
            >
            <span className="truncate">
              {value
                  ? options.find((option) => option.value === value)?.label
                  : placeholder || "Select option..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
        </PopoverTrigger>
        {/* --- FIX: High z-index to ensure it renders above the dialog content --- */}
        <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0 z-[100]"
            align="start"
        >
            <Command shouldFilter={false}>
            <CommandInput
                placeholder={searchPlaceholder || "Search..."}
                value={searchValue}
                onValueChange={setSearchValue}
            />
            <CommandList>
                <CommandEmpty>No option found.</CommandEmpty>
                <CommandGroup className="max-h-60 overflow-y-auto">
                    {filteredOptions.map((option, index) => (
                    <CommandItem
                        key={option.value}
                        value={option.value}
                        keywords={[option.label]}
                        onSelect={(selectedValue) => {
                            onChange(selectedValue)
                            setOpen(false)
                            setSearchValue("")
                        }}
                    >
                        <Check
                        className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value === option.value ? "opacity-100" : "opacity-0"
                        )}
                        />
                        <span className="flex-1 whitespace-normal text-sm">{option.label}</span>
                    </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
            </Command>
        </PopoverContent>
        </Popover>
    )
})
Combobox.displayName = "Combobox";