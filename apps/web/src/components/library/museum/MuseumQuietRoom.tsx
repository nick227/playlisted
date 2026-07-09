import { MuseumBankSection, MuseumPanel } from "./museumUi";

interface MuseumQuietRoomProps {
  phrase: string;
}

export function MuseumQuietRoom({ phrase }: MuseumQuietRoomProps) {
  return (
    <MuseumBankSection label="Note" type="special">
      <MuseumPanel padding="roomy">
        <p className="text-center text-[clamp(1.2rem,2.5vw,1.85rem)] font-semibold leading-tight text-white/45">
          {phrase}
        </p>
      </MuseumPanel>
    </MuseumBankSection>
  );
}
