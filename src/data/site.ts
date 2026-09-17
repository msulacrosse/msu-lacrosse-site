/**
 * Site-wide content that isn't pulled from MCLA. Edit this file to change the
 * About text, FAQ, sponsors, contact email and social links.
 */
export const site = {
  name: 'MSU Lacrosse',
  fullName: "Michigan State University Men's Lacrosse",
  shortName: 'Michigan State',
  description:
    "Official site of Michigan State University Men's Lacrosse — schedule, results, roster, stats and news for the Spartans, competing in the MCLA's Upper Midwest Lacrosse Conference.",
  contactEmail: 'lacrosse@msu.edu', // TODO: confirm the team inbox
  instagram: 'https://www.instagram.com/msu_lacrosse/',
  mclaTeamUrl: 'https://mcla.us/teams/michigan-state',

  hero: {
    eyebrow: 'Michigan State University Lacrosse',
    wordmark: 'SPARTANS',
  },

  about: {
    heading:
      "Learn more about the Michigan State Men's Lacrosse program, our history, and what we're all about.",
    // Three photos for the About section. Drop files in /public/photos and
    // update these paths. Leave a path empty to show a placeholder.
    photos: [
      { src: '', alt: 'Team photo' },
      { src: '', alt: 'Game action' },
      { src: '', alt: 'Travel and locker room' },
    ],
    // Paragraphs on the /about page
    body: [
      "Michigan State Men's Lacrosse is a student-run club program competing at the highest level of the Men's Collegiate Lacrosse Association (MCLA) in the Upper Midwest Lacrosse Conference. The Spartans play a full spring schedule against programs from across the country, with home games in East Lansing.",
      'The team is built by its players: practices, travel, fundraising and game-day operations are all organized by the roster with support from the coaching staff. Players come from Michigan and from across the U.S., and the program welcomes anyone with the commitment to compete.',
      'Fall ball runs September through October, winter training carries the team through the off-season, and the competitive season runs February through May, ending with conference playoffs and the MCLA National Tournament.',
    ],
  },

  join: {
    eyebrow: 'Join the Team',
    heading: 'Ready To Be A Spartan?',
    text:
      'Tryouts are held at the start of the fall semester. Reach out to the coaching staff with your name, position, graduation year and playing background, and we will get back to you with dates and details.',
    // Five portrait photos for the fanned gallery. Same rules as About photos.
    gallery: ['', '', '', '', ''],
  },

  faq: [
    {
      q: 'When are tryouts?',
      a: 'Tryouts are held at the start of the fall semester. Dates and location are posted here and on Instagram once the academic calendar is set.',
    },
    {
      q: 'Do I need prior experience?',
      a: 'Most players come in with high school or club experience, but athletes who are new to the sport are welcome to try out. Come ready to compete and learn.',
    },
    {
      q: 'What does the season look like?',
      a: 'Fall ball in September and October, winter training, and the spring competitive season from February through May, with conference playoffs and the MCLA National Tournament at the end.',
    },
    {
      q: 'Are there dues or travel costs?',
      a: 'As a club program, players pay dues that cover league fees, travel, field time and gear. The team fundraises throughout the year to keep costs down. Contact the coaches for current numbers.',
    },
    {
      q: 'How do I contact the coaches?',
      a: 'Email the team using the button below, or send a message on Instagram.',
    },
  ],

  // Home page "Meet The Spartans" cards. Leave empty to show the season's
  // top 5 point scorers automatically; or list jersey numbers to hand-pick.
  featuredNumbers: [] as number[],

  // Sponsor logos: drop files in /public/sponsors and list them here.
  // Leave the list empty to hide the section.
  sponsors: [] as { name: string; logo: string; url?: string }[],
};

export const nav = [
  { label: 'Home', href: '/' },
  { label: 'Schedule', href: '/schedule' },
  { label: 'Roster', href: '/roster' },
  { label: 'Stats', href: '/stats' },
  { label: 'News', href: '/news' },
];
