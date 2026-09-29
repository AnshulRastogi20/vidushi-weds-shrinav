/* One entry per invitation page. The key is the URL path: "wedding" is "/", others are "/haldi" etc.
   Pages never link to each other, so a guest only sees the events their link was sent for.
   An event with live: false only renders on the local preview server; vercel.json must also
   list a rewrite for the slug before it is reachable on the domain. */
window.WEDDING = {
  supabaseUrl: "https://ddpubhkgcbcwncyeebzc.supabase.co",
  supabaseKey: "sb_publishable_Am-lHqCMq1ANCtyzlQidXg_9QJuhbNm",
  hosts: "Smt. Daisy & Sh. Shiva Prakash Vatsa",
  bride: { name: "Vidushi Vatsa", parents: "D/o Rachna & Supriyam Vatsa" },
  groom: { name: "Shrinav Rastogi", parents: "S/o Richa & Naveen Rastogi" },
  family: "Vatsa Family",
  music: "/assets/audio/theme.mp3",
  couplePhoto: "/assets/photos/couple.jpg",
  moments: ["/assets/photos/moment-1.jpg", "/assets/photos/moment-2.jpg", "/assets/photos/moment-3.jpg"],
};

window.EVENTS = {
  wedding: {
    live: true,
    title: "Wedding Ceremony",
    titleArt: "wedding-ceremony", // the card's own Edwardian Script lettering
    request: "request your gracious presence on the auspicious occasion of the wedding of their beloved granddaughter",
    start: "2026-12-12T20:00:00+05:30",
    end: "2026-12-13T02:00:00+05:30",
    dateLine: "Saturday, 12th December 2026",
    timeLine: "8 pm onwards",
    venue: "Royal Heritage",
    venueLine: "Country Inn & Suites, Ghaziabad",
    mapsQuery: "Country Inn & Suites by Radisson Sahibabad Ghaziabad",
    theme: "evening",
    heroDate: ["12", "12", "2026"],
    heroPlace: "Ghaziabad",
    rsvpBy: null,
  },
  haldi: {
    live: false,
    title: "Haldi Ceremony",
    request: "request the pleasure of your company at the Haldi ceremony of their beloved granddaughter",
    start: null,
    end: null,
    dateLine: "Date to be announced",
    timeLine: "",
    venue: "Venue to be announced",
    venueLine: "",
    mapsQuery: null,
    theme: "morning",
    heroDate: null,
    heroPlace: "Ghaziabad",
    rsvpBy: null,
  },
  mehndi: {
    live: false,
    title: "Mehndi Ceremony",
    request: "request the pleasure of your company at the Mehndi ceremony of their beloved granddaughter",
    start: null,
    end: null,
    dateLine: "Date to be announced",
    timeLine: "",
    venue: "Venue to be announced",
    venueLine: "",
    mapsQuery: null,
    theme: "henna",
    heroDate: null,
    heroPlace: "Ghaziabad",
    rsvpBy: null,
  },
};
