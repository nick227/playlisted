import { PlaylistedMasthead } from "@/components/app-shell/PlaylistedMasthead";

interface TopBarBrandProps {
  mobileSearchOpen: boolean;
}

export function TopBarBrand({ mobileSearchOpen }: TopBarBrandProps) {
  return (
    <PlaylistedMasthead
      variant={mobileSearchOpen ? "mini" : "full"}
      className="shrink-0 text-base transition-opacity duration-300 motion-reduce:transition-none sm:hidden"
    />
  );
}
