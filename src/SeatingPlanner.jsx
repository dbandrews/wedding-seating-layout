import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  isStorageAvailable,
  loadSaved,
  save,
  clearSaved,
  mergeSeats,
  mergePos,
  highestGuestNumber,
} from "./storage";

/* ============================================================
   Wedding Seating Planner
   Round tables: seat 1 is the rightmost seat, numbering runs clockwise.
   Head table: seat 1 is the top seat on the right-hand side, then clockwise
   (down the right side, across, and back up the left side).
   Venue plan numbering: the table drawn as "11" is Table 10 on the meal
   sheet, and the one drawn as "12" is Table 11.
   ============================================================ */

const C = {
  bg: "#14171A",
  surface: "#1C2126",
  surfaceUp: "#232A30",
  line: "#303840",
  lineSoft: "#262E34",
  text: "#ECE8E0",
  muted: "#98A2AA",
  ivory: "#E8E2D4",
  floor: "#F3F1EC",
  floorLine: "#B9B4AA",
  flag: "#E0B341",
};

const MEAL_COLORS = {
  Strip: "#C2554A",
  Chicken: "#D9A441",
  Ravioli: "#7FA96B",
  "Kids Meal": "#6FA8C7",
};
const OTHER_COLOR = "#9C8FA8";
const mealColor = (m) => (m ? MEAL_COLORS[m] || OTHER_COLOR : C.line);

const PACKAGE_ENTREES = ["Strip", "Chicken", "Ravioli", "Kids Meal"];
const OTHER_ENTREES = ["Pork", "Salmon", "Pickerel", "Prime Rib", "Veg Mille Feuille", "Risotto"];
const APPETIZERS = [
  "Beet & Pear Salad (V/GF)",
  "Classic Caesar Salad",
  "Baby Spinach Salad (V/GF)",
  "Baby Kale & Quinoa (VEGAN/GF)",
  "Couscous Salad",
  "San Marzano Tomato Soup (VEGAN)",
  "Wild Mushroom Soup (V/GF)",
  "Beet Carpaccio (GF)",
  "Seafood Cake (+$3/person)",
  "Crispy Coconut Prawns (+$3/person)",
  "Wild Mushroom Tart (+$3/person) (V/GF)",
];
const DESSERTS = [
  "Blueberry Mason Jar Cheesecake",
  "Pavlova (GF)",
  "Warm Apple Tart Tatin",
  "Double Chocolate Cake",
];
const KIDS_MEALS = [
  "Chicken Fingers, French Fries, Plum Sauce",
  "Hamburger, French Fries",
  "Pasta with Tomato Sauce",
  "Mac & Cheese",
];

/* ---------- Room layout (positions taken from the venue floor plan) ---------- */
const CANVAS_ASPECT = 1.15; // room plan height ÷ width

const TABLE_META = [
  { id: "head", label: "Head Table", short: "Head", shape: "rect", cap: 14, x: 49, y: 23, w: 17.5, h: 39 },
  { id: "t1", label: "Table 1", short: "1", shape: "circle", cap: 9, x: 14, y: 17 },
  { id: "t2", label: "Table 2", short: "2", shape: "circle", cap: 9, x: 11.5, y: 43 },
  { id: "t3", label: "Table 3", short: "3", shape: "circle", cap: 9, x: 31, y: 61 },
  { id: "t4", label: "Table 4", short: "4", shape: "circle", cap: 9, x: 12, y: 86.5 },
  { id: "t5", label: "Table 5", short: "5", shape: "circle", cap: 9, x: 41.5, y: 86 },
  { id: "t6", label: "Table 6", short: "6", shape: "circle", cap: 9, x: 60, y: 60.5 },
  { id: "t7", label: "Table 7", short: "7", shape: "circle", cap: 9, x: 72.5, y: 87 },
  { id: "t8", label: "Table 8", short: "8", shape: "circle", cap: 9, x: 88, y: 67.5 },
  { id: "t9", label: "Table 9", short: "9", shape: "circle", cap: 9, x: 85, y: 43 },
  { id: "t10", label: "Table 10", short: "10", shape: "circle", cap: 9, x: 83, y: 17.5 },
];

/* ---------- Guests from the meal sheet ---------- */
const g = (name, entree, notes = "", kids = "") => ({ name, entree, notes, kids });
const SEED = {
  head: [
    g("Andrew Mathers", "Strip"),
    g("Sarah Mathers", "Chicken"),
    g("Kaila Burnham", "Strip"),
    g("Jordan Burnham", "Strip"),
    g("Bailey Mcknight", "Strip"),
    g("Lauren Bechard", "Strip"),
    g("Peter McCarthy", "Strip"),
    g("Shannon McCarthy", "Strip"),
    g("Pat Inglis", "Chicken"),
    g("Christy See", "Strip"),
    g("Ashley Connolly", "Strip"),
    g("Alex Norris", "Strip"),
    g("Maggie Stuart", "Strip", "Celiac disease. Gluten free."),
    g("Dustin Andrews", "Strip"),
  ],
  t1: [
    g("Howard Margolis", "Strip"),
    g("Stu Nemtin", "Strip"),
    g("Sally Glover", "Strip"),
    g("Lorraine Glover", "Chicken"),
    g("Ken Glover", "Strip"),
    g("Ian Gaille", "Strip"),
    g("Jill Leacock", "Strip"),
    g("Ginny Glover", "Chicken"),
    g("David Stuart", "Strip"),
  ],
  t2: [
    g("Zachary Vogel", "Chicken"),
    g("Terry Ishizaki", "Chicken"),
    g("Dana Glover", "Strip"),
    g("Simon Stuart", "Strip"),
    g("Isabel Cartajena", "Strip"),
    g("Bronwyn Upright", "Strip"),
    g("Naomi Upright", "Kids Meal", "", "Chicken Fingers, French Fries, Plum Sauce"),
    g("Naya Yacoub", "Strip", "Gluten free"),
  ],
  t3: [
    g("Reza Hedayat", "Strip"),
    g("Britt Harold", "Strip"),
    g("Amber Hoyeck", "Strip"),
    g("JP Hoyeck", "Strip"),
    g("Ariel Weber", "Strip"),
    g("Kim Nusbaum", "Strip"),
    g("Emma Nemtin", "Strip"),
    g("Breanne Glover", "Chicken", "Allergic to fish; sensitivity to cheese"),
    g("Fraser Campbell", "Strip"),
  ],
  t4: [
    g("Caleigh Hunt", "Ravioli"),
    g("Brendan Hunt", "Strip"),
    g("Adam Lonseth", "Strip"),
    g("Codie Lonseth", "Strip"),
    g("Jen DeJong", "Strip", "Peanut and tree nut allergy"),
    g("Bob DeJong", "Strip"),
    g("Scott Yester", "Strip"),
    g("Charlotte Yester", "Chicken"),
  ],
  t5: [
    g("Natalie Eastham", "Strip"),
    g("Chris Eastham", "Strip"),
    g("Sean Kimak", "Strip"),
    g("Rach Kimak", "Strip"),
    g("Brianne Jones", "Strip"),
    g("Riley Miller", "Strip"),
    g("Sean Leeson", "Strip"),
    g("Berkly MacPherson", "Strip"),
  ],
  t6: [
    g("Jason Ryu", "Strip"),
    g("Cecilli Chat", "Strip"),
    g("Julia Yip", "Strip"),
    g("Jeff Yip", "Strip"),
    g("John Stebbing", "Strip"),
    g("Alex Todorovich", "Strip"),
    g("Celiah Dale", "Strip"),
    g(
      "Heather Cole",
      "Strip",
      "Garlic / onion intolerance (IBS) — can bring digestives if hard to eliminate"
    ),
    g("Mikey Johnson", "Strip"),
  ],
  t7: [
    g("Katja Zacharko Mcleod", "Strip"),
    g("Garrett Mcleod", "Strip"),
    g("Craig Logan", "Strip"),
    g("Jenna Logan", "Strip"),
    g("Lindsay Giles", "Chicken"),
    g("Angelo Law", "Strip"),
    g("Mat Dahl", "Strip"),
    g("Heather Dahl", "Strip"),
  ],
  t8: [
    g("Peter Burnham", "Strip"),
    g("Wendy Burnham", "Strip"),
    g("Maria Comrie", "Chicken"),
    g("Laurie Comrie", "Strip"),
    g("Doug Latter", "Strip"),
    g("Lorraine Latter", "Strip"),
    g("Monica Dowhaniuk", "Strip"),
    g("Maurice Dowhaniuk", "Chicken"),
  ],
  t9: [
    g("Jason Andrews", "Strip"),
    g("Kaleigh Andrews", "Chicken"),
    g("Carly Trudeau", "Strip"),
    g("Mike Trudeau", "Strip"),
    g("Travis Revitt", "Strip"),
    g("Ty Andrews", "Strip"),
    g("Ali Briggs", "Strip"),
    g("Kate Hanly", "Strip"),
    g("Kris Dahl", "Strip", "Quinoa allergy (minor)"),
  ],
  t10: [
    g("Ron Andrews", "Strip"),
    g("Diane Andrews", "Strip"),
    g("Shirley Revitt", "Strip"),
    g("Larry Revitt", "Strip"),
    g("Rob Johnson", "Strip"),
    g("Bev Andrews Johnson", "Ravioli", "Lacto ovo vegetarian"),
    g("Lorie Andrews", "Chicken"),
    g("Barry Andrews", "Strip"),
  ],
};

