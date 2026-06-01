const VENUE_PHRASES = [
  'you came through the wrong door',
  'the sound guy left already',
  "don't look at the lights",
  'we played here before the ceiling fell',
  'your friend was just here',
  'cash only after midnight',
  'the green room is not green',
  'everyone hears it different',
  'keep your wristband visible',
  'that speaker has a face',
  'you missed the first set',
  'nobody goes backstage twice',
  'she said the hallway moved',
  'the drums are under the floor',
  'drink tickets are a kind of prayer',
  "you can stand there but don't stay",
  'the bartender knows your name wrong',
  'follow the cable',
  'this room used to be louder',
  'they are waiting between songs',
  'the exit sign is lying',
  'beautiful crowd tonight',
  "don't tell them you saw me",
  'one more door and then it starts',
] as const

const BAR_PHRASES = [
  'cash only after midnight',
  'the bartender knows your name wrong',
  'drink tickets are a kind of prayer',
  "you can stand there but don't stay",
] as const

const BANKS: Record<string, readonly string[]> = {
  venue: VENUE_PHRASES,
  bar: BAR_PHRASES,
}

export function registerPhraseBank(id: string, lines: readonly string[]) {
  BANKS[id] = lines
}

export function pickPhrase(bankId: string, seed: number, salt: number): string {
  const bank = BANKS[bankId] ?? VENUE_PHRASES
  const i = Math.floor(hash01(seed, salt) * bank.length)
  return bank[i]
}

export function phraseReveal(time: number, mids: number, offset = 0): number {
  return 0.55 + Math.sin((time + offset) / 900) * 0.25 + mids * 0.2
}

function hash01(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

export { VENUE_PHRASES }
