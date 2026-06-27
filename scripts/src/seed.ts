import {
  db,
  usersTable,
  postsTable,
  commentsTable,
  likesTable,
  followsTable,
  societiesTable,
  societyMembersTable,
  eventsTable,
  eventRsvpsTable,
  jobsTable,
  savedJobsTable,
  messagesTable,
  notificationsTable,
  buildingsTable,
  storiesTable,
  pool,
} from "@workspace/db";

async function seed() {
  console.log("Clearing existing data...");
  // Delete in FK-safe order
  await db.delete(notificationsTable);
  await db.delete(messagesTable);
  await db.delete(savedJobsTable);
  await db.delete(jobsTable);
  await db.delete(eventRsvpsTable);
  await db.delete(eventsTable);
  await db.delete(societyMembersTable);
  await db.delete(societiesTable);
  await db.delete(likesTable);
  await db.delete(commentsTable);
  await db.delete(postsTable);
  await db.delete(followsTable);
  await db.delete(usersTable);
  await db.delete(buildingsTable);
  await db.delete(storiesTable);

  // Only real, non-demo data is seeded: the University of Lahore campus
  // locations. Users, posts, societies, events, jobs, messages, notifications
  // and stories are intentionally left empty — they are created through the
  // app against the real backend/database.
  console.log("Seeding real University of Lahore campus locations...");
  await db.insert(buildingsTable).values([
    {
      name: "The University of Lahore",
      hours: "Open · Mon–Sat, 8 AM–10 PM",
      icon: "fas fa-building-columns",
      color: "#4f46e5",
      x: 41,
      y: 15,
      mapsUrl:
        "https://www.google.com/maps/place/The+University+of+Lahore/@31.3918614,74.2416876,17.92z/data=!4m6!3m5!1s0x3919018a8ea548c1:0x4a52db69c2c814f!8m2!3d31.3923645!4d74.2420509!16zL20vMDhnNWZo?entry=ttu&g_ep=EgoyMDI2MDYwMy4xIKXMDSoASAFQAw%3D%3D",
    },
    {
      name: "UOL Playground",
      hours: "Open · Until 9 PM",
      icon: "fas fa-futbol",
      color: "#10b981",
      x: 63,
      y: 76,
      mapsUrl:
        "https://www.google.com/maps/place/UOL+Playground/@31.3918308,74.242051,18.88z/data=!4m6!3m5!1s0x3919006b2390ceb9:0x9d36d58d21cc3708!8m2!3d31.3912068!4d74.2425767!16s%2Fg%2F11g81c9fjw?entry=ttu&g_ep=EgoyMDI2MDYwMy4xIKXMDSoASAFQAw%3D%3D",
    },
    {
      name: "UOL Masjid",
      hours: "Open · Daily, prayer times",
      icon: "fas fa-mosque",
      color: "#14b8a6",
      x: 20,
      y: 56,
      mapsUrl:
        "https://www.google.com/maps/place/UOL+Masjid/@31.3920258,74.2415052,18.01z/data=!4m6!3m5!1s0x39190100152c57a1:0x7641b577170c7579!8m2!3d31.3915928!4d74.2415468!16s%2Fg%2F11vqwv2cf3?entry=ttu&g_ep=EgoyMDI2MDYwMy4xIKXMDSoASAFQAw%3D%3D",
    },
    {
      name: "SOCA - School of Creative Arts",
      hours: "Open · Until 6 PM",
      icon: "fas fa-palette",
      color: "#ec4899",
      x: 85,
      y: 28,
      mapsUrl:
        "https://www.google.com/maps/place/SOCA+-+School+of+Creative+Arts/@31.3920258,74.2415052,18.01z/data=!4m6!3m5!1s0x3919006ae6c81e35:0xf4b8ca47128f9572!8m2!3d31.3921185!4d74.2430914!16s%2Fg%2F1hc7zknpn?entry=ttu&g_ep=EgoyMDI2MDYwMy4xIKXMDSoASAFQAw%3D%3D",
    },
    {
      name: "Club UOL & Swimming Pool",
      hours: "Open · 7 AM–9 PM",
      icon: "fas fa-person-swimming",
      color: "#06b6d4",
      x: 47,
      y: 84,
      mapsUrl:
        "https://www.google.com/maps/place/Club+UOL+%26+Swimming+Pool/@31.3913476,74.2422641,19.57z/data=!4m6!3m5!1s0x3919006b25703667:0xb6ff9b68eba9cb04!8m2!3d31.3910702!4d74.2421984!16s%2Fg%2F11g7zj90sz?entry=ttu&g_ep=EgoyMDI2MDYwMy4xIKXMDSoASAFQAw%3D%3D",
    },
    {
      name: "University Stadium",
      hours: "Open · Until 8 PM",
      icon: "fas fa-trophy",
      color: "#f97316",
      x: 70,
      y: 70,
      mapsUrl:
        "https://www.google.com/maps/place/University+Stadium/@31.3913248,74.2423039,19.71z/data=!4m6!3m5!1s0x3919006b222f30f9:0xb56896b2568ec976!8m2!3d31.3913258!4d74.2427311!16s%2Fg%2F11c6d_rjs2?entry=ttu&g_ep=EgoyMDI2MDYwMy4xIKXMDSoASAFQAw%3D%3D",
    },
    {
      name: "Electrical Engineering",
      hours: "Open · Until 5 PM",
      icon: "fas fa-bolt",
      color: "#eab308",
      x: 26,
      y: 80,
      mapsUrl:
        "https://www.google.com/maps/place/ELECTRICAL+ENGINEERING/@31.391188,74.2418939,19.62z/data=!4m6!3m5!1s0x3919006b2c5f53df:0xa7c627c18a04a352!8m2!3d31.3910996!4d74.2415945!16s%2Fg%2F11dyzbw6zf?entry=ttu&g_ep=EgoyMDI2MDYwMy4xIKXMDSoASAFQAw%3D%3D",
    },
    {
      name: "Lahore School of Architecture",
      hours: "Open · Until 5 PM",
      icon: "fas fa-compass-drafting",
      color: "#8b5cf6",
      x: 14,
      y: 86,
      mapsUrl:
        "https://www.google.com/maps/place/Lahore+School+of+Architecture/@31.3912956,74.2419063,19.01z/data=!4m6!3m5!1s0x3919006b2cd3c9e5:0x14a8045c0c957ece!8m2!3d31.391043!4d74.2414266!16s%2Fg%2F11b6r7wwdk?entry=ttu&g_ep=EgoyMDI2MDYwMy4xIKXMDSoASAFQAw%3D%3D",
    },
  ]);

  console.log("Done seeding ✔ (real UOL campus locations only)");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