let uid = 0;
const buildInitial = () => {
  const seats = {};
  TABLE_META.forEach((t) => {
    const arr = new Array(t.cap).fill(null);
    (SEED[t.id] || []).forEach((p, i) => {
      if (i < t.cap)
        arr[i] = {
          id: `p${++uid}`,
          name: p.name,
          entree: p.entree,
          appetizer: "",
          dessert: "",
          notes: p.notes,
          kids: p.kids,
        };
    });
    seats[t.id] = arr;
  });
  return seats;
};

/* ---------- Saved work from a previous visit ---------- */
const STORAGE_OK = isStorageAvailable();
const SAVED = STORAGE_OK ? loadSaved() : null;

const blankPos = () => Object.fromEntries(TABLE_META.map((t) => [t.id, { x: t.x, y: t.y }]));

const DEFAULT_COURSES = {
  appetizer: "Beet & Pear Salad (V/GF)",
  dessert: "Blueberry Mason Jar Cheesecake",
  kids: "Chicken Fingers, French Fries, Plum Sauce",
};
const DEFAULT_META = { couple: "Andrews and Stuart", date: "" };

const initialSeats = () => {
  const fresh = buildInitial();
  if (!SAVED) return fresh;
  const restored = mergeSeats(SAVED.seats, fresh);
  // New guests must not reuse an id that came back from storage.
  uid = Math.max(uid, highestGuestNumber(restored));
  return restored;
};

/* ---------- Seat geometry, in % of the diagram box ---------- */
function seatLayout(shape, n) {
  const out = [];
  if (shape === "rect") {
    // Head table: seat 1 is the top seat on the right-hand side, then clockwise
    // — down the right side, up the left side, and the last two across the top.
    const topSeats = n >= 6 ? 2 : 0;
    const sideTotal = n - topSeats;
    const rightCount = Math.ceil(sideTotal / 2);
    const leftCount = sideTotal - rightCount;
    const top = 22,
      bottom = 82;
    for (let i = 0; i < rightCount; i++) {
      const t = rightCount === 1 ? 0.5 : i / (rightCount - 1);
      out.push({ x: 68, y: top + t * (bottom - top), side: "right" });
    }
    for (let i = 0; i < leftCount; i++) {
      const t = leftCount === 1 ? 0.5 : i / (leftCount - 1);
      out.push({ x: 32, y: bottom - t * (bottom - top), side: "left" });
    }
    if (topSeats) {
      out.push({ x: 43.5, y: 13, side: "left" });
      out.push({ x: 56.5, y: 13, side: "right" });
    }
    return out;
  }
  const rx = 27,
    ry = 27;
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    const cos = Math.cos(a);
    out.push({
      x: 50 + rx * cos,
      y: 50 + ry * Math.sin(a),
      side: cos >= -0.0001 ? "right" : "left",
    });
  }
  // Keep name plates from stacking on top of each other on busy tables.
  ["right", "left"].forEach((side) => {
    const idx = out
      .map((p, i) => ({ i, y: p.y, side: p.side }))
      .filter((p) => p.side === side)
      .sort((a, b) => a.y - b.y);
    const gap = 9;
    for (let k = 1; k < idx.length; k++) {
      const prev = out[idx[k - 1].i].y;
      if (out[idx[k].i].y - prev < gap) out[idx[k].i].y = prev + gap;
    }
    const over = idx.length ? out[idx[idx.length - 1].i].y - 94 : 0;
    if (over > 0) idx.forEach(({ i }) => (out[i].y -= over));
  });
  return out;
}

const shortName = (name) => {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};
const firstName = (name) => name.split(/\s+/)[0];
const lastName = (name) => name.split(/\s+/).slice(-1)[0];

/* ---------- CSV helpers ---------- */
const q = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (arr) => arr.map(q).join(",");

