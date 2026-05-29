export interface Subgenre {
  name: string;
  slug: string;
  description: string;
  typicalMoods: string[];
  popularity: "high" | "medium" | "low";
}

export interface Genre {
  name: string;
  slug: string;
  description: string;
  subgenres: Subgenre[];
}

export interface Category {
  name: string;
  slug: string;
  genres: Genre[];
}

export const genresDictionary: Category[] = [
  {
    name: "Hip-Hop & Trap",
    slug: "hip-hop-trap",
    genres: [
      {
        name: "Trap & Underground",
        slug: "trap-underground",
        description: "Heavily distorted 808s, rapidly rolling hi-hats, and hyper-synthetic melodies.",
        subgenres: [
          {
            name: "Plugg",
            slug: "plugg",
            description: "Dreamy synthesizer chords, bouncy soft 808 glides, and signature dry sound effects (telephone rings, water droplets). Popularized by Summrs, Autumn!, and Kankan.",
            typicalMoods: ["dreamy", "relaxed", "melodic", "nostalgic"],
            popularity: "medium",
          },
          {
            name: "Rage",
            slug: "rage",
            description: "High-energy, hyper-kinetic leads inspired by 16-bit video games, heavy synthesizer chord stacks, and raw distorted bass. Popularized by Yeat and Ken Carson.",
            typicalMoods: ["aggressive", "energetic", "hype", "futuristic"],
            popularity: "high",
          },
          {
            name: "Drift Phonk",
            slug: "drift-phonk",
            description: "High-BPM trap characterized by saturated cowbell melodies, crunchy 808 slides, and classic 90s Memphis rap vocal samples. Deeply tied to car drift culture.",
            typicalMoods: ["aggressive", "dark", "raw", "hypnotic"],
            popularity: "high",
          },
          {
            name: "Wave Phonk",
            slug: "wave-phonk",
            description: "A beautiful, futuristic fusion of emotional cinematic wave synths, ambient vocal pads, and classic phonk cowbells.",
            typicalMoods: ["dreamy", "melancholy", "atmospheric", "epic"],
            popularity: "medium",
          },
        ],
      },
      {
        name: "Rap & Emo Rap",
        slug: "emo-rap",
        description: "A raw, emotional fusion of alternative rock, shoegaze, and trap beats. Heavy focus on guitar loops and introspective lyrics.",
        subgenres: [
          {
            name: "Guitar Trap",
            slug: "guitar-trap",
            description: "Melancholic acoustic or electric guitar loops paired with snappy rolling trap drums. Pioneer style of Lil Peep and Juice WRLD.",
            typicalMoods: ["sad", "introspective", "melancholic", "chill"],
            popularity: "high",
          },
          {
            name: "PluggNB",
            slug: "pluggnb",
            description: "A smooth, R&B-infused evolution of Plugg featuring rich jazz chords, emotional singing, and bouncy drum rhythms.",
            typicalMoods: ["romantic", "smooth", "soulful", "uplifting"],
            popularity: "high",
          },
        ],
      },
      {
        name: "Cloud Rap",
        slug: "cloud-rap",
        description: "Ethereal, atmospheric, and highly spaced-out rap beats featuring heavy vocal reverbs, slowed down vocal chops, and dreamlike aesthetics.",
        subgenres: [
          {
            name: "Vapor Rap",
            slug: "vapor-rap",
            description: "Retro-futuristic hip-hop beats sampling slowed-down 80s funk, corporate ads, and smooth soul. Deeply aesthetic.",
            typicalMoods: ["nostalgic", "trippy", "hazy", "relaxed"],
            popularity: "medium",
          },
        ],
      },
    ],
  },
  {
    name: "Electronic & Bass",
    slug: "electronic-bass",
    genres: [
      {
        name: "Dubstep & Bass Music",
        slug: "dubstep-bass",
        description: "Syncopated sub-heavy electronic music centered around aggressive mid-range synthesizers and half-time drum chops.",
        subgenres: [
          {
            name: "Riddim",
            slug: "riddim",
            description: "A highly repetitive, stripped-back dubstep subgenre relying on mechanical, metallic square-wave sound design and heavy sub-bass lines.",
            typicalMoods: ["heavy", "aggressive", "hype", "industrial"],
            popularity: "high",
          },
          {
            name: "Bassline",
            slug: "bassline",
            description: "Fast UK club-oriented house beats driven by massive, constantly modulated, screeching low-frequency synthesizer patches.",
            typicalMoods: ["energetic", "hype", "clubby", "bouncy"],
            popularity: "high",
          },
          {
            name: "UK Bass",
            slug: "uk-bass",
            description: "A hybrid club style blending deep sound system sub-bass, dubstep syncopation, and UK garage house grooves.",
            typicalMoods: ["dark", "heavy", "groovy", "underground"],
            popularity: "medium",
          },
        ],
      },
      {
        name: "Drum & Bass",
        slug: "drum-bass",
        description: "Fast-tempo electronic music characterized by rapid syncopated breakbeats (typically 170-175 BPM) and deep basslines.",
        subgenres: [
          {
            name: "Liquid DnB",
            slug: "liquid-dnb",
            description: "A soulful, melodic variation of Drum & Bass featuring rich ambient pads, soulful vocals, jazz chord layers, and smooth bass.",
            typicalMoods: ["dreamy", "uplifting", "smooth", "peaceful"],
            popularity: "high",
          },
          {
            name: "Neurofunk",
            slug: "neurofunk",
            description: "A dark, highly technical and aggressive form of Drum & Bass featuring complex, heavily distorted synthesized reeves and pounding drums.",
            typicalMoods: ["dark", "aggressive", "futuristic", "tense"],
            popularity: "medium",
          },
        ],
      },
      {
        name: "UK Garage",
        slug: "uk-garage",
        description: "Swing-heavy London club grooves characterized by syncopated house beats, organ stabs, and elastic basslines.",
        subgenres: [
          {
            name: "Future Garage",
            slug: "future-garage",
            description: "Deep, ambient, and highly cinematic garage beats characterized by rainy field recordings, ticking organic percussion, and pitched vocal chops.",
            typicalMoods: ["sad", "rainy", "cinematic", "nocturnal"],
            popularity: "high",
          },
          {
            name: "2-Step",
            slug: "2-step",
            description: "Classic bouncy garage rhythm featuring skipped beats, rich R&B vocal samples, and warm electric piano keys.",
            typicalMoods: ["groovy", "bouncy", "nostalgic", "danceable"],
            popularity: "high",
          },
        ],
      },
      {
        name: "Techno",
        slug: "techno",
        description: "Hypnotic, repetitive electronic music defined by driving four-on-the-floor rhythms and modular hardware soundscapes.",
        subgenres: [
          {
            name: "Industrial Techno",
            slug: "industrial-techno",
            description: "Raw, abrasive, and dark electronic music incorporating pounding industrial sound effects, metal clangors, and distorted kick drums.",
            typicalMoods: ["aggressive", "hypnotic", "dark", "raw"],
            popularity: "medium",
          },
          {
            name: "Melodic Techno",
            slug: "melodic-techno",
            description: "Four-on-the-floor rhythms paired with soaring, slowly unfolding epic chords and emotional synthesizer leads.",
            typicalMoods: ["epic", "emotional", "hypnotic", "cinematic"],
            popularity: "high",
          },
        ],
      },
    ],
  },
  {
    name: "Hyperpop & Experimental",
    slug: "hyperpop-experimental",
    genres: [
      {
        name: "Hyperpop",
        slug: "hyperpop",
        description: "A chaotic pop caricature combining sweet pop hooks, extreme audio glitters, pitch-shifted vocals, and massive digital clipping.",
        subgenres: [
          {
            name: "Glitchcore / Digicore",
            slug: "glitchcore-digicore",
            description: "Underground hyperpop featuring extreme digital stuttering, heavy auto-tune abuse, rapid audio cuts, and meme samples.",
            typicalMoods: ["chaotic", "energetic", "playful", "glitchy"],
            popularity: "high",
          },
          {
            name: "Dariacore",
            slug: "dariacore",
            description: "Super fast, sample-heavy mashup electronic music characterized by chaotic EDM drop transitions and high-speed pop clips.",
            typicalMoods: ["frantic", "nostalgic", "chaotic", "funny"],
            popularity: "medium",
          },
        ],
      },
      {
        name: "Wave Music",
        slug: "wave-music",
        description: "A gorgeous, spacey fusion of cinematic textures, lush trance-like super-saws, and rolling trap hi-hats and snares.",
        subgenres: [
          {
            name: "Hardwave",
            slug: "hardwave",
            description: "A club-friendly, energetic style of Wave loaded with massive stadium-sized synth leads, heavy bass drops, and rapid tempo glides.",
            typicalMoods: ["epic", "emotional", "triumphant", "intense"],
            popularity: "high",
          },
        ],
      },
    ],
  },
  {
    name: "Indie & Bedroom Pop",
    slug: "indie-bedroom-pop",
    genres: [
      {
        name: "Bedroom Pop",
        slug: "bedroom-pop",
        description: "Intimate, DIY recorded music featuring warm tape saturation, analog chorus-soaked guitars, lazy vocals, and cheap drum machines.",
        subgenres: [
          {
            name: "Indie Surf",
            slug: "indie-surf",
            description: "Upbeat indie pop featuring jangly, reverb-drenched surf rock electric guitars and nostalgic, sunny rhythms.",
            typicalMoods: ["sunny", "carefree", "nostalgic", "bouncy"],
            popularity: "medium",
          },
        ],
      },
      {
        name: "Dream Pop",
        slug: "dream-pop",
        description: "Atmospheric and ethereal songs centered around fuzzy shoegaze walls of sound, deep analog synthesizer textures, and breathy vocals.",
        subgenres: [
          {
            name: "Shoegaze",
            slug: "shoegaze",
            description: "Heavy layers of fuzzy, distorted electric guitars, drone-like feedback, and soft, submerged melodic vocals.",
            typicalMoods: ["noisy", "melancholy", "heavy", "ethereal"],
            popularity: "medium",
          },
        ],
      },
    ],
  },
  {
    name: "Lo-Fi & Chillout",
    slug: "lo-fi-chillout",
    genres: [
      {
        name: "Lo-Fi Hip Hop",
        slug: "lo-fi-hip-hop",
        description: "Dusty study beats characterized by crackling vinyl textures, warm tape saturation, smooth jazzy piano loops, and slow laid-back drums.",
        subgenres: [
          {
            name: "Chillhop",
            slug: "chillhop",
            description: "Slightly more upbeat and organic lo-fi beats, incorporating real-world acoustic guitars, saxophones, and nature ambient loops.",
            typicalMoods: ["relaxing", "cozy", "peaceful", "focused"],
            popularity: "high",
          },
        ],
      },
    ],
  },
];

export function getAllGenres() {
  return genresDictionary.flatMap((cat) => cat.genres);
}

export function getAllSubgenres() {
  return getAllGenres().flatMap((genre) => genre.subgenres);
}

export function getGenreBySlug(slug: string) {
  return getAllGenres().find((g) => g.slug === slug);
}

export function searchGenres(query: string) {
  const q = query.toLowerCase();
  return getAllGenres().filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.subgenres.some((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)),
  );
}
