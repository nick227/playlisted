import { PlaylistedMasthead } from "@/components/app-shell/PlaylistedMasthead";

interface TopBarBrandProps {
  mobileSearchOpen: boolean;
}

export function TopBarBrand({ mobileSearchOpen }: TopBarBrandProps) {
  return (
    <PlaylistedMasthead
      variant={mobileSearchOpen ? "mini" : "full"}
      showLogo={!mobileSearchOpen}
      className="shrink-0 text-lg transition-opacity duration-300 motion-reduce:transition-none sm:hidden"
    />
  );
}
