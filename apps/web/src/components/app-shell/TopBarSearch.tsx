import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";

interface TopBarSearchProps {
  mobileSearchOpen: boolean;
  onMobileSearchOpenChange: (open: boolean) => void;
}

export function TopBarSearch({
  mobileSearchOpen,
  onMobileSearchOpenChange,
}: TopBarSearchProps) {
  return (
    <SearchAutocomplete
      className={
        mobileSearchOpen
          ? "min-w-0 flex-1 sm:mx-auto sm:w-full"
          : "max-sm:min-w-9 max-sm:shrink-0 sm:min-w-0 sm:flex-1 sm:mx-auto sm:max-w-xl"
      }
      mobileExpanded={mobileSearchOpen}
      onMobileExpandedChange={onMobileSearchOpenChange}
    />
  );
}