export default function SeatingPlanner() {
  const [seats, setSeats] = useState(initialSeats);
  const [pos, setPos] = useState(() => mergePos(SAVED && SAVED.pos, blankPos()));
  const [view, setView] = useState("floor");
  const [openTable, setOpenTable] = useState("head");
  const [held, setHeld] = useState(null);
  const [focus, setFocus] = useState(null);
  const [editing, setEditing] = useState(null);
  const [arrange, setArrange] = useState(false);
  const [swapFrom, setSwapFrom] = useState(null);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState([]);
  const [defaults, setDefaults] = useState(() => ({
    ...DEFAULT_COURSES,
    ...((SAVED && SAVED.defaults) || {}),
  }));
  const [meta, setMeta] = useState(() => ({
    ...DEFAULT_META,
    ...((SAVED && SAVED.meta) || {}),
  }));
  const [toast, setToast] = useState("");
  const [savedAt, setSavedAt] = useState((SAVED && SAVED.savedAt) || null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!focus) return;
    const t = setTimeout(() => setFocus(null), 2600);
    return () => clearTimeout(t);
  }, [focus]);

  /* Keep the browser copy in step with the plan, a beat after the last edit. */
  useEffect(() => {
    if (!STORAGE_OK) return;
    const t = setTimeout(() => {
      if (save({ seats, pos, defaults, meta })) setSavedAt(Date.now());
      else setToast("This browser refused to save — export before you close the tab");
    }, 300);
    return () => clearTimeout(t);
  }, [seats, pos, defaults, meta]);

  const resetAll = () => {
    clearSaved();
    uid = 0;
    setSeats(buildInitial());
    setPos(blankPos());
    setDefaults(DEFAULT_COURSES);
    setMeta(DEFAULT_META);
    setHistory([]);
    setHeld(null);
    setEditing(null);
    setFocus(null);
    setSavedAt(null);
    setToast("Back to the original meal sheet");
  };

  const snapshot = () => setHistory((h) => [...h.slice(-24), JSON.stringify(seats)]);
  const undo = () =>
    setHistory((h) => {
      if (!h.length) return h;
      setSeats(JSON.parse(h[h.length - 1]));
      setHeld(null);
      return h.slice(0, -1);
    });

  const tableById = (id) => TABLE_META.find((t) => t.id === id);
  const occupants = (id) => (seats[id] || []).filter(Boolean);
  const totalGuests = useMemo(() => Object.values(seats).flat().filter(Boolean).length, [seats]);
  const flagged = useMemo(
    () => Object.values(seats).flat().filter((p) => p && p.notes.trim()).length,
    [seats]
  );
  const tally = (id) => {
    const t = {};
    occupants(id).forEach((p) => (t[p.entree] = (t[p.entree] || 0) + 1));
    return t;
  };
  const grandTally = useMemo(() => {
    const t = {};
    Object.values(seats)
      .flat()
      .filter(Boolean)
      .forEach((p) => (t[p.entree] = (t[p.entree] || 0) + 1));
    return t;
  }, [seats]);

  /* ---------- Moving guests ---------- */
  const tapSeat = (tableId, seat) => {
    if (!held) {
      if (!seats[tableId][seat]) return;
      setHeld({ tableId, seat });
      return;
    }
    if (held.tableId === tableId && held.seat === seat) {
      setHeld(null);
      return;
    }
    const moving = seats[held.tableId][held.seat];
    const target = seats[tableId][seat];
    snapshot();
    setSeats((prev) => {
      const next = { ...prev, [held.tableId]: [...prev[held.tableId]] };
      if (tableId !== held.tableId) next[tableId] = [...prev[tableId]];
      const a = next[held.tableId][held.seat];
      next[held.tableId][held.seat] = next[tableId][seat];
      next[tableId][seat] = a;
      return next;
    });
    setToast(
      target
        ? `Swapped ${firstName(moving.name)} and ${firstName(target.name)}`
        : `${firstName(moving.name)} → ${tableById(tableId).label}, seat ${seat + 1}`
    );
    setHeld(null);
  };

  const updateGuest = (tableId, seat, patch) => {
    snapshot();
    setSeats((prev) => {
      const next = { ...prev, [tableId]: [...prev[tableId]] };
      next[tableId][seat] = { ...next[tableId][seat], ...patch };
      return next;
    });
  };
  const removeGuest = (tableId, seat) => {
    snapshot();
    setSeats((prev) => {
      const next = { ...prev, [tableId]: [...prev[tableId]] };
      next[tableId][seat] = null;
      return next;
    });
    setEditing(null);
    setHeld(null);
  };
  const addGuest = (tableId, seat) => {
    snapshot();
    setSeats((prev) => {
      const next = { ...prev, [tableId]: [...prev[tableId]] };
      next[tableId][seat] = {
        id: `p${++uid}`,
        name: "New guest",
        entree: "Strip",
        appetizer: "",
        dessert: "",
        notes: "",
        kids: "",
      };
      return next;
    });
    setEditing({ tableId, seat });
  };
  const setCapacity = (tableId, n) => {
    const used = seats[tableId].reduce((m, p, i) => (p ? i + 1 : m), 0);
    const max = tableId === "head" ? 16 : 9;
    const clamped = Math.max(used, Math.min(max, n));
    snapshot();
    setSeats((prev) => {
      const arr = [...prev[tableId]];
      if (clamped > arr.length)
        return { ...prev, [tableId]: [...arr, ...new Array(clamped - arr.length).fill(null)] };
      return { ...prev, [tableId]: arr.slice(0, clamped) };
    });
  };

  /* Swap every guest at one table with every guest at another */
  const swapTables = (aId, bId) => {
    const A = seats[aId] || [];
    const B = seats[bId] || [];
    const gA = A.filter(Boolean);
    const gB = B.filter(Boolean);
    const la = tableById(aId).label;
    const lb = tableById(bId).label;
    if (gA.length > B.length) {
      setToast(`${lb} has only ${B.length} seats — ${la} has ${gA.length} guests`);
      return;
    }
    if (gB.length > A.length) {
      setToast(`${la} has only ${A.length} seats — ${lb} has ${gB.length} guests`);
      return;
    }
    snapshot();
    setSeats((prev) => {
      let na, nb;
      if (A.length === B.length) {
        na = [...B];
        nb = [...A];
      } else {
        na = new Array(A.length).fill(null);
        gB.forEach((p, i) => (na[i] = p));
        nb = new Array(B.length).fill(null);
        gA.forEach((p, i) => (nb[i] = p));
      }
      return { ...prev, [aId]: na, [bId]: nb };
    });
    setHeld(null);
    setToast(`${la} ↔ ${lb} — ${gA.length} and ${gB.length} guests swapped`);
  };

  const pickTableForSwap = (id) => {
    if (!swapFrom) {
      setSwapFrom(id);
      setHeld(null);
      return;
    }
    if (swapFrom === id) {
      setSwapFrom(null);
      return;
    }
    swapTables(swapFrom, id);
    setSwapFrom(null);
  };

  const searchHits = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return [];
    const out = [];
    TABLE_META.forEach((t) =>
      (seats[t.id] || []).forEach((p, i) => {
        if (p && p.name.toLowerCase().includes(s)) out.push({ tableId: t.id, seat: i, guest: p });
      })
    );
    return out.slice(0, 8);
  }, [query, seats]);

  /* ---------- Exports ---------- */
  const buildVenueCSV = () => {
    const L = [];
    L.push(row(["Wedding Meal Choices by Table"]));
    L.push(row(["Couples Names:", meta.couple, "Wedding Date:", meta.date, "Guest Count:", totalGuests]));
    L.push(row(["All guests receive:", defaults.appetizer, "and", defaults.dessert]));
    L.push("");
    TABLE_META.forEach((t) => {
      const list = seats[t.id] || [];
      L.push(row([t.id === "head" ? "HEAD TABLE" : t.label.toUpperCase()]));
      L.push(row(["Seat Number", "Name", "Appetizer", "Entrée", "Dessert", "Allergies"]));
      list.forEach((p, i) =>
        L.push(
          row([
            i + 1,
            p ? p.name : "",
            p ? p.appetizer || "" : "",
            p ? (p.entree === "Kids Meal" ? `Kids Meal — ${p.kids || defaults.kids}` : p.entree) : "",
            p ? p.dessert || "" : "",
            p ? p.notes || "" : "",
          ])
        )
      );
      const tl = tally(t.id);
      L.push(
        row([
          "Total Entrées",
          `Strip: ${tl.Strip || 0}`,
          `Chicken: ${tl.Chicken || 0}`,
          `Ravioli: ${tl.Ravioli || 0}`,
          `Total: ${list.filter(Boolean).length}`,
        ])
      );
      L.push("");
    });
    L.push(row(["GRAND TOTALS"]));
    L.push(row(["Entrée", "Total"]));
    Object.entries(grandTally)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => L.push(row([k, v])));
    L.push(row(["Total Guests", totalGuests]));
    L.push("");
    L.push(row(["ALLERGIES & DIETARY NOTES"]));
    L.push(row(["Table", "Seat", "Name", "Entrée", "Note"]));
    TABLE_META.forEach((t) =>
      (seats[t.id] || []).forEach((p, i) => {
        if (p && p.notes.trim()) L.push(row([t.label, i + 1, p.name, p.entree, p.notes]));
      })
    );
    return L.join("\n");
  };

  const buildFlatCSV = () => {
    const L = [row(["Table", "Seat", "Name", "Appetizer", "Entrée", "Dessert", "Allergies / Dietary"])];
    TABLE_META.forEach((t) =>
      (seats[t.id] || []).forEach((p, i) => {
        if (!p) return;
        L.push(
          row([
            t.label,
            i + 1,
            p.name,
            p.appetizer || defaults.appetizer,
            p.entree === "Kids Meal" ? `Kids Meal — ${p.kids || defaults.kids}` : p.entree,
            p.dessert || defaults.dessert,
            p.notes || "",
          ])
        );
      })
    );
    return L.join("\n");
  };

  const buildEscortCSV = () => {
    const all = [];
    TABLE_META.forEach((t) =>
      (seats[t.id] || []).forEach((p, i) => {
        if (p) all.push({ name: p.name, table: t.label, seat: i + 1, entree: p.entree });
      })
    );
    all.sort((a, b) => lastName(a.name).localeCompare(lastName(b.name)));
    return [row(["Name", "Table", "Seat", "Entrée"])]
      .concat(all.map((a) => row([a.name, a.table, a.seat, a.entree])))
      .join("\n");
  };

  const buildKitchenText = () => {
    const L = [];
    L.push(`MEAL SUMMARY — ${meta.couple || "Wedding"}${meta.date ? " — " + meta.date : ""}`);
    L.push(`Guests seated: ${totalGuests}`);
    L.push("");
    L.push("ENTRÉE COUNTS");
    Object.entries(grandTally)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => L.push(`  ${k}: ${v}`));
    L.push("");
    L.push(`Starter for all: ${defaults.appetizer}`);
    L.push(`Dessert for all: ${defaults.dessert}`);
    L.push("");
    L.push("COUNTS BY TABLE");
    TABLE_META.forEach((t) => {
      const list = occupants(t.id);
      if (!list.length) return;
      L.push(
        `  ${t.label} (${list.length}): ` +
          Object.entries(tally(t.id))
            .map(([k, v]) => `${k} ${v}`)
            .join(", ")
      );
    });
    L.push("");
    L.push("ALLERGIES & DIETARY — read before service");
    TABLE_META.forEach((t) =>
      (seats[t.id] || []).forEach((p, i) => {
        if (p && p.notes.trim())
          L.push(`  ${t.label}, seat ${i + 1} — ${p.name} (${p.entree}): ${p.notes}`);
      })
    );
    return L.join("\n");
  };

  const download = (filename, text) => {
    try {
      const blob = new Blob(["\uFEFF" + text], {
        type: filename.endsWith(".csv") ? "text/csv;charset=utf-8;" : "text/plain;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToast(`Saved ${filename}`);
    } catch (e) {
      setToast("Download blocked here — use Copy instead");
    }
  };
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied to clipboard");
    } catch (e) {
      setToast("Copy blocked — select the text below");
    }
  };

  /* ---------- Floor plan dragging ---------- */
  const floorRef = useRef(null);
  const dragRef = useRef(null);
  const onTablePointerDown = (e, id) => {
    if (!arrange) return;
    e.preventDefault();
    dragRef.current = { id };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onFloorPointerMove = (e) => {
    if (!arrange || !dragRef.current || !floorRef.current) return;
    const r = floorRef.current.getBoundingClientRect();
    setPos((p) => ({
      ...p,
      [dragRef.current.id]: {
        x: Math.max(6, Math.min(94, ((e.clientX - r.left) / r.width) * 100)),
        y: Math.max(6, Math.min(94, ((e.clientY - r.top) / r.height) * 100)),
      },
    }));
  };
  const endDrag = () => (dragRef.current = null);

  const heldGuest = held ? seats[held.tableId][held.seat] : null;

  return (
    <div
      style={{ background: C.bg, color: C.text, fontFamily: "'Karla', ui-sans-serif, system-ui" }}
      className="min-h-screen w-full"
    >
      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        .disp { font-family: 'Bodoni Moda', Georgia, serif; }
        .lift { transition: transform .16s ease, background .16s ease, border-color .16s ease; }
        .lift:active { transform: scale(.97); }
        .floorfill { height: calc(100vh - 172px); height: calc(100dvh - 172px); display: flex; flex-direction: column; }
        .floorfill-held { height: calc(100vh - 224px); height: calc(100dvh - 224px); }
        .breathe { animation: breathe 1.8s ease-in-out infinite; }
        @keyframes breathe { 0%,100% { border-color: #4A5560 } 50% { border-color: #E8E2D4 } }
        .glow { animation: glow 1.2s ease-in-out 2; }
        @keyframes glow { 0%,100% { box-shadow: 0 0 0 0 rgba(232,226,212,0) } 50% { box-shadow: 0 0 0 4px rgba(232,226,212,.35) } }
        input, select, textarea { font-family: inherit; }
        select { -webkit-appearance: none; appearance: none; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        @media (prefers-reduced-motion: reduce) { .breathe, .glow { animation: none } .lift { transition: none } }
      `}</style>

      <header
        className="sticky top-0 z-30 px-4 pt-4 pb-3"
        style={{ background: C.bg, borderBottom: `1px solid ${C.lineSoft}` }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-xs uppercase" style={{ color: C.muted, letterSpacing: "0.18em" }}>
              Seating &amp; meals
            </div>
            <h1 className="disp text-2xl leading-tight" style={{ color: C.ivory }}>
              {meta.couple || "The Reception"}
            </h1>
          </div>
          <div className="text-right">
            <div className="disp text-2xl leading-none">{totalGuests}</div>
            <div className="text-xs" style={{ color: C.muted }}>
              seated
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a guest"
            className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
            style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.text }}
          />
          {history.length > 0 && (
            <button
              onClick={undo}
              className="lift rounded-full px-3 py-2 text-xs"
              style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.muted }}
            >
              Undo
            </button>
          )}
        </div>

        {searchHits.length > 0 && (
          <div
            className="mt-2 rounded-xl overflow-hidden"
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
          >
            {searchHits.map((h) => (
              <button
                key={h.guest.id}
                onClick={() => {
                  setOpenTable(h.tableId);
                  setView("table");
                  setFocus({ tableId: h.tableId, seat: h.seat });
                  setQuery("");
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-sm"
                style={{ borderBottom: `1px solid ${C.lineSoft}` }}
              >
                <span>{h.guest.name}</span>
                <span className="text-xs" style={{ color: C.muted }}>
                  {tableById(h.tableId).label} · seat {h.seat + 1}
                </span>
              </button>
            ))}
          </div>
        )}
      </header>

      {heldGuest && (
        <div
          className="sticky z-20 mx-4 mt-3 rounded-xl px-3 py-2 flex items-center justify-between"
          style={{ top: 124, background: C.ivory, color: "#1A1A1A" }}
        >
          <div className="text-sm leading-tight">
            <span className="font-bold">{heldGuest.name}</span> is in hand — tap any seat to drop or
            swap.
          </div>
          <button
            onClick={() => setHeld(null)}
            className="ml-3 shrink-0 rounded-full px-3 py-1 text-xs"
            style={{ background: "#1A1A1A", color: C.ivory }}
          >
            Cancel
          </button>
        </div>
      )}

      <main className={view === "floor" ? "pt-2" : "px-4 pt-4 pb-24"}>
        {view === "floor" && (
          <FloorPlan
            floorRef={floorRef}
            pos={pos}
            seats={seats}
            tally={tally}
            arrange={arrange}
            setArrange={(v) => {
              setArrange(v);
              if (v) setSwapFrom(null);
            }}
            held={held}
            swapFrom={swapFrom}
            setSwapFrom={setSwapFrom}
            onSwapPick={pickTableForSwap}
            onTapSeat={tapSeat}
            onOpen={(id) => {
              setOpenTable(id);
              setView("table");
            }}
            onPointerDownTable={onTablePointerDown}
            onPointerMove={onFloorPointerMove}
            onPointerUp={endDrag}
          />
        )}

        {view === "table" && (
          <TableDetail
            tableId={openTable}
            meta={tableById(openTable)}
            list={seats[openTable]}
            held={held}
            focus={focus}
            defaults={defaults}
            onBack={() => setView("floor")}
            onPick={setOpenTable}
            onTapSeat={tapSeat}
            onEdit={(t, s) => setEditing({ tableId: t, seat: s })}
            onAdd={addGuest}
            onCapacity={setCapacity}
            onSwapWhole={(id) => {
              setSwapFrom(id);
              setArrange(false);
              setView("floor");
            }}
            tally={tally}
          />
        )}

        {view === "export" && (
          <ExportPanel
            meta={meta}
            setMeta={setMeta}
            defaults={defaults}
            setDefaults={setDefaults}
            grandTally={grandTally}
            totalGuests={totalGuests}
            flagged={flagged}
            builders={{
              venue: buildVenueCSV,
              flat: buildFlatCSV,
              escort: buildEscortCSV,
              kitchen: buildKitchenText,
            }}
            download={download}
            copy={copy}
            storageOk={STORAGE_OK}
            savedAt={savedAt}
            onReset={resetAll}
          />
        )}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex"
        style={{ background: C.surface, borderTop: `1px solid ${C.line}` }}
      >
        {[
          { k: "floor", label: "Floor plan" },
          { k: "table", label: "Tables" },
          { k: "export", label: "Export" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setView(t.k)}
            className="flex-1 py-3 text-sm"
            style={{
              color: view === t.k ? C.ivory : C.muted,
              borderTop: `2px solid ${view === t.k ? C.ivory : "transparent"}`,
              marginTop: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {toast && (
        <div
          className="fixed bottom-16 left-1/2 z-40 -translate-x-1/2 rounded-full px-4 py-2 text-sm"
          style={{ background: C.ivory, color: "#1A1A1A" }}
        >
          {toast}
        </div>
      )}

      {editing && seats[editing.tableId][editing.seat] && (
        <GuestEditor
          tableLabel={tableById(editing.tableId).label}
          seat={editing.seat}
          guest={seats[editing.tableId][editing.seat]}
          defaults={defaults}
          onChange={(patch) => updateGuest(editing.tableId, editing.seat, patch)}
          onRemove={() => removeGuest(editing.tableId, editing.seat)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/* ---------------- Floor plan ---------------- */
function floorSeatLayout(shape, n, meta) {
  const out = [];
  if (shape === "rect") {
    const topSeats = n >= 6 ? 2 : 0;
    const sideTotal = n - topSeats;
    const rightCount = Math.ceil(sideTotal / 2);
    const leftCount = sideTotal - rightCount;
    const top = 6,
      bottom = 94;
    const offX = 4; // % of table width, outside each long edge
    for (let i = 0; i < rightCount; i++) {
      const t = rightCount === 1 ? 0.5 : i / (rightCount - 1);
      out.push({ x: 100 + offX, y: top + t * (bottom - top), side: "right" });
    }
    for (let i = 0; i < leftCount; i++) {
      const t = leftCount === 1 ? 0.5 : i / (leftCount - 1);
      out.push({ x: -offX, y: bottom - t * (bottom - top), side: "left" });
    }
    if (topSeats) {
      // Match the pitch used down the sides, converted into the table's own units
      const pitchY = (((bottom - top) / 100) * meta.h) / Math.max(1, rightCount - 1);
      const halfSep = (((pitchY * CANVAS_ASPECT) / 2) / meta.w) * 100;
      const offY = (((offX / 100) * meta.w) / CANVAS_ASPECT / meta.h) * 100;
      out.push({ x: 50 - halfSep, y: -offY, side: "left" });
      out.push({ x: 50 + halfSep, y: -offY, side: "right" });
    }
    return out;
  }
  const r = 62;
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    const cos = Math.cos(a);
    out.push({
      x: 50 + r * cos,
      y: 50 + r * Math.sin(a),
      side: cos >= -0.0001 ? "right" : "left",
    });
  }
  return out;
}

function FloorPlan({
  floorRef,
  pos,
  seats,
  tally,
  arrange,
  setArrange,
  held,
  swapFrom,
  setSwapFrom,
  onSwapPick,
  onTapSeat,
  onOpen,
  onPointerDownTable,
  onPointerMove,
  onPointerUp,
}) {
  const [zoom, setZoom] = useState(1);
  const [cw, setCw] = useState(0);
  useEffect(() => {
    const el = floorRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => setCw(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [floorRef]);

  const swapping = !!swapFrom;
  const fromLabel = swapping ? TABLE_META.find((t) => t.id === swapFrom).label : "";
  const font = cw * 0.0118;
  const showNames = font >= 6;

  return (
    <div className={`floorfill ${held ? "floorfill-held" : ""}`}>
      <div className="flex items-center justify-between gap-2 px-4 pb-2">
        <p className="text-xs truncate" style={{ color: C.muted }}>
          {arrange
            ? "Drag a table to reposition it."
            : swapping
            ? `Tap the table to trade with ${fromLabel}.`
            : held
            ? "Tap any seat to drop or swap."
            : "Tap a guest to pick them up."}
        </p>
        {swapping ? (
          <button
            onClick={() => setSwapFrom(null)}
            className="lift shrink-0 rounded-full px-3 py-1 text-xs"
            style={{ background: C.surface, color: C.muted, border: `1px solid ${C.line}` }}
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={() => setArrange(!arrange)}
            className="lift shrink-0 rounded-full px-3 py-1 text-xs"
            style={{
              background: arrange ? C.ivory : C.surface,
              color: arrange ? "#1A1A1A" : C.muted,
              border: `1px solid ${arrange ? C.ivory : C.line}`,
            }}
          >
            {arrange ? "Done" : "Move tables"}
          </button>
        )}
      </div>

      <div className="relative" style={{ flex: 1, minHeight: 0 }}>
        <div
          className="h-full overflow-auto"
          style={{
            background: C.floor,
            borderTop: `1px solid ${C.line}`,
            borderBottom: `1px solid ${C.line}`,
            WebkitOverflowScrolling: "touch",
          }}
        >
        <div
          ref={floorRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className="relative"
          style={{
            width: `${zoom * 100}%`,
            aspectRatio: "100 / 115",
            touchAction: arrange ? "none" : "auto",
          }}
        >
          <svg viewBox="0 0 100 115" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <rect x="0" y="0" width="100" height="2.6" fill="#B4B0A8" />
            <g fill="none" stroke={C.floorLine} strokeWidth="1.4" vectorEffect="non-scaling-stroke">
              <path d="M1 2.6 L1 114 L99 114 L99 2.6" />
            </g>
            <path d="M86 114 L99 114 L99 99 Z" fill="#D8D5CE" />
          </svg>

          {TABLE_META.map((t) => {
            const p = pos[t.id];
            const list = seats[t.id] || [];
            const n = list.filter(Boolean).length;
            const tl = tally(t.id);
            const isRect = t.shape === "rect";
            const isSource = swapFrom === t.id;
            const holdingHere = held && held.tableId === t.id;
            const pts = floorSeatLayout(t.shape, list.length, t);
            return (
              <div
                key={t.id}
                className="absolute"
                onPointerDown={(e) => onPointerDownTable(e, t.id)}
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: isRect ? `${t.w}%` : "9.2%",
                  height: isRect ? `${t.h}%` : undefined,
                  aspectRatio: isRect ? undefined : "1 / 1",
                  transform: "translate(-50%, -50%)",
                  zIndex: isSource || holdingHere ? 6 : 2,
                }}
              >
                <button
                  onClick={() => {
                    if (arrange) return;
                    if (swapping) onSwapPick(t.id);
                    else onOpen(t.id);
                  }}
                  className="absolute inset-0 lift flex flex-col items-center justify-center"
                  style={{
                    borderRadius: isRect ? 6 : "50%",
                    background: isSource ? "#2F3942" : n ? "#FFFFFF" : "#EAE7E0",
                    border: `${isSource ? 2 : 1.5}px ${swapping && !isSource ? "dashed" : "solid"} ${
                      isSource ? "#2F3942" : swapping ? "#6E7A86" : "#B9B4AA"
                    }`,
                    boxShadow: n ? "0 1px 0 rgba(0,0,0,.10)" : "none",
                    color: isSource ? C.ivory : "#1A1A1A",
                    cursor: arrange ? "grab" : "pointer",
                    transform: `scale(${isSource ? 1.05 : 1})`,
                  }}
                >
                  <span
                    className="disp leading-none"
                    style={{ fontSize: Math.max(9, font * 1.5) }}
                  >
                    {t.short}
                  </span>
                  {n > 0 && (
                    <span
                      style={{
                        fontSize: Math.max(6, font * 0.85),
                        color: isSource ? "#B7BFC7" : "#6B665C",
                        marginTop: 1,
                      }}
                    >
                      {n} seated
                    </span>
                  )}
                  {!showNames && n > 0 && (
                    <span className="mt-1 flex gap-0.5 flex-wrap justify-center px-1">
                      {Object.entries(tl).map(([k, v]) => (
                        <span
                          key={k}
                          className="rounded-full"
                          style={{
                            width: 5,
                            height: 5,
                            background: mealColor(k),
                            opacity: 0.35 + Math.min(0.65, v / 10),
                          }}
                        />
                      ))}
                    </span>
                  )}
                </button>

                {showNames &&
                  list.map((g2, i) => {
                    const sp = pts[i];
                    if (!sp) return null;
                    const isHeld = held && held.tableId === t.id && held.seat === i;
                    const right = sp.side === "right";
                    const base = {
                      position: "absolute",
                      top: `${sp.y}%`,
                      transform: "translateY(-50%)",
                      zIndex: isHeld ? 8 : 3,
                    };
                    if (right) base.left = `${sp.x}%`;
                    else base.right = `${100 - sp.x}%`;

                    if (!g2)
                      return (
                        <button
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (arrange || swapping) return;
                            if (held) onTapSeat(t.id, i);
                          }}
                          title={`Seat ${i + 1} — empty`}
                          className="disp flex items-center justify-center"
                          style={{
                            ...base,
                            minWidth: Math.max(9, font * 1.25),
                            height: Math.max(9, font * 1.25),
                            padding: `0 ${font * 0.15}px`,
                            borderRadius: 999,
                            fontSize: font * 0.85,
                            lineHeight: 1,
                            color: held ? "#3F4A34" : "rgba(0,0,0,.34)",
                            background: held ? "rgba(126,138,110,.35)" : "rgba(255,255,255,.55)",
                            border: `1px dashed ${held ? "#5E6B4E" : "rgba(0,0,0,.22)"}`,
                          }}
                        >
                          {i + 1}
                        </button>
                      );

                    return (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (arrange) return;
                          if (swapping) onSwapPick(t.id);
                          else onTapSeat(t.id, i);
                        }}
                        className="lift"
                        style={{
                          ...base,
                          display: "flex",
                          alignItems: "center",
                          flexDirection: right ? "row" : "row-reverse",
                          gap: Math.max(2, font * 0.3),
                          whiteSpace: "nowrap",
                          fontSize: font,
                          lineHeight: 1.1,
                          padding: `${font * 0.2}px ${font * 0.45}px`,
                          borderRadius: 999,
                          background: isHeld ? "#1F242A" : "rgba(255,255,255,.94)",
                          color: isHeld ? C.ivory : "#2A2723",
                          border: `1px solid ${isHeld ? "#1F242A" : "rgba(0,0,0,.14)"}`,
                          boxShadow: "0 1px 2px rgba(0,0,0,.07)",
                        }}
                      >
                        <span
                          className="shrink-0 rounded-full"
                          style={{
                            width: font * 0.6,
                            height: font * 0.6,
                            background: mealColor(g2.entree),
                          }}
                        />
                        <span
                          className="disp shrink-0"
                          style={{
                            fontSize: font * 0.85,
                            color: isHeld ? "rgba(232,226,212,.55)" : "rgba(0,0,0,.36)",
                          }}
                        >
                          {i + 1}
                        </span>
                        {shortName(g2.name)}
                        {g2.notes.trim() && (
                          <span
                            className="shrink-0 flex items-center justify-center disp"
                            style={{
                              width: font * 1.05,
                              height: font * 1.05,
                              borderRadius: 2,
                              background: "#1F242A",
                              color: "#FFFFFF",
                              fontSize: font * 0.82,
                              lineHeight: 1,
                              fontWeight: 700,
                            }}
                          >
                            !
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </div>
        </div>

        <div
          className="absolute flex items-center gap-2 rounded-full px-2.5 py-1"
          style={{
            left: 10,
            top: 10,
            background: "rgba(255,255,255,.92)",
            border: "1px solid rgba(0,0,0,.12)",
            fontSize: 10,
            color: "#4A453D",
          }}
        >
          {Object.entries(MEAL_COLORS).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1">
              <span className="rounded-full" style={{ width: 7, height: 7, background: v }} />
              {k === "Kids Meal" ? "Kids" : k}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span
              className="disp flex items-center justify-center"
              style={{
                width: 11,
                height: 11,
                borderRadius: 2,
                background: "#1F242A",
                color: "#FFFFFF",
                fontSize: 8,
                lineHeight: 1,
                fontWeight: 700,
              }}
            >
              !
            </span>
            Dietary
          </span>
        </div>

        <div
          className="absolute flex items-center gap-1 rounded-full p-1"
          style={{
            right: 10,
            bottom: 10,
            background: "rgba(255,255,255,.92)",
            border: "1px solid rgba(0,0,0,.12)",
          }}
        >
          <button
            onClick={() => setZoom((z) => Math.max(1, +(z - 0.4).toFixed(1)))}
            className="lift rounded-full"
            style={{ width: 28, height: 28, color: "#2A2723", fontSize: 15 }}
          >
            –
          </button>
          <button
            onClick={() => setZoom(1)}
            className="lift rounded-full px-1"
            style={{ height: 28, color: "#6B665C", fontSize: 10, minWidth: 34 }}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(4, +(z + 0.4).toFixed(1)))}
            className="lift rounded-full"
            style={{ width: 28, height: 28, color: "#2A2723", fontSize: 15 }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Table detail ---------------- */
function TableDetail({
  tableId,
  meta,
  list,
  held,
  focus,
  defaults,
  onBack,
  onPick,
  onTapSeat,
  onEdit,
  onAdd,
  onCapacity,
  onSwapWhole,
  tally,
}) {
  const n = list.length;
  const isRect = meta.shape === "rect";
  const pts = useMemo(() => seatLayout(meta.shape, n), [meta.shape, n]);
  const tl = tally(tableId);
  const seated = list.filter(Boolean).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
        {TABLE_META.map((t) => (
          <button
            key={t.id}
            onClick={() => onPick(t.id)}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs lift"
            style={{
              background: t.id === tableId ? C.ivory : C.surface,
              color: t.id === tableId ? "#1A1A1A" : C.muted,
              border: `1px solid ${t.id === tableId ? C.ivory : C.line}`,
            }}
          >
            {t.short}
          </button>
        ))}
      </div>

      <div className="flex items-end justify-between mb-1">
        <h2 className="disp text-2xl" style={{ color: C.ivory }}>
          {meta.label}
        </h2>
        <div className="text-xs" style={{ color: C.muted }}>
          {seated} of {n} seats
        </div>
      </div>
      <p className="text-xs mb-4" style={{ color: C.muted }}>
        {isRect
          ? "Seat 1 is the top seat on the right side, then clockwise — the last two sit across the top."
          : "Seat 1 sits at the right; numbers run clockwise."}
      </p>

      {/* Diagram with name plates */}
      <div
        className="relative w-full rounded-2xl mb-4"
        style={{
          aspectRatio: isRect ? "0.92 / 1" : "1 / 1",
          background: C.surface,
          border: `1px solid ${C.line}`,
        }}
      >
        <div
          className="absolute"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: isRect ? "30%" : "40%",
            height: isRect ? "68%" : "40%",
            borderRadius: isRect ? 10 : "50%",
            background: C.surfaceUp,
            border: `1px solid ${C.line}`,
          }}
        />
        <div
          className="absolute disp"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            color: C.muted,
            fontSize: "1.5rem",
          }}
        >
          {meta.short}
        </div>

        {list.map((p, i) => {
          const pt = pts[i];
          const isHeld = held && held.tableId === tableId && held.seat === i;
          const isFocus = focus && focus.tableId === tableId && focus.seat === i;
          const right = pt.side === "right";
          const box = {
            position: "absolute",
            top: `${pt.y}%`,
            transform: "translateY(-50%)",
            maxWidth: right ? `${Math.max(24, 98 - pt.x)}%` : `${Math.max(24, pt.x - 2)}%`,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 8px",
            borderRadius: 999,
            background: isHeld ? C.ivory : p ? C.surfaceUp : "transparent",
            border: `1px ${p ? "solid" : "dashed"} ${isHeld ? C.ivory : C.line}`,
            color: isHeld ? "#1A1A1A" : p ? C.text : C.muted,
            flexDirection: right ? "row" : "row-reverse",
          };
          if (right) box.left = `${pt.x}%`;
          else box.right = `${100 - pt.x}%`;

          return (
            <button
              key={i}
              onClick={() => (p || held ? onTapSeat(tableId, i) : onAdd(tableId, i))}
              className={`lift ${held && !isHeld ? "breathe" : ""} ${isFocus ? "glow" : ""}`}
              style={box}
            >
              <span
                className="disp shrink-0 rounded-full flex items-center justify-center"
                style={{
                  width: 18,
                  height: 18,
                  fontSize: "0.62rem",
                  background: p ? mealColor(p.entree) : "transparent",
                  color: p ? "#15100F" : C.muted,
                  border: p ? "none" : `1px dashed ${C.line}`,
                }}
              >
                {i + 1}
              </span>
              <span
                className="truncate"
                style={{ fontSize: "0.72rem", lineHeight: 1.15, fontWeight: 500 }}
              >
                {p ? shortName(p.name) : "Empty"}
              </span>
              {p && p.notes.trim() && (
                <span
                  className="shrink-0 flex items-center justify-center disp"
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: isHeld ? "#1A1A1A" : C.ivory,
                    color: isHeld ? C.ivory : "#1A1A1A",
                    fontSize: 9,
                    lineHeight: 1,
                    fontWeight: 700,
                  }}
                >
                  !
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          {Object.entries(tl).map(([k, v]) => (
            <span
              key={k}
              className="rounded-full px-2.5 py-1 text-xs"
              style={{ background: C.surface, border: `1px solid ${C.line}` }}
            >
              <span
                className="inline-block rounded-full mr-1.5 align-middle"
                style={{ width: 7, height: 7, background: mealColor(k) }}
              />
              {k} {v}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            onClick={() => onCapacity(tableId, n - 1)}
            className="lift rounded-full w-8 h-8"
            style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.muted }}
          >
            –
          </button>
          <span className="text-xs" style={{ color: C.muted }}>
            seats
          </span>
          <button
            onClick={() => onCapacity(tableId, n + 1)}
            className="lift rounded-full w-8 h-8"
            style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.muted }}
          >
            +
          </button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        {list.map((p, i) => {
          const isHeld = held && held.tableId === tableId && held.seat === i;
          const isFocus = focus && focus.tableId === tableId && focus.seat === i;
          return (
            <div
              key={i}
              className={isFocus ? "glow" : ""}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                background: isHeld ? C.surfaceUp : C.surface,
                borderBottom: i < list.length - 1 ? `1px solid ${C.lineSoft}` : "none",
              }}
            >
              <button
                onClick={() => (p || held ? onTapSeat(tableId, i) : onAdd(tableId, i))}
                className="flex items-center gap-3 flex-1 text-left min-w-0"
              >
                <span
                  className="disp shrink-0 rounded-full flex items-center justify-center"
                  style={{
                    width: 26,
                    height: 26,
                    fontSize: ".7rem",
                    background: p ? mealColor(p.entree) : "transparent",
                    color: p ? "#15100F" : C.muted,
                    border: p ? "none" : `1px dashed ${C.line}`,
                  }}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm">
                    {p ? p.name : <span style={{ color: C.muted }}>Empty — tap to add</span>}
                  </span>
                  {p && (
                    <span className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
                      {p.notes.trim() && (
                        <span
                          className="shrink-0 flex items-center justify-center disp"
                          style={{
                            width: 13,
                            height: 13,
                            borderRadius: 2,
                            background: C.ivory,
                            color: "#1A1A1A",
                            fontSize: 10,
                            lineHeight: 1,
                            fontWeight: 700,
                          }}
                        >
                          !
                        </span>
                      )}
                      <span className="truncate">
                        {p.entree === "Kids Meal" ? p.kids || defaults.kids : p.entree}
                        {p.notes.trim() ? ` · ${p.notes}` : ""}
                      </span>
                    </span>
                  )}
                </span>
              </button>
              {p && (
                <button
                  onClick={() => onEdit(tableId, i)}
                  className="shrink-0 rounded-full px-2.5 py-1 text-xs lift"
                  style={{ background: C.surfaceUp, border: `1px solid ${C.line}`, color: C.muted }}
                >
                  Edit
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onSwapWhole(tableId)}
          className="flex-1 rounded-full py-3 text-sm lift"
          style={{ background: C.surfaceUp, border: `1px solid ${C.line}`, color: C.text }}
        >
          Swap whole table
        </button>
        <button
          onClick={onBack}
          className="flex-1 rounded-full py-3 text-sm lift"
          style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.muted }}
        >
          Floor plan
        </button>
      </div>
    </div>
  );
}

/* ---------------- Guest editor ---------------- */
function GuestEditor({ tableLabel, seat, guest, defaults, onChange, onRemove, onClose }) {
  const field = {
    background: C.surfaceUp,
    border: `1px solid ${C.line}`,
    color: C.text,
    borderRadius: 10,
    padding: "10px 12px",
    width: "100%",
    fontSize: 14,
    outline: "none",
  };
  const Label = ({ children }) => (
    <div className="text-xs mb-1.5 mt-4 uppercase" style={{ color: C.muted, letterSpacing: ".12em" }}>
      {children}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,.6)" }}
    >
      <div
        className="w-full sm:max-w-md max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5"
        style={{ background: C.surface, border: `1px solid ${C.line}` }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase" style={{ color: C.muted, letterSpacing: ".14em" }}>
              {tableLabel} · seat {seat + 1}
            </div>
            <h3 className="disp text-xl mt-0.5" style={{ color: C.ivory }}>
              {guest.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-xs"
            style={{ background: C.surfaceUp, border: `1px solid ${C.line}`, color: C.muted }}
          >
            Done
          </button>
        </div>

        <Label>Name</Label>
        <input style={field} value={guest.name} onChange={(e) => onChange({ name: e.target.value })} />

        <Label>Entrée</Label>
        <div className="flex flex-wrap gap-2">
          {PACKAGE_ENTREES.map((m) => (
            <button
              key={m}
              onClick={() => onChange({ entree: m })}
              className="rounded-full px-3 py-2 text-sm lift"
              style={{
                background: guest.entree === m ? mealColor(m) : C.surfaceUp,
                color: guest.entree === m ? "#15100F" : C.text,
                border: `1px solid ${guest.entree === m ? mealColor(m) : C.line}`,
              }}
            >
              {m}
            </button>
          ))}
        </div>
        <select
          style={{ ...field, marginTop: 8 }}
          value={OTHER_ENTREES.includes(guest.entree) ? guest.entree : ""}
          onChange={(e) => e.target.value && onChange({ entree: e.target.value })}
        >
          <option value="">Off-package entrée (surcharge)…</option>
          {OTHER_ENTREES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {guest.entree === "Kids Meal" && (
          <>
            <Label>Kids plate</Label>
            <select
              style={field}
              value={guest.kids || defaults.kids}
              onChange={(e) => onChange({ kids: e.target.value })}
            >
              {KIDS_MEALS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </>
        )}

        <Label>Allergies &amp; dietary notes</Label>
        <textarea
          style={{ ...field, minHeight: 70, resize: "vertical" }}
          value={guest.notes}
          placeholder="Nothing noted"
          onChange={(e) => onChange({ notes: e.target.value })}
        />

        <Label>Starter — only if different from everyone else</Label>
        <select style={field} value={guest.appetizer} onChange={(e) => onChange({ appetizer: e.target.value })}>
          <option value="">Same as all guests — {defaults.appetizer}</option>
          {APPETIZERS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <Label>Dessert — only if different</Label>
        <select style={field} value={guest.dessert} onChange={(e) => onChange({ dessert: e.target.value })}>
          <option value="">Same as all guests — {defaults.dessert}</option>
          {DESSERTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <button
          onClick={onRemove}
          className="mt-6 w-full rounded-full py-3 text-sm lift"
          style={{ background: "transparent", border: `1px solid ${C.line}`, color: "#C2554A" }}
        >
          Remove from seat
        </button>
      </div>
    </div>
  );
}

/* ---------------- Export ---------------- */
function ExportPanel({
  meta,
  setMeta,
  defaults,
  setDefaults,
  grandTally,
  totalGuests,
  flagged,
  builders,
  download,
  copy,
  storageOk,
  savedAt,
  onReset,
}) {
  const [preview, setPreview] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const field = {
    background: C.surfaceUp,
    border: `1px solid ${C.line}`,
    color: C.text,
    borderRadius: 10,
    padding: "10px 12px",
    width: "100%",
    fontSize: 14,
    outline: "none",
  };

  const files = [
    {
      key: "venue",
      title: "Venue meal sheet",
      note: "Same block-by-block layout as the caterer's spreadsheet, plus a dietary list at the end.",
      file: "wedding-meal-choices-by-table.csv",
    },
    {
      key: "flat",
      title: "One row per guest",
      note: "Table, seat, name, courses and notes — easy to sort or paste anywhere.",
      file: "guest-meal-list.csv",
    },
    {
      key: "escort",
      title: "Escort card list",
      note: "Alphabetical by last name with table and seat, for place cards and the entry display.",
      file: "escort-cards.csv",
    },
    {
      key: "kitchen",
      title: "Kitchen summary",
      note: "Counts by table and every allergy on one page for the chef and captain.",
      file: "kitchen-summary.txt",
    },
  ];

  return (
    <div>
      <div className="rounded-2xl p-4 mb-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="flex items-baseline justify-between">
          <h2 className="disp text-xl" style={{ color: C.ivory }}>
            Final counts
          </h2>
          <span className="text-xs" style={{ color: C.muted }}>
            {totalGuests} guests · {flagged} dietary notes
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {Object.entries(grandTally)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{k}</span>
                  <span style={{ color: C.muted }}>{v}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: C.surfaceUp }}>
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${(v / Math.max(1, totalGuests)) * 100}%`, background: mealColor(k) }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <h2 className="disp text-xl mb-3" style={{ color: C.ivory }}>
          Sheet details
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <input
            style={field}
            value={meta.couple}
            placeholder="Couple's names"
            onChange={(e) => setMeta({ ...meta, couple: e.target.value })}
          />
          <input
            style={field}
            value={meta.date}
            placeholder="Wedding date"
            onChange={(e) => setMeta({ ...meta, date: e.target.value })}
          />
        </div>
        <div className="text-xs mt-3 mb-1.5 uppercase" style={{ color: C.muted, letterSpacing: ".12em" }}>
          Starter for all guests
        </div>
        <select
          style={field}
          value={defaults.appetizer}
          onChange={(e) => setDefaults({ ...defaults, appetizer: e.target.value })}
        >
          {APPETIZERS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <div className="text-xs mt-3 mb-1.5 uppercase" style={{ color: C.muted, letterSpacing: ".12em" }}>
          Dessert for all guests
        </div>
        <select
          style={field}
          value={defaults.dessert}
          onChange={(e) => setDefaults({ ...defaults, dessert: e.target.value })}
        >
          {DESSERTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {files.map((f) => (
        <div key={f.key} className="rounded-2xl p-4 mb-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <h3 className="text-base" style={{ color: C.text }}>
            {f.title}
          </h3>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: C.muted }}>
            {f.note}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => download(f.file, builders[f.key]())}
              className="flex-1 rounded-full py-2.5 text-sm lift"
              style={{ background: C.ivory, color: "#1A1A1A" }}
            >
              Download
            </button>
            <button
              onClick={() => copy(builders[f.key]())}
              className="rounded-full px-4 py-2.5 text-sm lift"
              style={{ background: C.surfaceUp, border: `1px solid ${C.line}`, color: C.text }}
            >
              Copy
            </button>
            <button
              onClick={() => setPreview(preview === f.key ? null : f.key)}
              className="rounded-full px-4 py-2.5 text-sm lift"
              style={{ background: C.surfaceUp, border: `1px solid ${C.line}`, color: C.muted }}
            >
              {preview === f.key ? "Hide" : "View"}
            </button>
          </div>
          {preview === f.key && (
            <textarea
              readOnly
              value={builders[f.key]()}
              className="mt-3 w-full text-xs"
              style={{
                background: C.bg,
                color: C.muted,
                border: `1px solid ${C.line}`,
                borderRadius: 10,
                padding: 10,
                height: 220,
                fontFamily: "ui-monospace, monospace",
                whiteSpace: "pre",
              }}
            />
          )}
        </div>
      ))}

      <div
        className="rounded-2xl p-4 mt-4 mb-2"
        style={{ background: C.surface, border: `1px solid ${C.line}` }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="disp text-xl" style={{ color: C.ivory }}>
            Saved on this device
          </h2>
          {storageOk && savedAt && (
            <span className="text-xs shrink-0" style={{ color: C.muted }}>
              Saved {new Date(savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed mt-2" style={{ color: C.muted }}>
          {storageOk
            ? "Every change is kept in this browser, so closing the tab or reloading picks up right where you left off. It never leaves this device — another phone or laptop starts from the original sheet, so export the CSVs before handing anything to the venue."
            : "This browser is blocking local storage, so changes will disappear on reload. Export the CSVs before you close the tab."}
        </p>
        <p className="text-xs leading-relaxed mt-2" style={{ color: C.muted }}>
          CSV files open straight into Excel or Google Sheets. If Download is blocked, use Copy and
          paste into a blank sheet.
        </p>
        <button
          onClick={() => {
            if (!confirmReset) {
              setConfirmReset(true);
              return;
            }
            setConfirmReset(false);
            onReset();
          }}
          onBlur={() => setConfirmReset(false)}
          className="lift mt-3 rounded-full px-4 py-2 text-xs"
          style={{
            background: confirmReset ? C.ivory : C.surfaceUp,
            color: confirmReset ? "#1A1A1A" : C.muted,
            border: `1px solid ${C.line}`,
          }}
        >
          {confirmReset ? "Tap again — this erases every change" : "Reset to the original meal sheet"}
        </button>
      </div>
    </div>
  );
}
