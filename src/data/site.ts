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
    // Big photo at the top of the /about page.
    teamPhoto: { src: '/photos/team-2026.jpg', alt: 'The 2026 Spartans celebrating with the conference trophy' },
    // Three photos for the About section on the home page. Drop files in
    // /public/photos and update these paths. Leave a path empty to show a placeholder.
    photos: [
      { src: '/photos/about-1.jpg', alt: 'Spartans fighting for a ground ball against Purdue' },
      { src: '/photos/about-2.jpg', alt: 'MSU attackman winding up to shoot' },
      { src: '/photos/about-3.jpg', alt: 'MSU midfielder splitting a defender in front of the goal' },
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
    gallery: ['/photos/gallery-1.jpg', '/photos/gallery-2.jpg', '/photos/gallery-3.jpg', '/photos/gallery-4.jpg', '/photos/gallery-5.jpg'],
  },

  // FAQ on the home page. Fill in q (question) and a (answer) for each.
  // Add or remove entries freely. An entry with an empty answer shows
  // "Answer coming soon." on the site until you write one.
  faq: [
    {
      q: 'Where does fundraising and sponsorship money go?',
      a: 'Straight back into the program. It covers travel to away games and tournaments, equipment, field time and the other costs of running a club team, and it helps keep player dues down.',
    },
    {
      q: 'Do you accept donations?',
      a: 'Yes. Use the Contact Us button and we will get back to you with the details.',
    },
    {
      q: 'When are tryouts?',
      a: 'Tryouts were held September 1–3 this year. Next year\'s dates will be posted here and on Instagram once they are set.',
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
