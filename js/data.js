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

  // Film titles. Tokens: {A} adjective, {N} noun, {Ns} plural noun, {P} place, {F}/{F2} first names,
  // {L} surname, {Ls} family plural, {V} comedy verb, {Num} number, {X} a hand-written title.
  // Each genre has its own vocabulary; {A}/{N}/{P} sometimes borrow from the shared pool.
  HW.TITLE = {
    shared: {
      A: words(`Last Silent Broken Golden Hidden Lost Final Burning Wild Secret Midnight Restless Distant Bitter
        Shattered Endless Lonely Perfect Forgotten Little Quiet Crooked Blue Long Hard Late Cold`),
      N: words(`Heart River City Dream Storm Road Night Promise Truth Game Garden Mirror Horizon Highway Season
        Letter Song Hour Line Summer Winter Ocean Island Harvest Distance Silence Memory Weekend`),
      P: words(`Paris Brooklyn Memphis Tokyo Havana Berlin Rome Casablanca Chicago Harlem Malibu Tucson Reno Lisbon
        Marseille Naples Detroit Galveston Saigon Manila Cairo Montreal Juarez Bakersfield Sacramento`)
    },
    plural: { Thief: 'Thieves', Wolf: 'Wolves', Knife: 'Knives', Child: 'Children', Man: 'Men', Woman: 'Women',
      Sky: 'Skies', City: 'Cities', Enemy: 'Enemies', Lady: 'Ladies', Story: 'Stories', Echo: 'Echoes', Hero: 'Heroes', Glory: 'Glories' },
    genres: {
      'Drama': {
        A: words(`Quiet Ordinary Fragile Borrowed Unspoken Narrow Tender Honest Patient Second Small Gentle Imperfect`),
        N: words(`Inheritance Kitchen Field Daughter Son Father Mother Brother Sister Window Porch Orchard Mill Winter Grace Absence Harbor`),
        P: words(`Ohio Nebraska Galway Duluth Kansas Maine Wichita Allentown`),
        pat: ['The {A} {N}', '{N} in {P}', 'A {N} for {F}', 'All the {A} {Ns}', 'What {F} Knew', 'The Last {N} in {P}', '{F}\'s {N}', 'Before the {N}', '{X}', '{X}'],
        X: ['The Weight of Water', 'Everything We Kept', 'Small Mercies', 'A Long Way From Home', 'The Year of Rain', 'Late Light', 'What Remains',
          'The Good Neighbor', 'Ordinary People Again', 'Salt and Bread', 'The House on Elm Street', 'Sunday Dinner', 'Strangers at the Table', 'The Quiet Years']
      },
      'Comedy': {
        A: words(`Big Bad Total Absolute Accidental Awkward Crazy Perfect Wrong Fake Last-Minute Terrible Lucky`),
        N: words(`Wedding Weekend Roommate Boss Neighbor Vacation Heist Reunion Babysitter Substitute Intern Ex Road-Trip Funeral Bachelor`),
        P: words(`Vegas Cleveland Florida Jersey Cancun Branson Atlantic-City`),
        pat: ['{F} Gets {V}', 'Meet the {Ls}', 'My {A} {N}', 'The {A} {N}', '{F} & {F2}', 'Who Invited {F}?', 'Weekend in {P}', 'The {N} from Hell', '{X}', '{X}'],
        V: words(`Married Fired Elected Lucky Famous Grounded Hitched Hired Schooled Dumped Promoted Even Audited`),
        X: ['Nobody Panic', 'Bad Sport', 'Totally Fine', 'Dad Mode', 'Don\'t Tell Mom', 'Bridesmaids Revenge', 'Plus One', 'Out of Office',
          'Parental Guidance', 'Hold My Calls', 'The Worst Best Man', 'Not Again', 'Two Weeks Notice', 'Spring Break Forever']
      },
      'Action': {
        A: words(`Maximum Lethal Rapid Hard Zero Direct Total Black Rogue Double Steel Blind Kill`),
        N: words(`Protocol Target Impact Velocity Force Strike Payload Extraction Fury Vendetta Breach Siege Countdown Ransom Point`),
        P: words(`Bangkok Hong-Kong Rio Istanbul Moscow Marseille Caracas`),
        pat: ['{A} {N}', 'Operation {N}', 'Code {A}', '{N} in {P}', 'Die Another {N}', '{F} {L}: {N}', 'The {N} Option', '{X}', '{X}'],
        X: ['No Way Back', 'Hard Target', 'Seven Hours to Midnight', 'Bulletproof', 'The Long Kill', 'Dead Drop', 'Point Blank', 'Fast Lane',
          'Last Man Standing', 'Under Siege', 'Red Line', 'Burn Notice', 'Countdown to Zero', 'Wolf Pack']
      },
      'Sci-Fi': {
        A: words(`Quantum Silent Dark Synthetic Orbital Distant Final Hollow Artificial Parallel Red Cold Deep`),
        N: words(`Signal Paradox Horizon Colony Protocol Frontier Orbit Machine Singularity Transmission Pulse Echo Ark Station Drift`),
        P: words(`Mars Europa Titan Andromeda Kepler Io Orion Neptune Proxima Callisto Vega`),
        pat: ['{N} of {P}', 'Beyond {P}', 'The {N} Paradox', 'Project {P}', '{P} Rising', 'The {A} {N}', '{P}: {A} {N}', 'Last Light on {P}', '{X}', '{X}'],
        X: ['Event Horizon', 'Dark Matter', 'Ghost in the Signal', 'Cold Sleep', 'The Long Dark', 'Ark Seven', 'Zero Gravity', 'Deep Field',
          'The Algorithm', 'After Earth', 'Tomorrow\'s Children', 'Ground Control', 'Second Sun', 'The Sleepers']
      },
      'Horror': {
        A: words(`Hollow Rotten Pale Whispering Crawling Hungry Bleeding Silent Wicked Grim Black Cursed`),
        N: words(`House Hollow Cellar Doll Thing Mother Wraith Harvest Ritual Grove Visitor Wake Barn Chapel Coven Lullaby`),
        P: words(`Salem Ravenswood Black-Lake Hollow-Creek Elmwood Graves-Point Wolf-Hill`),
        pat: ['The {N} Beneath', 'It Came from {P}', 'The {A} {N}', 'Don\'t Open the {N}', 'The {N} at {P}', '{A} {N}', 'Something in the {N}', '{X}', '{X}'],
        X: ['They Come at Night', 'Do Not Answer', 'The Hollowing', 'Teeth', 'Night Feeders', 'Stay Inside', 'The Unwelcome', 'Bloodline',
          'Hush Little Baby', 'Under the Floor', 'The Ninth Night', 'Skin', 'Room 13', 'Don\'t Look Back']
      },
      'Romance': {
        A: words(`Sweet Endless Unexpected Second Summer Secret Perfect Wild Little Lovely Stolen`),
        N: words(`Kiss Heart Promise Proposal Letter Valentine Dance Season Affair Vow Postcard Bouquet`),
        P: words(`Paris Venice Capri Provence Savannah Charleston Santorini Seville Vienna`),
        pat: ['Love in {P}', 'The {A} {N}', '{F} & {F2}', 'Letters to {F}', 'A {N} in {P}', 'Falling for {F}', 'One {A} {N}', 'Always, {F}', '{X}', '{X}'],
        X: ['Say Yes', 'The Wedding Season', 'Before Sunrise Again', 'Meant to Be', 'Second Chances', 'Still Yours', 'Head Over Heels',
          'The Notebook Years', 'Love, Actually Maybe', 'Something Borrowed', 'Kiss Me Twice', 'Ever After', 'If Only', 'Crazy for You']
      },
      'Thriller': {
        A: words(`Dead Silent Cold Clean Perfect Blind Final Hidden Dangerous Fatal Burnt`),
        N: words(`Witness Alibi Silence Confession Stranger Motive Suspect Evidence Passenger Tenant Informant Pact Verdict`),
        P: words(`Zurich Geneva Prague Washington Lisbon Vienna Baltimore`),
        pat: ['The {N}', 'The {A} {N}', 'No {N} Left', 'The {L} Affair', 'Dead {N}', 'The {N} in Room {Num}', '{N} in {P}', '{X}', '{X}'],
        X: ['Gone Quiet', 'The Girl Who Wasn\'t There', 'Rear Window Down', 'Closed Circuit', 'Double Blind', 'The Night Manager',
          'Missing Hours', 'Sleepwalker', 'Shadow of a Doubt', 'Trust No One', 'Third Floor', 'The Insider', 'Blackout', 'Unknown Caller']
      },
      'Fantasy': {
        A: words(`Iron Silver Shadow Ember Elder Thorned Gilded Fallen Sunken Hollow Moonlit`),
        N: words(`Crown Throne Blade Dragon Kingdom Realm Sorcerer Grail Oath Rune Citadel Wyrm Prophecy Gate`),
        P: words(`Avalon Eldoria Valemoor Thornwick Myrr Caer-Dun Ashgard Lyonesse Ondra`),
        pat: ['The {N} of {P}', 'The {A} {N}', 'Quest for {P}', 'Realm of {Ns}', 'The Last {N}', 'Chronicles of {P}', '{P}: The {A} {N}', '{X}', '{X}'],
        X: ['The Ninth Gate', 'Dragonsbane', 'Sword of Dawn', 'The Witch Queen', 'Ember and Ash', 'Kingsfall', 'The Hollow Crown',
          'Stormborn', 'The Wizard\'s Apprentice', 'Of Wolves and Kings', 'The Lantern Bearer', 'Thronebreaker', 'Moonblade', 'Spellbound']
      },
      'Animation': {
        A: words(`Little Brave Tiny Magic Super Silly Lost Lucky Fuzzy Grumpy`),
        N: words(`Fox Penguin Robot Dragon Mouse Bear Turtle Owl Toaster Cloud Bug Snail Rocket Kitten`),
        P: words(`Puddleton Toyland Gumdrop-Hills Snowpeak Treetop Bubbleville`),
        pat: ['{F} the {N}', 'The {A} {N}', 'Tales of {P}', '{N} Pals', 'The {A} {N} Adventure', '{F} and the {A} {N}', 'Welcome to {P}', '{X}', '{X}'],
        X: ['Up and Away', 'Paws!', 'Robo Buddies', 'The Snail Who Raced', 'Monster Nanny', 'Hoot!', 'Moon Mice', 'Sock Puppets',
          'Dino Daycare', 'Big Feet', 'Lost in Toyland', 'Mr. Blip', 'Pond Life', 'Cloudy Days']
      },
      'War': {
        A: words(`Bloody Long Last Iron Burning Frozen Broken Final Forgotten`),
        N: words(`Front Line Ridge Brothers Company Winter Beach Bridge River Harvest Hill Valley Retreat Trench`),
        P: words(`Normandy Ardennes Anzio Bastogne Okinawa Tobruk Verdun Inchon Arnhem Khe-Sanh Midway Leyte`),
        pat: ['Battle of {P}', 'The {A} {N}', 'The Road to {P}', 'Hill {Num}', 'Brothers of {P}', '{A} Front', 'Bridge at {P}', 'Letters from {P}', '{X}', '{X}'],
        X: ['No Man\'s Land', 'The Longest Night', 'Band of Strangers', 'Dawn Patrol', 'Hamburger Hill', 'Iron Rain', 'The Thin Line',
          'Fury Road', 'Twelve Came Home', 'The Forgotten Company', 'Behind Enemy Lines', 'Over the Top', 'Last Rites', 'Into the Fire']
      },
      'Western': {
        A: words(`Dusty Lonesome High Bitter Crooked Long Dead Wild Red Pale Lawless`),
        N: words(`Rider Gun Saddle Mesa Canyon Sheriff Outlaw Bounty Drifter Rattlesnake Gallows Stagecoach Posse Horse Trail`),
        P: words(`Tombstone Dodge-City Laredo Abilene Deadwood El-Paso Yuma Cheyenne Santa-Fe Silver-Creek Red-Rock`),
        pat: ['The {A} {N}', '{N} at Dawn', 'Showdown at {P}', 'The {L} Gang', 'Ride to {P}', '{A} Noon', 'The Man from {P}', 'A Horse Named {F}', '{X}', '{X}'],
        X: ['Dust and Glory', 'Three Graves West', 'Six Bullets', 'Hang Them High', 'The Long Ride', 'Rattlesnake Pass', 'Once Upon the Frontier',
          'Wanted', 'No Country for Saints', 'The Last Posse', 'Whiskey and Gunsmoke', 'Riders of the Purple Sage', 'True Grit Again', 'Big Sky']
      },
      'Musical': {
        A: words(`Starlight Golden Neon Sweet Swinging Broadway Electric Moonlit`),
        N: words(`Song Melody Rhythm Number Ballroom Serenade Encore Showboat Jukebox Tune Revue Waltz`),
        P: words(`Broadway Harlem Paris Vegas Havana Rio Memphis New-Orleans`),
        pat: ['{P} Nights', 'Sing for {F}', 'The {N} Song', '{A} {N}', 'Dancing in {P}', '{A} Serenade', '{F}!', '{X}', '{X}'],
        X: ['Hello, Broadway', 'Footlights', 'Swing Time', 'Jukebox Hearts', 'Top Hat Tonight', 'Stage Door', 'Let\'s Dance',
          'Moonlight Revue', 'Showtime', 'Rhythm and Blues', 'The Big Number', 'Encore!', 'Singin\' Again', 'All That Jazz']
      },
      'Biopic': {
        pat: ['{F} {L}', 'The {L} Story', '{L}', 'Becoming {F}', 'The Man Called {L}', 'The Woman Called {L}', '{F}: A Life', 'The Ballad of {F} {L}', 'Mr. {L}', 'Mrs. {L}'],
        A: [], N: [], P: [], X: []
      },
      'Crime': {
        A: words(`Dirty Clean Bloody Big Crooked Cold Hot Last Sweet Lucky`),
        N: words(`Job Score Heist Racket Syndicate Family Hustle Money Deal Getaway Payday Takedown Connection`),
        P: words(`Chicago Miami Boston Jersey Philly Detroit Brooklyn Las-Vegas New-Orleans`),
        pat: ['The {L} Job', '{P} Confidential', 'Blood and {N}', 'The {A} {N}', 'Family {N}', 'The {P} {N}', '{A} Money', 'Kings of {P}', '{X}', '{X}'],
        X: ['Mean Streets Again', 'Made Men', 'The Getaway Driver', 'Dirty Money', 'Snitch', 'Small Time', 'The Count', 'Cold Cash',
          'Wise Guys', 'Payback', 'The Takedown', 'Rackets', 'Night Shift', 'Blood Brothers']
      },
      'Family': {
        A: words(`Little Magic Lucky Brave Wonderful Amazing Secret`),
        N: words(`Dog Puppy Pony Treehouse Christmas Summer Camp Wish Dragon Snowman Grandpa`),
        P: words(`Maple-Falls Pine-Hollow Willow-Creek Sunnyside`),
        pat: ['A {N} for {F}', 'The {N} Who Saved {P}', 'Home for the {N}', 'Our {A} {N}', '{F}\'s {A} {N}', 'The {A} {N}', 'Summer at {P}', '{X}', '{X}'],
        X: ['Homeward Bound', 'Good Boy', 'The Big Snow', 'Grandpa\'s Garage', 'Camp Chaos', 'Lost and Found', 'A Very Merry Mix-Up',
          'The Treehouse Gang', 'Kid Detectives', 'Snow Day', 'Beethoven\'s Puppy', 'The Wish List', 'Ponies!', 'Sleepover']
      },
      'Superhero': {
        A: words(`Mighty Crimson Iron Midnight Atomic Silver Dark Invincible Ultra Amazing`),
        N: words(`Guardian Sentinel Avenger Phantom Titan Vigilante Comet Valkyrie Falcon Paladin Specter Hornet Raven`),
        P: words(`Metro-City Gotham Star-City Central-City Bay-City`),
        pat: ['Captain {P}', 'The {A} {N}', '{N}', '{A} {N}', 'Rise of the {N}', '{N}: {A} Dawn', 'The {N} Saga', '{N} and the {A} {N}', '{X}'],
        X: ['Ultraforce', 'The Defenders', 'Nightwing Rising', 'Justice Squad', 'Kid Thunder', 'Masked', 'Origins', 'Hero Complex', 'Shieldmaiden', 'Doctor Nova']
      }
    }
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
