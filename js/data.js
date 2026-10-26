// Static game data: names, genres, traits, studios, title fragments, industry events.
(function (HW) {
  function words(s) { return s.trim().split(/\s+/); }

  HW.NAMES = {
    male: words(`James John Robert Michael William David Richard Joseph Thomas Charles Christopher Daniel Matthew
      Anthony Mark Donald Steven Paul Andrew Joshua Kenneth Kevin Brian George Timothy Ronald Edward Jason Jeffrey
      Ryan Jacob Gary Nicholas Eric Jonathan Stephen Larry Justin Scott Brandon Benjamin Samuel Gregory Alexander
      Frank Patrick Raymond Jack Dennis Jerry Tyler Aaron Jose Adam Nathan Henry Douglas Zachary Peter Kyle Ethan
      Walter Noah Jeremy Christian Keith Roger Terry Gerald Harold Sean Austin Carl Arthur Lawrence Dylan Jesse
      Jordan Bryan Billy Joe Bruce Gabriel Logan Albert Willie Alan Juan Wayne Elijah Randy Roy Vincent Ralph
      Eugene Russell Bobby Mason Philip Louis Marcus Theo Rafael Mateo Hugo Luca Oscar Felix Julian Miles Dante
      Isaac Leon Victor Omar Rhys Declan Callum Idris Kenji Hiro Dev Arjun Sanjay Andre Malik Darius Tobias Silas
      Clint Montgomery Cary Errol Gene Sterling Rock Spencer Humphrey Orson Marlon Warren Dustin Harrison Keanu`),
    female: words(`Mary Patricia Jennifer Linda Elizabeth Barbara Susan Jessica Sarah Karen Lisa Nancy Betty Margaret
      Sandra Ashley Kimberly Emily Donna Michelle Carol Amanda Dorothy Melissa Deborah Stephanie Rebecca Sharon
      Laura Cynthia Kathleen Amy Angela Shirley Anna Brenda Pamela Emma Nicole Helen Samantha Katherine Christine
      Debra Rachel Carolyn Janet Catherine Maria Heather Diane Ruth Julie Olivia Joyce Virginia Victoria Kelly
      Lauren Christina Joan Evelyn Judith Megan Andrea Cheryl Hannah Jacqueline Martha Gloria Teresa Ann Sara
      Madison Frances Kathryn Janice Jean Abigail Alice Julia Judy Sophia Grace Denise Amber Doris Marilyn Danielle
      Beverly Isabella Theresa Diana Natalie Brittany Charlotte Marie Kayla Alexis Lori Greta Ingrid Audrey Vivien
      Bette Lauren Rita Ava Lana Sophia Meryl Jodie Halle Zoe Mila Chloe Isla Freya Priya Aiko Yuna Ines Lucia
      Elena Camila Valentina Amara Zara Nadia Leila Simone Juliette Margot Saoirse Florence Cate Viola Octavia`),
    last: words(`Smith Johnson Williams Brown Jones Garcia Miller Davis Rodriguez Martinez Hernandez Lopez Gonzalez
      Wilson Anderson Thomas Taylor Moore Jackson Martin Lee Perez Thompson White Harris Sanchez Clark Ramirez Lewis
      Robinson Walker Young Allen King Wright Scott Torres Nguyen Hill Flores Green Adams Nelson Baker Hall Rivera
      Campbell Mitchell Carter Roberts Gomez Phillips Evans Turner Diaz Parker Cruz Edwards Collins Reyes Stewart
      Morris Morales Murphy Cook Rogers Gutierrez Ortiz Morgan Cooper Peterson Bailey Reed Kelly Howard Ramos Kim
      Cox Ward Richardson Watson Brooks Chavez Wood James Bennett Gray Mendoza Ruiz Hughes Price Alvarez Castillo
      Sanders Patel Myers Long Ross Foster Jimenez Powell Jenkins Perry Russell Sullivan Bell Coleman Butler
      Henderson Barnes Gonzales Fisher Vasquez Simmons Romero Jordan Patterson Alexander Hamilton Graham Reynolds
      Griffin Wallace Moreno West Cole Hayes Bryant Herrera Gibson Ellis Tran Medina Aguilar Stevens Murray Ford
      Castro Marshall Owens Harrison Fernandez McDonald Woods Washington Kennedy Wells Vargas Henry Chen Freeman
      Webb Tucker Guzman Burns Crawford Olson Simpson Porter Hunter Gordon Mendez Silva Shaw Snyder Mason Dixon
      Munoz Hunt Hicks Holmes Palmer Wagner Black Robertson Boyd Rose Stone Salazar Fox Warren Mills Meyer Rice
      Schmidt Garza Daniels Ferguson Nichols Stephens Soto Weaver Ryan Gardner Payne Grant Dunn Kelley Spencer
      Hawkins Arnold Pierce Vance Hansen Peters Santos Hart Bradley Knight Elliott Cunningham Duncan Armstrong
      Hudson Carroll Lane Riley Andrews Ray Berry Perkins Hoffman Johnston Matthews Pena Richards Willis Carpenter
      Lawrence Sandoval Blackwood Ashford Whitmore Kingsley Lancaster Sinclair Montague Fairbanks Langley Prescott
      Hawthorne Marlowe Vaughn Beaumont Delacroix Moreau Rossi Bianchi Conti Russo Novak Kowalski Petrov Ivanova
      Larsen Lindqvist Okafor Mensah Adeyemi Nakamura Tanaka Sato Kapoor Mehta Rao Haddad Nasser Costa Duarte`)
  };

  // apt: which actor genre skills a film draws on; core: which core stats matter most for the genre.
  // budget: multiplier on budget; appeal: audience multiplier; awards: academy bias;
  // spectacle: how much budget/VFX matter; critic: critics' bias.
  HW.GENRES = {
    'Drama':     { budget: 0.55, appeal: 0.75, awards: 9,   spectacle: 0.05, critic: 4,  apt: { drama: 1 }, core: { intensity: 1 } },
    'Comedy':    { budget: 0.65, appeal: 1.05, awards: -7,  spectacle: 0.1,  critic: -2, apt: { comedy: 1 }, core: { chemistry: 1 } },
    'Action':    { budget: 1.6,  appeal: 1.25, awards: -9,  spectacle: 1.0,  critic: -5, apt: { action: 1 }, core: { physicality: 1 } },
    'Sci-Fi':    { budget: 1.7,  appeal: 1.15, awards: -3,  spectacle: 0.95, critic: 0,  apt: { action: 0.5, drama: 0.3, thriller: 0.2 }, core: { physicality: 0.5, intensity: 0.5 } },
    'Horror':    { budget: 0.35, appeal: 1.0,  awards: -11, spectacle: 0.2,  critic: -4, apt: { thriller: 1 }, core: { intensity: 0.6, physicality: 0.4 } },
    'Romance':   { budget: 0.55, appeal: 0.85, awards: -2,  spectacle: 0.05, critic: -1, apt: { romance: 1 }, core: { chemistry: 0.6, presence: 0.4 } },
    'Thriller':  { budget: 0.8,  appeal: 0.95, awards: 0,   spectacle: 0.35, critic: 1,  apt: { thriller: 1 }, core: { intensity: 1 } },
    'Fantasy':   { budget: 1.8,  appeal: 1.15, awards: -4,  spectacle: 0.9,  critic: -1, apt: { action: 0.5, drama: 0.3, romance: 0.2 }, core: { physicality: 0.5, presence: 0.5 } },
    'Animation': { budget: 1.4,  appeal: 1.25, awards: -6,  spectacle: 0.6,  critic: 3,  apt: { comedy: 0.7, drama: 0.3 }, core: { chemistry: 1 } },
    'War':       { budget: 1.1,  appeal: 0.8,  awards: 7,   spectacle: 0.6,  critic: 3,  apt: { drama: 0.6, action: 0.4 }, core: { intensity: 0.6, physicality: 0.4 } },
    'Western':   { budget: 0.85, appeal: 0.7,  awards: 3,   spectacle: 0.35, critic: 2,  apt: { action: 0.6, drama: 0.4 }, core: { presence: 0.6, physicality: 0.4 } },
    'Musical':   { budget: 0.95, appeal: 0.85, awards: 4,   spectacle: 0.3,  critic: 1,  apt: { romance: 0.5, comedy: 0.5 }, core: { physicality: 0.5, chemistry: 0.5 } },
    'Biopic':    { budget: 0.7,  appeal: 0.7,  awards: 11,  spectacle: 0.1,  critic: 3,  apt: { drama: 1 }, core: { intensity: 0.7, craft: 0.3 } },
    'Crime':     { budget: 0.8,  appeal: 0.95, awards: 4,   spectacle: 0.3,  critic: 3,  apt: { thriller: 0.6, drama: 0.4 }, core: { intensity: 0.7, presence: 0.3 } },
    'Family':    { budget: 0.9,  appeal: 1.1,  awards: -8,  spectacle: 0.4,  critic: -3, apt: { comedy: 0.8, drama: 0.2 }, core: { chemistry: 1 } },
    'Superhero': { budget: 2.0,  appeal: 1.35, awards: -12, spectacle: 1.0,  critic: -3, apt: { action: 0.8, comedy: 0.2 }, core: { physicality: 0.6, presence: 0.4 } }
  };
  HW.GENRE_KEYS = Object.keys(HW.GENRES);

  HW.ROLES = {
    actor:           { label: 'Actor', plural: 'Actors', target: 1000,
                       stats: ['presence', 'craft', 'intensity', 'physicality', 'chemistry', 'range'] },
    director:        { label: 'Director', plural: 'Directors', target: 180,
                       stats: ['vision', 'craft', 'actorHandling', 'commercial', 'efficiency'] },
    writer:          { label: 'Writer', plural: 'Writers', target: 180,
                       stats: ['originality', 'dialogue', 'structure', 'commercial'] },
    cinematographer: { label: 'Cinematographer', plural: 'Cinematographers', target: 110,
                       stats: ['visuals', 'technique', 'innovation'] },
    composer:        { label: 'Composer', plural: 'Composers', target: 100,
                       stats: ['melody', 'atmosphere', 'versatility'] }
  };
  HW.ROLE_KEYS = Object.keys(HW.ROLES);

  // Actor stats are on a 1-10 scale. Core stats follow genes + age; genre skills grow with each film's results.
  HW.ACTOR_GENRES = ['comedy', 'action', 'romance', 'drama', 'thriller'];
  HW.STAT_DESC = {
    presence: 'How much the camera loves them, and star power.',
    craft: 'Technique, training, and consistency take after take.',
    intensity: 'Emotional depth and willingness to go all in.',
    physicality: 'Stunts, action, dance, and body control.',
    chemistry: 'Comedic timing, improv, and how well they elevate scene partners.',
    range: 'Versatility: how well they play against type.'
  };

  HW.STAT_LABELS = {
    presence: 'Presence', craft: 'Craft', intensity: 'Intensity', physicality: 'Physicality', chemistry: 'Chemistry',
    range: 'Range', comedy: 'Comedy', action: 'Action', romance: 'Romance', drama: 'Drama', thriller: 'Thriller', vision: 'Vision', craft: 'Craft', actorHandling: 'Actor Handling',
    commercial: 'Commercial Instinct', efficiency: 'Budget Control', originality: 'Originality', dialogue: 'Dialogue',
    structure: 'Structure', visuals: 'Visual Eye', technique: 'Technique', innovation: 'Innovation',
    melody: 'Melody', atmosphere: 'Atmosphere', versatility: 'Versatility'
  };

  // How each stat ages: peak offset relative to the person's peak age, and decline rate per year past plateau.
  HW.STAT_AGING = {
    presence:    { peak: 30, plateau: 14, decline: 0.009, young: 0.85 },
    physicality: { peak: 28, plateau: 8, decline: 0.022, young: 0.88 },
    chemistry:   { peak: 34, plateau: 25, decline: 0.005, young: 0.8 }
    // everything else uses the person's own peakAge (craft-type stats)
  };

  HW.TRAITS = {
    // actors
    method:       { name: 'Method Actor', roles: ['actor'], desc: 'Disappears into roles. Bigger, riskier performances.' },
    stuntman:     { name: 'Does Own Stunts', roles: ['actor'], desc: 'Exceptional physicality; action audiences love it.' },
    improv:       { name: 'Improv Wizard', roles: ['actor'], desc: 'Riffs that lift every scene partner.' },
    magnet:       { name: 'Box Office Magnet', roles: ['actor'], desc: 'Audiences show up just to see them.' },
    darling:      { name: "Critics' Darling", roles: ['actor', 'director', 'writer'], desc: 'Critics and voters adore their work.' },
    diva:         { name: 'Diva', roles: ['actor', 'director'], desc: 'Demands a premium and causes friction on set.' },
    workhorse:    { name: 'Workhorse', roles: ['actor', 'director', 'writer', 'cinematographer', 'composer'], desc: 'Takes on more projects per year.' },
    scandal:      { name: 'Scandal-Prone', roles: ['actor', 'director'], desc: 'Never far from a tabloid headline.' },
    bloomer:      { name: 'Late Bloomer', roles: ['actor', 'director', 'writer'], desc: 'Peaks much later than most.' },
    chameleon:    { name: 'Chameleon', roles: ['actor'], desc: 'Exceptional versatility across genres.' },
    indie:        { name: 'Indie Spirit', roles: ['actor', 'director'], desc: 'Takes pay cuts for interesting projects.' },
    campaigner:   { name: 'Awards Campaigner', roles: ['actor', 'director'], desc: 'Works the awards circuit relentlessly.' },
    reclusive:    { name: 'Reclusive', roles: ['actor', 'director', 'writer'], desc: 'Works rarely, picks projects carefully.' },
    heartthrob:   { name: 'Heartthrob', roles: ['actor'], desc: 'Fame rises fast in youth, fades as they age.' },
    // crew
    auteur:       { name: 'Auteur', roles: ['director'], desc: 'Uncompromising vision. Critics love, audiences vary.' },
    hitmaker:     { name: 'Hitmaker', roles: ['director', 'writer'], desc: 'Knows exactly what crowds want.' },
    perfectionist:{ name: 'Perfectionist', roles: ['director', 'cinematographer'], desc: 'Better films, but blows budgets.' },
    actorsdir:    { name: "Actor's Director", roles: ['director'], desc: 'Coaxes career-best performances out of casts.' },
    franchise:    { name: 'Franchise Builder', roles: ['director', 'writer'], desc: 'Their hits beget sequels.' },
    wordsmith:    { name: 'Wordsmith', roles: ['writer'], desc: 'Dialogue that actors kill to say.' },
    pioneer:      { name: 'Tech Pioneer', roles: ['cinematographer', 'composer'], desc: 'Pushes the medium forward.' },
    hummable:     { name: 'Hummable', roles: ['composer'], desc: 'Writes themes the whole world whistles.' }
  };

  HW.STUDIO_NAMES = words(`Silver_Crown_Pictures Meridian_Studios Atlas_Film_Corporation Starlight_Pictures
    Golden_Gate_Films Pacific_Horizon_Pictures Monarch_Entertainment Redwood_Pictures Lionheart_Films
    Blue_Harbor_Studios Northstar_Pictures Empire_Coast_Studios Crescent_Moon_Films Ironclad_Pictures
    Velvet_Curtain_Films Grand_Marquee_Studios Obsidian_Films Halcyon_Pictures Lantern_Light_Films Cobalt_Pictures
    Wildfire_Studios Paper_Moon_Pictures Copperline_Films Emerald_City_Pictures Archway_Studios Bright_Arrow_Films
    Nightjar_Pictures Saltwater_Films Tall_Pines_Pictures Phoenix_Rising_Studios Odyssey_Films Vantage_Point_Pictures`)
    .map(function (s) { return s.replace(/_/g, ' '); });
  HW.STUDIO_PREFIX = words(`Amber Apex Aurora Beacon Boulevard Canyon Cascade Citadel Comet Coral Daybreak Driftwood
    Echo Ember Falcon Fable Firefly Foxglove Granite Harbor Highland Hollow Indigo Juniper Keystone Lighthouse Lotus
    Magnolia Mirage Mosaic Neon Nova Oasis Onyx Orchard Paragon Pinnacle Prism Quarry Radiant Raven Riverbend Sable
    Sapphire Sequoia Solstice Sparrow Summit Tidal Topaz Twilight Uptown Valiant Willow Zenith`);
  HW.STUDIO_SUFFIX = ['Pictures', 'Films', 'Studios', 'Entertainment', 'Media', 'Productions', 'Film Group', 'Cinema'];

  HW.TITLE = {
    adj: words(`Last Silent Broken Golden Dark Hidden Lost Final Eternal Burning Crimson Wild Hollow Savage Secret
      Fallen Midnight Frozen Restless Distant Bitter Sweet Shattered Endless Iron Velvet Scarlet Electric Lonely
      Perfect Forgotten Wicked Little Infinite Deadly Brave Quiet Crooked Twisted Blue Black White Electric`),
    noun: words(`Heart Shadow River City Kingdom Dream Storm Fire Road Sky Night Promise Truth Game Empire Garden
      Mirror Echo Horizon Highway Witness Code Signal Harvest Winter Summer Ocean Island Frontier Hunter Machine
      Legacy Season Ghost Angel Stranger Detective Prophet Outlaw Crown Star Moon Sun Line Hour Letter Song Dance`),
    place: words(`Paris Brooklyn Memphis Tokyo Avalon Eden Babylon Mars Atlantis Nowhere Tomorrow Yesterday Vegas
      Montana Havana Berlin Rome Casablanca Shanghai Chinatown Harlem Sunset Malibu Arcadia Neptune Orion`),
    patterns: {
      'Drama':     ['The {adj} {noun}', '{noun} of {place}', 'A {noun} in {place}', '{adj} {noun}s', 'Before the {noun}'],
      'Comedy':    ['{first} Gets {verbed}', 'The {noun} Party', 'Meet the {last}s', 'My Big {adj} {noun}', '{first} & {first2}'],
      'Action':    ['{adj} {noun}', '{noun} Protocol', 'Operation {noun}', 'Code {adj}', 'Maximum {noun}', '{noun} Strike'],
      'Sci-Fi':    ['{noun} of {place}', 'Beyond the {noun}', 'The {noun} Paradox', 'Project {place}', '{place} Rising'],
      'Horror':    ['The {noun} Beneath', 'It Came from {place}', '{adj} {noun}', 'Don\'t Open the {noun}', 'The Hollowing'],
      'Romance':   ['Love in {place}', 'A {adj} {noun}', '{first} & {first2}', 'Letters to {first}', 'The {noun} Between Us'],
      'Thriller':  ['The {noun} Witness', '{adj} Silence', 'No {noun} Left', 'The {last} Affair', 'Dead {noun}'],
      'Fantasy':   ['The {noun} of {place}', '{adj} Kingdom', 'The {adj} Crown', 'Quest for {place}', 'Realm of {noun}s'],
      'Animation': ['{first} the {noun}', 'The Little {noun}', 'Tales of {place}', '{noun} Pals', 'The {adj} Adventure'],
      'War':       ['Battle of {place}', '{adj} Front', 'The Road to {place}', 'Brothers of the {noun}', 'Hill {num}'],
      'Western':   ['The {adj} Rider', '{noun} at Dawn', 'Showdown at {place}', 'The {last} Gang', 'Dust and {noun}'],
      'Musical':   ['{place} Nights', 'Sing for {first}', 'The {noun} Song', '{adj} Melody', 'Dancing in {place}'],
      'Biopic':    ['{first} {last}', 'The {last} Story', '{last}', 'Becoming {first}', 'The Man Called {last}'],
      'Crime':     ['The {last} Job', '{place} Confidential', 'Blood and {noun}', 'The {adj} Score', 'Family {noun}'],
      'Family':    ['A {noun} for {first}', 'The {noun} Who Saved {place}', 'Home for the {noun}', 'Our {adj} {noun}'],
      'Superhero': ['Captain {noun}', 'The {adj} {noun}', '{noun}man', 'League of {noun}s', 'Rise of the {noun}', '{noun} Force']
    },
    verbed: words(`Married Lost Fired Elected Even Lucky Famous Grounded Hitched Hired Even Schooled`)
  };

  HW.MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Industry-wide events. Each applies modifiers for the year it fires.
  HW.EVENTS = [
    { key: 'strike',   weight: 3, text: "Writers' strike halts production across town",       mods: { output: 0.72 } },
    { key: 'recession',weight: 4, text: 'Economic recession hits ticket sales',                 mods: { boxOffice: 0.84 } },
    { key: 'boom',     weight: 4, text: 'Moviegoing boom: theaters packed nationwide',          mods: { boxOffice: 1.15 } },
    { key: 'video',    weight: 3, text: 'Home video & streaming revenue surges',                mods: { ancillary: 1.5 } },
    { key: 'vfx',      weight: 3, text: 'Visual-effects breakthrough dazzles audiences',        mods: { spectacle: 1.25 } },
    { key: 'craze',    weight: 7, text: '{genre} craze sweeps the box office',                  mods: { craze: 1 } },
    { key: 'fatigue',  weight: 5, text: 'Audiences grow tired of {genre} pictures',             mods: { fatigue: 1 } },
    { key: 'china',    weight: 2, text: 'Overseas markets open up, global grosses soar',        mods: { boxOffice: 1.1, spectacleBO: 1.15 } },
    { key: 'prestige', weight: 3, text: 'Arthouse revival: audiences seek serious cinema',      mods: { prestigeBO: 1.3 } }
  ];
})(globalThis.HW = globalThis.HW || {});
