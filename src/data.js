/**
 * University Schedule Data - GROUPED OPTIMIZED VERSION
 * * LOGIC APPLIED:
 * - IF subgroup 'a' and 'b' match (Subject, Type, Day, Time, Room, Frequency) -> Merged into Group 'X' (e.g., "31").
 * - IF they differ (e.g., one is Odd, one is Even) -> Kept separate as 'a' and 'b'.
 */

export const universitySchedule = [
    // ==========================================================
    // CURSURI (LECTURES)
    // ==========================================================
    { subject: "PS", fullName: "Proiectarea Software", type: "curs", day: "Luni", start: 12, end: 14, room: "G307 / AN101", frequency: "weekly", prof: "L. Dumitriu" },
    { subject: "LFT", fullName: "Limbaje Formale și Translatoare", type: "curs", day: "Luni", start: 14, end: 16, room: "G307 / D02", frequency: "weekly", weeks: "s1-7", prof: "D. Stefanescu" },
    { subject: "PAOO", fullName: "Proiectarea Aplicațiilor Orientate Obiect", type: "curs", day: "Luni", start: 16, end: 18, room: "G307 / D02", frequency: "weekly", prof: "C. Anton" },
    { subject: "PIU", fullName: "Proiectarea Interfețelor Utilizator", type: "curs", day: "Marti", start: 14, end: 16, room: "G307 / D11", frequency: "weekly", prof: "M. Vlase" },
    { subject: "IA", fullName: "Inteligență Artificială", type: "curs", day: "Miercuri", start: 10, end: 12, room: "G307 / AN101", frequency: "weekly", prof: "A. Cocu" },
    { subject: "PLF", fullName: "Programare Logică și Funcțională", type: "curs", day: "Joi", start: 14, end: 16, room: "G307", frequency: "odd", prof: "G. Chirita" },
    { subject: "PAW", fullName: "Proiectarea Aplicațiilor Web", type: "curs", day: "Vineri", start: 8, end: 10, room: "G307 / D02", frequency: "weekly", prof: "D. Munteanu" },

    // ==========================================================
    // LUNI (Monday)
    // ==========================================================
    // 14:00 - 16:00 (LFT Proiect 32 - Weekly shared)
    { subject: "LFT", type: "proiect", day: "Luni", start: 14, end: 16, room: "G306", group_id: "32", weeks: "s8-14", frequency: "weekly" },

    // 18:00 - 20:00
    // 31: Split LFT (31a Lab / 31b Proiect -> Cannot Merge)
    { subject: "LFT", type: "lab", day: "Luni", start: 18, end: 20, room: "G306", group_id: "31a", weeks: "s1-7", frequency: "weekly" },
    { subject: "LFT", type: "proiect", day: "Luni", start: 18, end: 20, room: "G306", group_id: "31a", weeks: "s8-14", frequency: "weekly" },
    { subject: "LFT", type: "proiect", day: "Luni", start: 18, end: 20, room: "G308", group_id: "31b", weeks: "s8-14", frequency: "weekly" },

    // 33 & 32 PAOO Proiect (Merged into Groups)
    { subject: "PAOO", type: "proiect", day: "Luni", start: 18, end: 20, room: "G407", group_id: "33", frequency: "odd" },
    { subject: "PAOO", type: "proiect", day: "Luni", start: 18, end: 20, room: "G407", group_id: "32", frequency: "even" },

    // ==========================================================
    // MARTI (Tuesday)
    // ==========================================================
    // 08:00 - IA Lab 32 
    { subject: "IA", type: "lab", day: "Marti", start: 8, end: 10, room: "G308", group_id: "32b", frequency: "odd" },
    { subject: "IA", type: "lab", day: "Marti", start: 8, end: 10, room: "G308", group_id: "32a", frequency: "even" },

    // 10:00 - IA Proiect
    { subject: "IA", type: "proiect", day: "Marti", start: 10, end: 12, room: "G306", group_id: "32", frequency: "even" },
    { subject: "IA", type: "proiect", day: "Marti", start: 10, end: 12, room: "G306", group_id: "33", frequency: "odd" },

    // 12:00
    // 31 IA Proiect (Merged Odd)
    { subject: "IA", type: "proiect", day: "Marti", start: 12, end: 14, room: "G408", group_id: "31", frequency: "odd" },
    // 31 PLF Lab (Merged Even)
    { subject: "PLF", type: "lab", day: "Marti", start: 12, end: 14, room: "Y505", group_id: "31b", frequency: "even" },

    // 33b PLF Lab (Single)
    { subject: "PLF", type: "lab", day: "Marti", start: 12, end: 14, room: "Y505", group_id: "33b", frequency: "odd" },

    // 16:00
    // 31 PAOO Proiect (Merged Odd)
    { subject: "PAOO", type: "proiect", day: "Marti", start: 16, end: 18, room: "Y505", group_id: "31", frequency: "odd" },

    // Split Even: 31b PAOO / 31a PLF (Different Rooms/Subjects -> Cannot Merge)
    { subject: "PAOO", type: "lab", day: "Marti", start: 16, end: 18, room: "Y505", group_id: "31b", frequency: "even" },
    { subject: "PLF", type: "lab", day: "Marti", start: 16, end: 18, room: "G408", group_id: "31a", frequency: "even" },

    // 32a PLF (Even)
    { subject: "PLF", type: "lab", day: "Marti", start: 16, end: 18, room: "G408", group_id: "32a", frequency: "even" },

    // 33 LFT (Merged Weekly/Split Weeks)
    { subject: "LFT", type: "lab", day: "Marti", start: 16, end: 18, room: "G306", group_id: "33a", weeks: "s1-7", frequency: "weekly" },
    { subject: "LFT", type: "proiect", day: "Marti", start: 16, end: 18, room: "G306", group_id: "33a", weeks: "s8-14", frequency: "weekly" },
    { subject: "LFT", type: "proiect", day: "Marti", start: 16, end: 18, room: "G306", group_id: "33b", weeks: "s8-14", frequency: "weekly" },

    // 18:00
    // 31a PAOO Lab (Odd)
    { subject: "PAOO", type: "lab", day: "Marti", start: 18, end: 20, room: "G409", group_id: "31a", frequency: "odd" },
    // 33b PAOO Lab (Even)
    { subject: "PAOO", type: "lab", day: "Marti", start: 18, end: 20, room: "G409", group_id: "33b", frequency: "even" },

    { subject: "LFT", type: "lab", day: "Marti", start: 18, end: 20, room: "G306", group_id: "31b", weeks: "s1-7", frequency: "weekly" },
    { subject: "PIU", type: "lab", day: "Marti", start: 18, end: 20, room: "G406", group_id: "33a", frequency: "weekly" },

    // ==========================================================
    // MIERCURI (Wednesday)
    // ==========================================================
    { subject: "PAW", type: "lab", day: "Miercuri", start: 8, end: 10, room: "G408", group_id: "31a", frequency: "weekly" },
    { subject: "LFT", type: "lab", day: "Miercuri", start: 8, end: 10, room: "G306", group_id: "32a", weeks: "s1-7", frequency: "weekly" },
    { subject: "PAW", type: "lab", day: "Miercuri", start: 8, end: 10, room: "G409", group_id: "32b", frequency: "weekly" },

    // 12:00
    // IA Lab Split (Odd/Even -> Cannot Merge frequencies)
    { subject: "IA", type: "lab", day: "Miercuri", start: 12, end: 14, room: "G308", group_id: "31a", frequency: "even" },
    { subject: "IA", type: "lab", day: "Miercuri", start: 12, end: 14, room: "G308", group_id: "31b", frequency: "odd" },

    { subject: "LFT", type: "lab", day: "Miercuri", start: 12, end: 14, room: "G306", group_id: "32b", weeks: "s1-7", frequency: "weekly" },

    // 16:00
    { subject: "LFT", type: "lab", day: "Miercuri", start: 16, end: 18, room: "G306", group_id: "33b", weeks: "s1-7", frequency: "weekly" },



    // ==========================================================
    // JOI (Thursday)
    // ==========================================================
    // 08:00
    { subject: "PAW", type: "lab", day: "Joi", start: 8, end: 10, room: "G406", group_id: "31b", frequency: "weekly" },
    { subject: "PAW", type: "lab", day: "Joi", start: 8, end: 10, room: "G407", group_id: "32", frequency: "weekly" }, // Merged

    { subject: "IA", type: "lab", day: "Joi", start: 8, end: 10, room: "G306", group_id: "33a", frequency: "even" },
    { subject: "IA", type: "lab", day: "Joi", start: 8, end: 10, room: "G306", group_id: "33b", frequency: "odd" },
    // 10:00
    { subject: "PIU", type: "lab", day: "Joi", start: 10, end: 12, room: "G306", group_id: "31b", frequency: "weekly" },


    // 12:00

    { subject: "PS", type: "lab", day: "Joi", start: 12, end: 14, room: "G408", group_id: "32a", frequency: "odd" },


    { subject: "PS", type: "lab", day: "Joi", start: 12, end: 14, room: "G408", group_id: "33a", frequency: "even" },
    { subject: "PIU", type: "lab", day: "Joi", start: 12, end: 14, room: "G306", group_id: "33b", frequency: "weekly" },

    // 14:00
    { subject: "PS", type: "lab", day: "Joi", start: 14, end: 16, room: "G308", group_id: "33b", frequency: "even" },
    { subject: "PLF", type: "lab", day: "Joi", start: 14, end: 16, room: "G408", group_id: "33a", frequency: "even" },
    // 16:00
    // 31a (Split Odd/Even Same Group -> Cannot Merge into Weekly if restricted)
    { subject: "PIU", type: "lab", day: "Joi", start: 16, end: 18, room: "G306", group_id: "31a", frequency: "weekly" },
    { subject: "PS", type: "lab", day: "Joi", start: 16, end: 18, room: "G308", group_id: "32b", frequency: "even" },

    { subject: "PAOO", type: "lab", day: "Joi", start: 16, end: 18, room: "G407", group_id: "32a", frequency: "odd" },
    { subject: "PLF", type: "lab", day: "Joi", start: 16, end: 18, room: "G408", group_id: "32b", frequency: "odd" },
    { subject: "PAOO", type: "lab", day: "Joi", start: 16, end: 18, room: "G407", group_id: "33", frequency: "even" },

    // 18:00
    { subject: "PAOO", type: "lab", day: "Joi", start: 18, end: 20, room: "G407", group_id: "32b", frequency: "odd" },

    // ==========================================================
    // VINERI (Friday) - PERFECT MERGE CANDIDATES
    // ==========================================================
    // 10:00
    { subject: "PAW", type: "proiect", day: "Vineri", start: 10, end: 12, room: "G306", group_id: "31", frequency: "odd" }, // Merged
    { subject: "PAW", type: "proiect", day: "Vineri", start: 10, end: 12, room: "G408", group_id: "32", frequency: "odd" }, // Merged
    { subject: "PS", type: "proiect", day: "Vineri", start: 10, end: 12, room: "G406", group_id: "33", frequency: "odd" }, // Merged

    { subject: "PS", type: "proiect", day: "Vineri", start: 10, end: 12, room: "G308", group_id: "31", frequency: "even" }, // Merged
    { subject: "PS", type: "proiect", day: "Vineri", start: 10, end: 12, room: "G406", group_id: "32", frequency: "even" }, // Merged
    { subject: "PAW", type: "proiect", day: "Vineri", start: 10, end: 12, room: "G306", group_id: "33", frequency: "even" }, // Merged

    // 12:00
    { subject: "PS", type: "lab", day: "Vineri", start: 12, end: 14, room: "G308", group_id: "31b", frequency: "odd" },
    { subject: "PS", type: "lab", day: "Vineri", start: 12, end: 14, room: "G308", group_id: "31a", frequency: "even" },
    { subject: "PIU", type: "lab", day: "Vineri", start: 12, end: 14, room: "G406", group_id: "32a", frequency: "weekly" },
    { subject: "PAW", type: "lab", day: "Vineri", start: 12, end: 14, room: "G406", group_id: "33a", frequency: "weekly" },
    { subject: "PAW", type: "lab", day: "Vineri", start: 12, end: 14, room: "G408", group_id: "33b", frequency: "weekly" },

    // 14:00
    { subject: "PIU", type: "lab", day: "Vineri", start: 14, end: 16, room: "G406", group_id: "32b", frequency: "weekly" }
];

export default universitySchedule;