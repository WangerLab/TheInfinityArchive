# PROJEKT_KONTEXT

High-level architecture, current sprint state, and external service IDs
for The Infinity Archive. Updated at the end of every sprint.

## Purpose

Personal reading tracker for Tim's curated Warhammer 40,000 reading
journey (Black Library Grand Reading Project, BL-GRP). Tracks progress
across ~108 books in 8 thematic phases, with recursive omnibus
handling, skull ratings, and per-book notes.

Single user. Built properly anyway — auth, real backend, sane
architecture.

## Current Sprint (last completed)

Chronicle-Interview — Fidelity-Fix, Opus-Wechsel, schwebendes Interview-Modal — COMPLETE (Desktop). HEAD `144f5c1` on main. Neun Commits, alle live-grün und live abgenommen. Base `a84d99f`.

**Standouts als eigener gold-Kasten (`08b1b4d`):** Die Standouts waren eine nackte graue Liste im Chronicle-Container (`text-slate-400 italic`), schlecht lesbar. Zu eigenem gold-getöntem Kasten (`bg-gold/5 border-gold/20`, Star-Icon) hochgezogen, strukturell gespiegelt vom plasma Resonant-Kasten, zwischen Chronicle-Prosa und Resonant sitzend. Die defensive `standout_moments`/`standout_moment`-Ableitung in den Komponenten-Body gehoben (eine Quelle statt Inline-IIFE).

**Chronicle-Länge folgt Input (`d829e31`):** Die `resonance`-Schema-Beschreibung befahl feste „2-3 paragraphs", was bei dünnem Input Halluzination erzwang (der APPEND-Bug: eine Szenennotiz → zwei erfundene Absätze). Umgeschrieben auf „FIDELITY OVER LENGTH, length follows input, add nothing not gestured at". `standout_moments` `minItems` 1→0.

**Opus 4.8 (`ce334c1`):** `MODEL` von legacy `claude-sonnet-4-6` auf `claude-opus-4-8`. Seltener, qualitätskritischer Call → Modellqualität schlägt Token-Kosten. Live-Vergleich bestätigte: Opus ordnet treuer ein, bläht nicht auf.

**Interview-Feature, vier Commits (`9e3b17a`→`ef64123`):** Das Modell gibt beim Structure-Call `open_questions` zurück — `correction` (fraglicher Eigenname, aggressive Schwelle: bei Zweifel fragen) oder `deepening` (dünner Strang, sparsame Schwelle). Bei offenen Fragen speichert `structure()` NICHT sofort, sondern hält das Ergebnis in `pending`-State und öffnet ein shadcn-Dialog-Modal („THE COGITATOR ASKS", amber). Ein Antwortfeld pro Frage. ABSCHLIESSEN → resolve-Call webt Antworten ein (correction ersetzt Namen verbatim, deepening webt in Prosa), speichert. ABBRECHEN/Escape/X → alles verworfen, nichts gespeichert (schwebender Flow). Klick-außerhalb deaktiviert. Backend hat einen dritten `isResolve`-Modus neben new/append.

**Standout-Bugfix, drei Anläufe (`07417b7`→`364c27d`→`144f5c1`):** Nach dem Interview fehlten die Standouts. Erst nach einem DB-Query (`chronicle->'standout_moments'` = `[]` schon nach dem ersten Call) war klar: Opus lässt Beats, die an fraglichen Namen hängen, aus den Standouts, bis die Namen geklärt sind — die Wurzel lag im ERSTEN Call, nicht im resolve. Erste zwei Fixes (Prompt-„preserve", dann Code-Merge der leeren Original-Standouts) lagen falsch. Finaler Fix: der resolve-Call LEITET die Standouts frisch ab, wo die Namen geklärt sind (`144f5c1`). Live bestätigt: vier Standouts mit „C'tan" statt der Transkriptionsfehler.

**Cepharil-Anwendungsfall live durchgelaufen:** Diktat „Cepharil"/„Katanen" → Modal fängt beide in einer correction-Frage → Nutzer antwortet „C'tan" → Chronicle, Standouts und Resonant Scenes durchgängig „C'tan", Prosa unverändert sonst.

**⚠️ DB-Feld `open_questions` (`L-1`) ist im schwebenden Flow UNGENUTZT** — bewusste, dokumentierte Reserve für einen möglichen „Fragen für später"-Modus. Kein toter Code, aber aktuell nicht befüllt (die Fragen leben nur im Modal-Moment).

**⚠️ Offen (unverändert aus Vor-Sprints):** Zähl-Logik dreifach; `calc(100vh-270px)` in Auspex unkalibriert; `duplicate_of` vs. Seitenzahlen; Alliance-vs-POV-Sweep; Dropdown-Zähler statisch.

**Nächste Sprint-Kandidaten:** Längen-Sweet-Spot der Chronicle justieren (Opus längt anders als Sonnet — nach ein paar echten Läufen `max_tokens` oder eine Kürze-Präferenz kalibrieren); Strategium (AI-Lesebegleiter für nicht-lineare Abweichung) als größeres eigenes Projekt; der `815800d`-Opacity-Revert steht weiter offen (in diesem Sprint nicht berührt — ContextDrop nutzt kein `.grimdark-panel`).

Lessons in CLAUDE.md (Abschnitt „Sprint Chronicle-Interview").

---

**Sprint Campaign-Cleanup (COMPLETE)**

Campaign-Cleanup — Omnibus-Expansion zurück + Listenzeilen-Status aufgeräumt — COMPLETE (Desktop). HEAD `39400d6` on main. Drei kleine Commits, alle live-grün und live abgenommen. Base `adce6af`.

**Omnibus wieder inline ausklappbar (`4957d66`):** Der Omnibus-Sub-Items-Sprint hatte die Inline-Expansion in der Phasenliste bewusst gegen „Klick → Dossier mit CONTENTS-Liste" getauscht. Tim wollte sie zurück (geänderte Anforderung, keine Fehlerkorrektur). `BookRow` bekam einen lokalen `expanded`-State; bei Omnibussen togglet der Zeilen-Klick die Ausklappung statt zu navigieren, ausgeklappt rendert `BookRow` sich rekursiv pro Kind (Tiefe hart 2 durch Daten — Kinder haben nie `contents`). Kinder-Block als SIBLING außerhalb des äußeren `<button>` (keine verschachtelten Buttons). Klick auf ein Kind öffnet dessen Einzel-Dossier wie ein normales Buch. `getEntryProgress` wird von `PhaseDetail` als Prop an `BookRow` durchgereicht (kein Context-Import — `BookRow` bleibt router-/context-frei). `getEntryProgress` liefert für Omnibusse jetzt ein echtes Ø-Rating (Durchschnitt der bewerteten Kinder) statt hartem `0`.

**Skull-Sterne in der Listenzeile → Häkchenfarbe (`ea6cc88`):** Die `size="sm"`-Skulls (20px) waren nicht als Totenkopf lesbar und das „4/5" daneben doppelte nur. In der Listenzeile ersetzt durch eine Farbe am bestehenden Read-Häkchen: grün (`text-auspex`) = gelesen, gold (`text-gold`) = gelesen & bewertet. `SkullRating`-Import aus `BookRow` raus (tot). Das volle interaktive `SkullRating` mit Label bleibt im Dossier unverändert.

**Omnibus-Ø-Rating wieder entfernt (`39400d6`):** Zwei Rating-Aussagen in einer Zeile (Ø 4.0 neben 3/3-Fortschritt) lasen sich als konkurrierende Zahlen. Ø-Rating + `AverageRatingIcon` (Kreis+Strich-SVG) aus der UI raus. Der „X/Y"-Zähler zeigt jetzt nur noch, solange der Omnibus NICHT voll gelesen ist; voll gelesen → grüner Haken (nicht gold — es gibt keine „bewertet"-Aussage mehr am Omnibus-Level). Die Ø-Berechnung in `getEntryProgress` BLEIBT (Datenschicht-Reserve für Analysis/Record; nur nicht mehr gerendert).

**⚠️ Offen (unverändert aus Vor-Sprints):** Zähl-Logik dreifach; `calc(100vh-270px)` in Auspex unkalibriert; `duplicate_of` vs. Seitenzahlen; Alliance-vs-POV-Sweep; Dropdown-Zähler statisch.

Lessons in CLAUDE.md (Abschnitt „Sprint Campaign-Cleanup").

---

**Sprint Context Drop (COMPLETE)**

Context Drop — dictated reflection structured by Sonnet 4.6 — COMPLETE (Desktop). HEAD a717ce3 on main. Dreizehn Feature-Commits + ein Backdrop-Tausch + zwei DB-Migrationen (J-1, K-1, beide live via MCP und als Datei dokumentiert). Live abgenommen (Chronicle-Tiefe, APPEND-Verweben, Szenen-Erfassung, Backdrop).

**Kern:** Ein diktierter Roh-Take (via Wispr Flow, OS-seitig) geht an eine neue Vercel Serverless Function `frontend/api/context-drop.js` (erste Function im Projekt), die Claude Sonnet 4.6 (`claude-sonnet-4-6`) via `fetch` aufruft und über erzwungenes `tool_use` in drei Konsumenten-Blöcke strukturiert: **Chronicle** (`jsonb`, mensch-sichtbar, Prosa in Absätzen, mehrere Standouts, Spoiler ok), **Auspex Reading** (`jsonb`, eingeklappt, 16-Achsen-`emotional_register`-Enum + intensity/appetite/fatigue/faction/hooks — Strategium-Input), **Music Scenes** (eigene `jsonb`-Spalte, nur explizit markierte Szenen — Suno-Workflow-Input). Rohdiktat versteckt als Audit-Trail. Persistenz über direkten, nicht-debounced `handleContextDropSave` (RLS-authentifiziert, `lastSyncedRef`-Lockstep). APPEND-Modus verwebt Ergänzungen in die bestehende Chronicle und bewahrt markierte Szenen; RE-DRAFT startet neu. Reflection-UI konsolidiert (Personal Take + Marginalia raus, redundant zur Chronicle; SkullRating bleibt). BookDetail-Backdrop auf bespoke Manuskript-Kunst (Aquila) — Reliquiar frei für Service Record. Lessons in CLAUDE.md.

**Env:** `ANTHROPIC_API_KEY` als Vercel-Env-Var (Production + Preview, sensitive, KEIN `REACT_APP_`-Präfix — serverseitig). DB: user_progress um `chronicle`, `auspex_reading`, `music_scenes`, `context_drop_raw`, `context_drop_at`, `context_drop_model`, `context_drop_schema_version` erweitert (J-1 + K-1). `personal_take`/`notes` bleiben (Koexistenz).

**⚠️ Offen (unverändert aus Vor-Sprints):** Zähl-Logik dreifach; `calc(100vh-270px)` in Auspex unkalibriert; `duplicate_of` vs. Seitenzahlen; Alliance-vs-POV-Sweep; Dropdown-Zähler statisch. Auspex live-Verifikation aus dem Vor-Sprint gilt als erledigt (im Omnibus-Split-Sprint bestätigt).

---

**Sprint Auspex Omnibus-Split + Row-Layout + Sigil-Sanity (COMPLETE)**

Auspex Omnibus-Split + Row-Layout + Sigil-Sanity — COMPLETE (Desktop). HEAD 06bd041 on main (Sigil-Fixes live via MCP, kein Commit). Sieben Commits plus zwei DB-Korrekturen.

**Omnibus-Auftrennung im Auspex (`1157d69`, `ccf39cb`):** Der flache Katalog zeigte Omnibusse als eine Zeile; die einzelnen Romane und Kurzgeschichten darin waren über die Filter nicht erreichbar. `allBooks` in Archive.jsx ersetzt jeden Omnibus-Entry durch seine Kinder (`flatMap` über `contents`, jedes Kind per Spread mit `parentTitle`/`parentEntryId` angereichert), Einzelbücher unverändert, `duplicate_of`-Filter bleibt auf Entry-Ebene VOR der Auftrennung. Header zählt dadurch von 175 auf 313 (175 − 50 Parents + 188 Kinder). Campaign/Phase-View unberührt — rendert direkt aus projectData, nicht aus allBooks. Kinder tragen im Katalog bereits alle Filterfelder (`grand_alliance` 0 NULL, `faction_sigil` 9 NULL → NO_FACTION-Sentinel, mood 15 leer → moodOk lässt leere durch), daher KEINE Migration nötig. O-Badge (`ccf39cb`): kleines auspex-getöntes O-Ring + "PART OF <Omnibus>" unter dem Titel, nur wenn `parentTitle` gesetzt.

**C3/C5 entfielen als Code:** Progress-Auflösung der Kind-Zeilen (`getEntryProgress` löst Objekte ohne `contents` automatisch als Einzelbuch über `bookProgress[entryId]` auf) und Klick-Ziel (`resolveEntry` steigt bereits in `contents` ab, gibt Kind + `parent` zurück) waren durch den früheren Omnibus-Sprint korrekt gebaut. Reine Verifikation.

**Row-Layout, drei Iterationen (`c5dffaf`, `2343a13`, `06bd041`):** Ausgangsproblem: lange POV/Sektor-Werte liefen aus der Box ("Interrogator-Chaplain Asmodai/Boreas", "Ultima Segmentum (Imperium Nihilus)"). C1 gab dem Datenblock feste `w-[170px]` + Truncate-Anker — behob den Overflow, tauschte ihn aber gegen hartes "…"-Abschneiden bei viel Leerraum rechts. C6 ließ den Block wachsen und umbrechen (`flex-1`, `break-words`, Container auf `items-start`) — brach aber zu früh um, weil ein `max-w-[440px]`-Deckel PLUS ein konkurrierender flex-1-Spacer den Raum halbierten. C7 löste es endgültig: Spacer raus, Deckel raus, Datenblock als einziger Grower, bedingter Spacer für Zeilen ohne Datenblock. Ergebnis: "Interrogator-Chaplain Boreas" einzeilig, kein Leerraum, lange Sektoren umbrechen erst nach voller Breite. Lessons in CLAUDE.md.

**Sigil-Sanity-Check (live via MCP, kein Commit):** Sweep über 108 Einträge mit komplexem `sub_faction`. Ein echter Fehler: *The Talon of Horus* (P0-08) trug `thousand_sons` statt `black_legion` — Klammerzusatz "Thousand Sons remnants" überstimmte die Regex. Ein Grenzfall auf Tims Entscheidung korrigiert: *Witchbringer* (P6-23) `inquisition` → `astra_militarum`. Beide per Dry-Run-dann-UPDATE geschrieben. *Leviathan* ist KEIN Fehler (Sigil korrekt, nur `grand_alliance = xenos` bei Ultramarines-POV — die bekannte Zwei-Felder-Frage). `faction_sigil` wird live aus Supabase gelesen (`useCatalog` select), kein JSON-Rebuild nötig — Reload zeigt die Korrektur.

**⚠️ Offen: Alliance-vs-POV-Sweep.** *Leviathan*-Typ (grand_alliance = thematisches Lager statt POV-Fraktion) katalogweit ungeprüft. Eigene Session, eigene Alliance-Semantik. Details in CLAUDE.md.

**⚠️ Weiterhin offen (unverändert):** Zähl-Logik dreifach (`globalStats` + `getPhaseStats` + `calculateStats`); `calc(100vh-270px)` in Auspex unkalibriert; `duplicate_of` vs. Seitenzahlen (P3-30 trägt 560, P5-13 NULL); Dropdown-Zähler statisch.

---

**Sprint Auspex-Politur (COMPLETE)**

Auspex-Politur — COMPLETE (Desktop). HEAD 26caeb2 on main. Zwölf Commits am Archive/Auspex-View. Live verifiziert im Folge-Sprint (Omnibus-Split): Header, Dubletten-Filter, Campaign-Kontrollprobe und Faction-Filter bestätigt. Panel-Deckkraft in `87b4b63` auf `0.72/0.78` gesetzt (Erledigung der alten `815800d`-Entscheidung, kein Revert auf 0.6/0.68 — der alte Wert versagte über heller Art). Live abgenommen.

**Layout (`112b471`, `e911103`, `a8f2404`, `cea459d`):** Auspex' eigene Allegiance-Chip-Leiste raus (spiegelte den GlobalHeader 1:1). Header steht fest, Katalog scrollt in eigenem Container, zwei Spalten ab `lg`. Die zweite Spalte legte eine Altlast frei: `BookRow` läuft nach rechts auf `to-transparent` aus, was einspaltig folgenlos war und zweispaltig den POV/SECTOR-Block ohne Grund auf die grüne Auspex-Art setzte. Fix war die fehlende Panel-Ebene (Campaign wickelt seine Zeilen in `.grimdark-panel`, Auspex tat es nie) — `BookRow` blieb unangetastet. Das neue Panel setzte dann einen Stacking Context und begrub die Filter-Dropdowns; `z-30` auf dem Header holte sie wieder heraus.

**Sigils (`122bafa` I-1, `8d8feab`, `6c931aa`):** 53 der 176 Einträge hatten gar keinen `faction_sigil` — der Seed-Regex lief über `sub_faction`, und diese Zeilen haben keine. 42 aus `faction_primary` nachgezogen (konfliktfrei by construction: `grand_alliance` stammt aus derselben Spalte), 11 bleiben NULL und sollen es — alle `unaligned`, ohne Fraktion. Jetzt 165/176 mit Sigil. Dazu der Tönungs-Fix: `FactionSigil` tönte die POV-Silhouette nach der Buch-Alliance, was bei *Leviathan* (Tyraniden-Roman, Ultramarines-POV) und *Apocalypse* (Word-Bearers-Roman, Fists-POV) das Symbol in die Farbe des Gegners tauchte. `SIGIL_ALLIANCE` (42 Assets) + `SIGIL_LABEL` exportiert, Tönung nach der Alliance des Sigils selbst.

**Filter (`7bb338f`, `1100cd9`):** Neue `FilterDropdown`-Komponente (Multi-Select, Gruppen-Header, Leading-Node; kein Radix — `components/ui` hat weder Select noch Popover, und drei Filter rechtfertigen keine Dependency). Drei Dropdowns ersetzen die Mood-Chip-Wolke: ALLEGIANCE auf `grand_alliance` (Thema), FACTION auf `faction_sigil` (POV, 37 Werte unter vier Alliance-Gruppen, mit Symbolen), MOOD wie bisher. **Innerhalb** eines Filters ODER, **zwischen** den dreien UND. Die 11 fraktionslosen Bücher bekommen einen "No faction"-Eintrag — sonst wären sie über keinen Filter erreichbar. Header schrumpft von drei Zeilen auf zwei.

**Dubletten (`0061fa3` I-2, `26caeb2`):** *Apocalypse* stand doppelt im flachen Katalog. Kein Bug — der Leseplan listet den Roman bewusst in P3-30 (Quer-Listung) und P5-13 (native). Campaign zeigt zu Recht beide; der flache Katalog darf ihn nur einmal zeigen. `also_in` sagte das schon, aber als Freitext ("SAME NOVEL do not double-count") — für Queries unsichtbar. Neue Spalte `duplicate_of`, P3-30 → P5-13, Auspex filtert Zeiger-Zeilen. Katalogweit gibt es sonst KEINE Titel+Autor-Dublette; zwei weitere `also_in`-Querverweise (P3-26 → P2-03.2, P7-23 → P7-11.2) zeigen auf Omnibus-Kinder, die nie auf Entry-Level erscheinen, und sind keine Dubletten.

---

**Sprint Campaign-Finish (COMPLETE)**

Campaign-Finish — COMPLETE (Desktop). HEAD 28f650d on main. Thirteen commits closing out the Campaign/Phases view.

**Counting bug (the real one, `8b76341`):** `globalStats` still read sub-item progress from the NESTED store (`progress?.contents?.[subEntryId]`) after the omnibus sub-items sprint moved to FLAT. The dead branch always returned undefined, so every read omnibus child counted as unread — DB held 9 read sub_items, header showed 14 completed instead of 23. `getPhaseStats` had been migrated; `globalStats` was missed. This, not the Gaunt's Ghosts gap, was the bulk of the old "14/303" discrepancy. Two further dead reads in the same block picked up (`progress?.isRead`, sub-item ratings).

**Gaunt's Ghosts unpacked (`68b928b` + live DB):** 15 novels seeded as real `sub_item` rows under P6-01..04; count now reads 314. Page figures are an even split of each omnibus total (`page_count_confidence = 'low'`) — no per-volume figure is published, and the counters ignore a parent's `pages` once it has children, so the split is what holds the global total at 89,624 exactly. Dry-run green before insert (F-lesson). Recorded in `db/migrations/H-1_seed_gaunts_ghosts_sub_items.sql` (documentation only — the SQL ran live via MCP; NOT idempotent, a re-run would duplicate the 15 books rows).

**Backdrop finally reaches the header — four rounds, four independent lids:** (1) `c2901e0` ViewBackdrop sat at `zIndex: -10`, which places it behind the OPAQUE body background — visible only where a `.grimdark-panel` spawned a stacking context via `backdrop-filter`; art moved to `z 0`, content to `z 10`. (2) `2965991` that promptly covered AppNav, which renders as a SIBLING of the Outlet and had no z-index; given `relative z-10`. (3) `f9db067` the GlobalHeader's own band (`bg-slate-950/65`) was a lid BETWEEN art and boxes; stripped to `bg-transparent` along with its hard black drop-shadow. AppNav keeps its band deliberately — no panels, bare labels, it carries their contrast. (4) `d8b409b`+`28f650d` `CurrentAssignment` never had the panel fill: a `bg-gradient-to-r from-gold/10 to-transparent` utility overrode `.grimdark-panel`'s gradient outright. Wash removed entirely; the box reads as a call to action through its gold border, gold title and chevron.

**⚠️ Collateral, unresolved (`815800d`):** that commit raised `.grimdark-panel` from `card 0.6 / void 0.68` to `0.82 / 0.88` APP-WIDE, as an attempt to catch the bright assignment box. Wrong diagnosis — the box didn't have the class working (see round 4). It missed its target and darkened every panel in every view. It still stands, live-accepted, but the darkening was unintended. **Open decision: revert to 0.6/0.68?** The header boxes are unaffected either way.

**Rest:** CurrentBookDossier lost its faction line (redundant — CurrentAssignment sits directly above it) and got its content vertically centred; the phase headline in the book list went `text-xs` → `text-lg` with a proportional number badge; nav labels now mirror the Landing bridge stations (PHASES→CAMPAIGN, ARCHIVE→AUSPEX, MAP→OCULUS, RECORD→SERVICE RECORD; `/` keeps HOME — the Landing IS the bridge), matched by route, not by label.

**⚠️ Open: counting logic exists in triplicate.** `globalStats` + `getPhaseStats` (both `ArchiveDataContext.jsx`) + `calculateStats` (local in `PhaseDetail.jsx`). The nested→flat migration touched two of three; the third ran silently wrong for 40+ commits. Centralising is a clean standalone commit — one helper, three callers.

**Reading status corrected:** what the previous STATE.md filed as "data drift from sprint tests" was Tim's actual reading position. Phase 1: Forges of Mars ✓, The Emperor's Gift ✓, Grey Knights ✓, The Infinite and the Divine ✓, All is Dust ✓, Ahriman: Exile ✓, **Ahriman: Sorcerer in progress**. The DB was right; the doc was stale. The drift note is struck.

---

**Sprint Omnibus Sub-Items — first-class sub-books (COMPLETE)**

Gave books inside an omnibus full parity with standalone books: own ternary
status, own dossier at /book/:subEntryId, Current-Assignment eligibility, and
inclusion in the global single-reading invariant. Eight commits, each live-
verified on Vercel, none broke the running app. HEAD after sprint: 2b42825.

Four locked design decisions:
- Single-reading invariant is global and strict: exactly ONE book (entry OR
  sub-item) is `reading` across the whole catalog. The "most recently started"
  tiebreak (startedAt) spans both levels. The confirm dialog (mark-old-read /
  reset-unread / cancel) fires when a sub-item is started while another book reads.
- Parent omnibus status stays purely DERIVED, never written. Ternary: all
  children read → parent read; any child reading OR some-but-not-all read →
  parent reading (IN PROGRESS); else unread.
- Current Assignment shows the child with parent context (parentTitle/
  parentEntryId on currentReading.book), e.g. "GREY KNIGHTS OMNIBUS · PHASE 1".
- Sub-item gets its own route /book/:subEntryId. Sole entry point is the title
  click in the omnibus CONTENTS list — sub-items do NOT appear as their own rows
  in Archive/Phase lists (the omnibus is one row with an X/Y glimpse).

Key architecture: flat-not-nested store (sub-item progress at bookProgress[sub],
same shape as entry-level; parent_book_id in DB is the only membership marker).
Bridge strategy for the move (dual-write flat + nested, migrate consumers one at
a time readers-before-writers, tear the bridge down last). Central ternary
derivation getEntryProgress(book) → { status, childRead, childTotal, rating } in
context; BookRow became purely presentational. No DB change needed — status is
text NOT NULL DEFAULT 'unread' CHECK (unread/reading/read) on every row alike,
is_read GENERATED, only the set_updated_at trigger. Dead RecursiveBookEntry.jsx
(510 lines) and the handleSubItem*/onSubItem* handler+prop chain removed.

Deferred / carried forward: NotesModal footer still reads "LOCAL STORAGE"
(harmless stale label). Possible dead activeFilters prop on PhaseDetail's
signature — re-check. The Mobile-merge instruction conflict noted in the Sprint C
block above is now RESOLVED (project instructions rewritten: Desktop = direct
push to main, Mobile = Claude Code runs push + gh pr create + gh pr merge --squash
+ branch-delete in one pass; no manual Web-UI merge). Data drift in user_progress
from sprint tests (some Grey-Knights/omnibus children and P1/P2 test books on
read/reading that the curated reading status treats as open) to be cleaned on the
next real in-app reading update — not a TIA blocker.

---

**Sprint C — Reflection Capture (COMPLETE)**

Added a personal reflection layer to the READ dossier. Four commits, each
live-verified on Vercel:

- `1273670` docs(db): record the personal_take migration. One additive nullable
  column on user_progress; DDL applied live via Supabase MCP, recorded in
  db/migrations/C-1_user_progress_personal_take.sql for traceability. No backfill —
  all existing READ books become legitimately PENDING reflection.
- `61ea507` progress: thread personal_take through useSupabaseProgress, 1:1 parallel
  to notes (SELECT, hydration entry-branch, entryChanged, normalizeEntry, payload).
  Entry-level only; the sub-item hydration branch and isPureContainer stayed
  byte-identical — reflection is entry-level like reading, keeping the risky
  auth-dependent sub-item write path untouched.
- `df8cff4` context: handleBookPersonalTakeChange + derived isReflectionPending
  helper (status='read' AND personal_take empty), both router-free. handleBookNotes-
  Change already existed and was reused unchanged.
- `9c54981` dossier: READ block now shows PERSONAL TAKE (verdict) + MARGINALIA
  (reuses notes) textareas, both commit-on-blur, plus a soft "REFLECTION PENDING"
  badge gated on isReflectionPending. Reflection is a soft trigger, not a hard gate —
  marking read never blocks on it; the badge simply persists until a take is written.
  The `notes` column is now surfaced in the UI for the first time.

DB state after sprint: user_progress carries notes + personal_take (both nullable,
both entry-level in practice). PENDING is derived, never stored. Vercel production
READY on 9c54981 (verified by Tim: both fields render on READ books, badge clears
after a take + reload, MARGINALIA does not affect the badge, UNREAD/READING books
show no reflection block).

Deferred / carried forward: the NotesModal footer still reads "LOCAL STORAGE"
(stale since B-2 — progress is Supabase-backed); harmless dead label, folds into a
later cleanup. The two Book-Detail cleanups from the prior sprint remain open
(delete unused RecursiveBookEntry.jsx; drop dead activeFilters/handler props from
PhaseDetail's signature). Instruction-doc conflict noted for next Mobile session:
the closing Mobile paragraph (Claude Code runs gh pr merge --squash itself) conflicts
with the Mobile mode rules above it (Tim merges via GitHub Web UI) — must be resolved
before the next Mobile sprint; irrelevant on Desktop.

---

**Book-Detail / Dossier — ternary status + one-book invariant (COMPLETE)**

Turned the binary progress layer into a ternary state machine
(unread/reading/read) and built the Book-Detail dossier plus the
current-assignment feature. Seven commits, each live-verified on Vercel:

- `d1f3732` progress: ternary status in the data layer (hydration reads
  status/started_at/completed_at; started_at set once and preserved; completed_at
  read-only; is_read stays DB-generated, never written). reading is entry-level;
  sub-items stay binary.
- `05911df` row: FactionMark (centralised grand-alliance icon+tint) + lean BookRow
  (glimpse row, router-free via onOpen), built unwired.
- `fc5cb92` dossier: /book/:entryId route under AppLayout, keyed by entryId
  (sub-item id resolves to parent entry — dossier is entry-level only). Three-state
  render + status-driven action strip. First UI that produces status='reading'.
- `6eea2d9` list: Phase + Archive render BookRow -> dossier; fat RecursiveBookEntry
  off the render path (kept in repo, unused); PhaseDetail key title->entryId.
- `f1357ff` fix: omnibus sub-items toggleable again in the dossier CONTENTS list.
- `5820da8` current: currentReading derivation in context + CurrentAssignment
  banner atop Phase view (router-free, reusable on the Landing cogitator later).
- `14cc0ae` current: one-book invariant via a three-way confirm dialog; the
  transition runs through an atomic handleStartReading (both books in one write).

DB-verified at sprint end: reading_count = 1 (invariant holds), read 23, unread 4.
grand_alliance confirmed NOT NULL on all 349 rows (4 values), so FactionMark maps
on grandAlliance directly — no derive-from-children. Vercel production READY on
14cc0ae (verified by Tim).

Deferred to their own chats (optical/immersive, not functional core): ViewBackdrop
shell (blurred station-art per route; /book/:id gets its own fixed Auspex backdrop,
not inherited); Landing cogitator live-zone (the data-cogitator-screen dock point
consumes the same currentReading source via the router-free CurrentAssignment).
Reflection capture (personal_take/free_notes + PENDING marker) stays gated to
Sprint C — the only remaining schema work; the READ dossier currently shows rating
only. Cleanup pending: delete unused RecursiveBookEntry.jsx; drop dead
activeFilters/handler props from PhaseDetail's signature.

---

**Landing Bridge — command-bridge skeleton + calibrated cogitator (COMPLETE)**

The Landing (the nav-free hub at `/`, outside AppLayout) was rebuilt from a
placeholder card into the void-ship command bridge from the locked six-station
manifest. Built skeleton-first, nav before skin, each commit live-verified on
Vercel. Final architecture: an img-as-sizer stage (`data-bridge-stage`) sized by
the real backdrop `<img>` (`data-bridge-backdrop`,
`frontend/public/Imperial_void-ship_command_bridge_2K_202607041950.jpeg`); the
six manifest zones are absolute %-overlays that scale with the art. Five
navigable stations (Oculus→/map, Campaign→/phases, Auspex→/archive,
Strategium→/strategium, Service Record→/record) plus the parked Command
Cogitator centre hero (no route). The cogitator readout sits directly IN the
painted black console screen — frameless green phosphor (auspex + text-glow),
calibrated via a temporary drag/resize harness to top 57.4% / left 38.4% /
w 23.1% / h 27.4% (`data-cogitator-screen`). Three new skeleton destination
pages under AppLayout (MapView/Strategium/ServiceRecord) and three AppNav
entries (plain labels MAP/STRATEGIUM/RECORD) completed the five-destination set.

Commit chain: c99eb3d (routes+nav) → 06d8773 (bridge grid skeleton, later
retired) → 4c4a01e (backdrop asset) → 2d4dc99 (backdrop-as-stage + overlays) →
61d0f6a (cogitator phosphor + calib harness) → 8e89f8f (bake coords, remove
harness). Vercel production READY on 8e89f8f (verified by Tim).

Deferred to step 5 (own chat), not bugs: the five stations sit in placeholder
positions and overlap painted art; the masthead is overlapped by the Oculus
station; the five station PNGs stay untracked in frontend/public/ until the
code that renders them lands (asset-with-consumer rule); a stale harness
reference lingers in a Landing.jsx comment. Step 6 (live data — cogitator
first) follows step 5.

**Landing Bridge step 5 — station positioning + artwork + oculus rebuild (COMPLETE)**

Step 5 dialed the five stations and masthead into place and gave each station
real artwork. Positioning via the same drag/resize calibration harness as the
cogitator (CALIB flag, dialed against the live Vercel deploy, baked, harness
removed). Each station now fills its box with an art JPEG (object-cover) under a
bottom gradient scrim, gold label below, icon+sublabel dropped (art carries the
identity; icon field kept as null, not deleted). Assets committed with their
consumer. The oculus art was rebuilt from a generic rose-window into a bespoke
text-free 16:9 hololith galaxy (Flow-generated, several iterations; a 4:5
portrait attempt was tried and reverted after it overlapped the cogitator — see
CLAUDE.md aspect↔width lesson). A plasma-blue "SEGMENTUM SOLAR" CSS label marked
data-oculus-segmentum is the step-6 dock point for that live zone.

Final station art (never key by label — read the stations array): oculus→
Oculus_hololith_galaxy_16x9; campaign→Chart-console; auspex→Operator-console
(green scope); strategium→War-table (hololith map); record→Gilded-reliquary.
Two swaps happened during the sprint (auspex/strategium in C3b, campaign/
strategium in C3f) — the array is the truth.

Commit chain: 45ec827 (calib harness) → 6eded7e (bake positions, remove harness)
→ 1a09a15 (five station JPEGs) → 537e7e2 (oculus width 22 + auspex/strategium
swap) → 8ababdf (oculus 3:4 art + segmentum label) → aa079ed (narrow oculus 4:5)
→ edab732 (oculus back to 3:2, 16:9 art) → 82ab41a (oculus top 18, campaign/
strategium swap). Vercel production READY on 82ab41a (verified by Tim).

C4 (frame treatment) deliberately dropped — the artwork already carries the
colour identity; frame question folds into the app-wide skin pass. Deferred to
the skin pass (own chat), not bugs: palette migration v1.0→v1.3 (code still uses
retired text-gold/plasma/auspex tokens); text-glow-plasma undefined in CSS
(segmentum label has no glow); box frame treatment; v1.3 material-asset layer;
grimdark-panel v1.3 recipe. Step 6 (live data — cogitator first) is next.

**Archive View — catalog-wide browse + filters (COMPLETE)**

The second view under the AppLayout shell (after Phase). A catalog-wide flat browse
of all 176 entry-level books across every phase, with two AND-combined filters.
Built skeleton-first in four atomic commits, each live-verified on Vercel before the
next: C1 (4a6b73b) /archive route + ARCHIVE nav link + skeleton page; C2 (4527b2f)
flat render phases.flatMap(books) -> RecursiveBookEntry, keyed by entryId
(cross-phase titles non-unique); C3 (6e9df7a) grand-alliance filter in the Archive
body (Rule A, entry-level), additive — GlobalHeader's allegiance bar left intact,
not relocated; C4 (a27c6f2) data-driven mood filter, chips computed from the data
(moods with >= 8 entry-level hits, sorted by frequency), array-intersection
(has-any-of), AND-combined with allegiance, empty-state when no match.

The whole view reuses RecursiveBookEntry unchanged — Archive is just a flat list fed
to the existing recursive component, sharing the same ArchiveDataProvider context and
progress handlers as Phase (marking read in Archive reflects in Phase, same
user_progress rows). Both filters are local page state (activeAlliance, activeMoods);
allBooks/moodChips/visibleBooks are memoised. Vercel production READY on a27c6f2
(verified by Tim).

Design decision — additive, not relocate: the nav-rework framed Archive as the "new
home" for the allegiance filter (relocated from the header). Chosen instead: Archive
builds its OWN allegiance filter; GlobalHeader stays untouched and keeps filtering the
Phase view. Reason: emptying the header touches the deferred-skin component and changes
Phase-view behavior mid-skeleton. The header relocate/cleanup folds into the later
GlobalHeader/skin pass. Temporary two-place redundancy (two independent views,
independent local state) is harmless.

Still open (own chats): skin Landing + Archive + nav<->header together (design pass);
the header allegiance relocate rides that pass; Analysis view content spec; Vision
v1.1 -> v1.2 doc update (Analysis promoted to fifth view) still pending. F.1 deferred
cleanup still open: dead activeFilters prop on RecursiveBookEntry; PhaseDetail's
key={book.title} (Archive already uses entryId).

**Interface/Navigation Rework (COMPLETE)**

Moving from the single-screen model (Phase list bolted to a header filter bar) to
a multi-view shell. IA decided this session: FIVE views — Landing (new hub),
Phase, Archive (catalog-wide browse/filter — new home for the allegiance filter
AND the mood filter), Analysis (NEW — sober filterable stats, split OUT of Service
Record), Map, Service Record (now immersion/lore only). This splits the Vision
v1.1 four-view model → v1.2 (Analysis promoted); Vision doc update pending.

Structural commits (3, live-verified pixel-identical):
- 0c664f4 — install react-router-dom (v7), wrap app in BrowserRouter, catch-all route
- 610c4b4 — lift data layer into ArchiveDataProvider (context); view → pure consumer
- 41a90d4 — extract PhaseView page from ArchiveApp; App.js = pure router wiring

Visible nav block (3, skeleton-first, all live-verified on Vercel):
- 75cba88 — vercel.json SPA rewrite (deep-link/hard-refresh survive client routes)
- 56364ac — real routes: / → Landing skeleton, /phases → PhaseView, catch-all → redirect
- 2591cda — persistent nav via layout route (AppLayout = AppNav + Outlet); nav on app views, not on Landing

Sprint closed: routing, redirect, deep-link survival, and persistent nav all
live-verified. GlobalHeader untouched (nav↔header relationship is a skinning
decision). Next, in their own chats: (a) skin the Landing against
TIA-Design-Briefs.md now the mechanics hold; (b) Archive View as the next route
under AppLayout — new home for the deferred mood-filter. Still pending: Vision
v1.1 → v1.2 doc update (Analysis promoted to its own fifth view). Per-view Design
briefs live in Project Knowledge (TIA-Design-Briefs.md), grounded in the real CSS
tokens.

**Sprint G — tags/book_tags M:N (mood scope) (COMPLETE)**

Built the queryable tag M:N structure deferred since B-3b, scoped to mood only.
Two tables mirroring the F series model: `public.tags` (id, name, type; type
CHECK ('mood') only for now, OPEN value-list; UNIQUE(name,type)) and
`public.book_tags` (book_id, tag_id, PK(book_id,tag_id), both FKs ON DELETE
CASCADE, index on tag_id). RLS read-only for authenticated. Diagnosis drove the
scope: mood_tags (249 distinct, shared vocabulary, avg 3.8/book) normalises
well; semantic_tags (2004 distinct, 73% singletons, avg 12.6/book) is
AI-companion context and stays a plain array; legacy tags[] is effectively
empty. Seeded directly from books.mood_tags[] via unnest (no hand-typed VALUES).
Dry-run verified before the junction insert (expected == book-join == tag-join
== 1131); real insert 1131. Final: tags 249 / book_tags 1131 / 298 books linked.
3 DB-only commits, all on main: 63d1019 (G-1 tables+RLS), 40ab391 (G-2 seed 249
mood values), 2d40e9a (G-3 seed 1131 junction links). Vercel READY (no visible
change — the UI does not consume the junction yet; moodTags already renders from
the array since E.1). The mood-filter UI was deliberately NOT built: Tim opened
an interface/navigation rework question (multi-area landing/browse/analysis
structure) that must be settled against the Vision v1.1 four-view plan before
more filter UI lands. Filter data is ready for whatever the UI becomes. Lesson
in CLAUDE.md (normalise the shared-vocabulary field; leave the singleton field
an array until its consumer exists).

**Sprint F.1 — grand-alliance faction filter (COMPLETE)**

Turned the never-wired "strategic filter" (dead UI since v1) into a working
4-way faction filter. A curated CASE mapping collapses the 47 distinct
`faction_primary` values to 4 alliances stored in a new NOT NULL,
CHECK-constrained `books.grand_alliance` column
(imperium 239 / chaos 34 / xenos 33 / unaligned 43 = 349). Mapping is
Tim-approved: Soul Drinkers→imperium (start loyal), Genestealer Cults /
Leagues of Votann→xenos; NULL / 'Multiple' / 'Warhammer Horror'→unaligned.
The migration was applied live via Supabase MCP and verified before the
repo commit. `grandAlliance` is threaded through `useCatalog` onto both
entry and omnibus-child shapes; `PhaseDetail` filters the rendered list by
it BEFORE the map (Rule A — per-row, parents match on their own alliance,
children not individually inspected); phase stats keep using the full
unfiltered list so progress is unaffected. `GlobalHeader` gains the fourth
button (UNALIGNED, Skull icon) and is relabelled ALLEGIANCE; the first
three button ids already matched grand_alliance. Shipped in six commits:
FX-1 (6e04473) grand_alliance column + backfill; FX-2 (177edcb) thread into
useCatalog; FX-3 (1f4138e) apply filter in PhaseDetail; FX-4 (d32ba42)
alliance buttons; F.1-5 (487f4ca) CLAUDE.md lessons; F.1-6 (this)
PROJEKT_KONTEXT. Vercel production READY on d32ba42 (verified by Tim).
Lesson in CLAUDE.md: faction_primary is populated at every row level, not
just children — the omnibus-empty rule is per-field, verify by query.
Deferred (not F.1 scope): dead activeFilters prop on RecursiveBookEntry;
key={book.title} in PhaseDetail should be entryId.

**Sprint F — series/saga M:N model + phase-view badge (COMPLETE)**

Introduced first-class series identity, the M:N model deliberately deferred
since B-3c (flat series/series_order columns were never added to books to avoid
implying a 1:1 model). Two tables: `public.series` (55 rows, UNIQUE name) and
`public.book_series` (234 links, PK (book_id, series_id), RLS read-only for
authenticated like phases/books). Seeded from BLGRPMasterMetadatav2.csv via
entry_id/name joins (UUIDs resolved at runtime, no hardcoded ids). order_label
preserves the raw CSV series_order losslessly; sort_position is derived
(omnibus=-100, short-prequel=-1, #n/n=n, short=9000, standalone=9999,
empty=NULL) with books.sort_order as runtime tiebreaker. Two CSV spelling
variants were canonicalised (The Twice-Dead King; Jarnhamar). The one true
work-level M:N case is the also_in cross-phase 'Apocalypse' (P3-30 & P5-13,
both #5 in Space Marine Conquests) — two book rows, one series position, which
a flat column could not have represented. useCatalog threads
series: { name, orderLabel, sortPosition } | null onto every book and sub-item;
RecursiveBookEntry renders a subtle gold SeriesBadge (#n / Omnibus shown,
sort-only pseudo-labels suppressed). Shipped in six commits: F-1 (433c630)
tables+RLS; F-2 (2aef069) seed 55 series; F-3 (41a01ec) seed 234 junction
links; F-4 (fd51cb5) thread series into useCatalog shape; F-5 (484431c) render
badge; F-6 (this) docs. Vercel production READY on 484431c.

**Sprint E.1 — catalog enrichment in Phase/Archive views (COMPLETE)**

Surfaced the enriched metadata from Sprint E's 349-row catalog in the UI:
location (+ segmentum), in-universe date, protagonist, spoiler-free summary,
and mood tags now render on catalog entries — on top-level books AND on
expanded omnibus children (children carry full enrichment in the DB; the
child render-shape was narrow). Also removed a redundant duplicate header in
the expanded phase panel. Shipped in seven commits (one intentional revert):
f032de1 top-level shape; f0f18a2 render into WRONG component (BookEntry.jsx,
dead code, reverted); aa799ac render into RecursiveBookEntry (the component the
phase view actually uses); 833d406 child shape; a0c6e3f render on expanded
omnibus children; 5fd5694 collapse redundant PhaseDetail header to a slim bar;
79a9d44 revert f0f18a2. Net over Sprint E: 3 files (useCatalog.js,
RecursiveBookEntry.jsx, PhaseDetail.jsx) — BookEntry.jsx nets to zero.
semantic_tags / key_characters / sub_faction / faction_primary are threaded
into the shape but deliberately NOT rendered yet (reserved for Map View / AI
Companion / faction filters). Vercel production READY on 79a9d44. Lesson in
CLAUDE.md (verify the render chain before a UI commit).

**Sprint E — catalog render from Supabase (COMPLETE)**

The frontend now renders the catalog from Supabase (phases + books) via the
new `useCatalog` hook, replacing the static project_data.json fetch. This
closes the frontend<->DB divergence from B-3c: the DB is now the single source
of truth for BOTH catalog and progress. Shipped in five commits: E-1 (52d4a00)
useCatalog hook; E-2a (af0099c) + E-2b (126e61f) move progress state keying
from title to entry_id (titles are non-unique in the 349-row catalog); E-3
(4986d6a) swap App.js catalog source JSON->useCatalog; E-4 (074864b) remove
the static project_data.json. Runtime-verified before the E-3 commit; Vercel
production READY on 074864b.

**Prior: Sprint B-3c — full BL-GRP metadata seed into Supabase (COMPLETE)**

Brought `public.books` from the partial 161-row B-2 catalog to the full,
metadata-enriched 349-row master from `BLGRPMasterMetadatav2.csv`. The
catalog is now the authoritative reading-list truth in the database (the
frontend still renders from static JSON — see Data Structure). Shipped in
three commits:

- B-3c-1 (`deca034`): add stable `entry_id` join-key to `books` (full
  `UNIQUE` constraint), backfill the 3 user_progress-bearing rows
  (P0-01/P0-03/P0-08) so their UUIDs survive the seed. Deliberately
  overrides the B-3b §5 decision not to store `entry_id` — title-based
  joining was proven unreliable (44 of 161 rows drift across naming,
  omnibus structure, and phase assignment).
- B-3c-2 (`b8db252`): full 349-row seed via `ON CONFLICT (entry_id)`
  upsert, two-pass (176 entries, then 173 sub-items with `parent_book_id`
  self-join). Applied through the Supabase SQL Editor in two atomic halves
  (the 274 KB file could not be routed reliably through `apply_migration`).
- B-3c-3 (`7df9c73`): guarded, atomic cleanup of the 158 legacy
  NULL-entry_id rows from the old B-2 seed.

DB verified post-sprint: 349 total, 0 NULL entry_id, 176 entries + 173
sub-items (133 `sub_item` + 40 `sub_item_optional`), 173 valid parent
links, 0 orphans, 3 user_progress links intact, apostrophes preserved in
text[] tags (e.g. `C'tan`, `El'Jonson`).

**Prior: Sprint B-2 — localStorage → Supabase data layer (COMPLETE)**

Replaced the localStorage progress layer with a Supabase-backed one.
Per-book progress now persists to `public.user_progress`; the catalog
still loads from the static JSON. Shipped in four commits:

- B-2a: `useSupabaseProgress` hook (title-keyed shape mirroring the old
  useLocalStorage signature; debounced diff-based upsert; phantom-parent-
  row guard for omnibus sub-items)
- B-2b-1: behavior-neutral refactor — extract `ArchiveApp` so the data
  layer renders under AuthGate (see CLAUDE.md lesson)
- B-2b-2: the actual swap, `useLocalStorage` → `useSupabaseProgress` in
  ArchiveApp
- B-2c: delete unused `useLocalStorage.js`

Verified locally and on the Vercel production deploy: top-level books,
omnibus sub-items, and updates all persist correctly to user_progress;
no phantom parent rows.

## Tech Stack — Current State

| Layer       | Current state                                | Target (Sprint B-2+)              |
|-------------|----------------------------------------------|-----------------------------------|
| Frontend    | React 19, Tailwind, plain react-scripts      | Unchanged                         |
| Build       | CRA-native, `baseUrl: "src"`, bare imports   | Unchanged                         |
| Dependencies| 12 (cleaned in B-0, down from 52)            | +1 (@supabase/supabase-js in B-1a)|
| State       | Supabase only (`useSupabaseProgress`)        | — (B-2 complete)                  |
| Auth        | None                                         | Supabase Magic Link (B-1b)        |
| Backend     | Supabase active: auth + user_progress (lifecycle status, B-3a) + books with 22 metadata cols (B-3b) seeded full 349-row catalog (B-3c) + series/book_series M:N (F) + tags/book_tags M:N mood scope (G) | — |
| Hosting     | Vercel, live, auto-deploys main              | Unchanged                         |

## Data Structure

The catalog render is sourced from Supabase (`public.phases` +
`public.books`) via the `useCatalog` hook, which reassembles the relational
rows into the `projectData` shape App.js renders from. 8 phases (id 0-7),
each with `books[]`. Books are either single novels
(`{entryId, title, author, pages, type, tags}`) or omnibuses with nested
`contents[]` for sub-items (`{entryId, title, pages, type}`). The static
`frontend/public/data/project_data.json` that previously drove the render
was removed in Sprint E (E-4).

Supabase `public.books` now holds the full master catalog: 349 rows
(176 entries + 173 sub-items) seeded from `BLGRPMasterMetadatav2.csv`
in Sprint B-3c, with all 22 BL-GRP metadata columns populated (pub_year,
location, protagonist, key_characters, faction, mood_tags, semantic_tags,
spoiler_free_summary, etc.). The stable join-key is `entry_id`
(e.g. `P0-01`, `P6-32.5`); sub-items link to parents via `parent_book_id`.

**Frontend↔DB divergence — CLOSED in Sprint E.** The frontend previously
rendered the catalog from the static 161-row `project_data.json` while the DB
carried the richer 349-row truth. Sprint E closed this gap: the catalog render
now comes from `public.phases` + `public.books` via `useCatalog`, and
`project_data.json` was removed (E-4). The DB is now the single source of
truth for both catalog and progress.

Per-book user progress is persisted in Supabase `public.user_progress`,
read and written via the `useSupabaseProgress` hook. The hook
reconstructs an `entry_id`-keyed in-memory object (since E-2a; titles are
non-unique in the 349-row catalog) from the relational rows, and writes
back via debounced diff-based upsert keyed on `(user_id, book_id)`. Each
entry/sub-item resolves to its `book_id` via `entry_id`; user_progress
still stores `book_id` (UUID) — only the in-memory indexing changed. The
hook skips writing phantom parent rows for omnibus containers that have no
progress of their own. The
`isSubItemRead()` helper in App.js still normalizes the old boolean
sub-item format for the in-memory shape.

Supabase progress schema (B-2, extended B-3a):
`public.user_progress` table with `user_id` (FK auth.users), `book_id`
(FK books.id), `status` ('unread'/'reading'/'read', NOT NULL), `is_read`
(generated column derived from status — read-only, can never diverge),
`started_at`, `rating` (1-5), `notes`, `completed_at`, `updated_at`. RLS
enforces `auth.uid() = user_id` for all writes and reads. The upsert path
writes `status`; `is_read` follows automatically.

## External Services

| Service  | Status | ID / URL                                                  |
|----------|--------|-----------------------------------------------------------|
| GitHub   | Active | WangerLab/TheInfinityArchive (auto-delete head branches ON)|
| Supabase | Active | Project ID `zekmlnnhczfdllbmxjec`, region `eu-central-1`, Free Tier. Dashboard: https://supabase.com/dashboard/project/zekmlnnhczfdllbmxjec |
| Vercel   | Active | Project `the-infinity-archive` (Hobby tier), prod URL https://the-infinity-archive-jade.vercel.app, Root Directory `frontend/`, auto-deploys `main`. Env vars `REACT_APP_SUPABASE_URL` + `REACT_APP_SUPABASE_ANON_KEY` set for Production + Preview. |

## Next Sprints (planned, not committed)

- **Reflection-Status sichtbar + filterbar (nächster Sprint, eigener Chat):**
  In der Campaign-Übersicht pro gelesenem Buch anzeigen, ob es reflektiert ist
  (Rating und/oder Chronicle vorhanden); in Auspex als Filter ("gelesen ohne
  Reflexion" etc.). OFFENE DESIGN-FRAGE zuerst klären: was heißt "reflektiert" —
  Rating, Chronicle, oder beides? `isReflectionPending` (in ArchiveDataContext)
  ist die halbe Miete; die Chronicle-Existenz-Prüfung (`bookProgress[id].chronicle`)
  kam im Context-Drop-Sprint dazu. Beides zusammenführen.
- **`calc(100vh-270px)` in Auspex kalibrieren (klein):** geerbter Wert aus
  PhaseView, nie gegen Auspex' realen Header gemessen.
- **Centralise the counting logic (small, high value):** one shared helper for
  globalStats / getPhaseStats / calculateStats. The triplication is what hid
  the nested-store reader for 40+ commits.
- **Doc reconcile (small):** handover .docx + feature-summary .docx still
  to be patched incrementally — two sprints behind now.
- **Service Record "Achievement Hall":** display-case / badge grid, gold
  frame. Needs a content-design decision first. The 40 sigils (512px) are
  asset reserve and can render larger than 32px there.
- **Palette migration v1.0 → v1.3 (deferred):** ~123 hard-wired
  text-gold/text-auspex/text-plasma utilities to token consumption.
- **Analysis View:** content-design session before build.
- **AI Recommendation Companion / Strategium:** Anthropic-API read-advisor. Konzept specced 2026-07-20 — siehe "## Strategium — Concept (Pre-Build, 2026-07-20)" unten und `TIA-Strategium-Concept-2026-07-20.md` im Project Knowledge. Ein Daten-Sprint (Alliance-Mapping, parent_faction, prominence, Sigil-Vervollständigung) geht dem Frontend voraus.
- **Map View:** galactic map via location_primary / location_segmentum.
- **BL-GRP:** finish Phase 1 (Infinite and the Divine, Ahriman saga),
  then Phases 2–7.

## Strategium — Concept (Pre-Build, 2026-07-20)

**Status:** Konzept-Spec aus der Session 2026-07-20. Kein committed Scope. Vollspec: `TIA-Strategium-Concept-2026-07-20.md` im Project Knowledge.

**Role.** AI reading-advisor console (`/strategium`, "THE STRATEGIUM ADVISES"). Owns the taste/faction-affinity axis + advice — distinct from Campaign (phase sequence), Oculus/Map (geography), Auspex (flat filtering). Boundary vs Oculus: the meta-map clusters by grand alliance/faction, NOT geography — alliances don't cluster spatially, so it cannot duplicate the segmentum map.

**Layout.** 2/3 living meta-map left, 1/3 advisory right, both visible. Click a recommended node → right panel shows that book's detail. Map ↔ card coupled.

**Meta-map.** Three fixed alliance volumes, box size proportional to faction count: Imperium ~24, Chaos ~12, Xenos ~8 (from distinct `faction_primary`). Static frame; nodes carry faction sigils. Two visible tiers: alliance + faction node; mid-tier (Astartes → chapters) is an expansion target, not a permanent layer. `prominence` drives node radius.

**Fluid physics (anchored).** d3-force: forceCollide + forceX/Y to fixed home anchors + bounding-box clamp per tick. Anchored, not free-drift (keeps map recognisable). Anchor strength = one fixed code value (mid-firm), NOT a user setting. Freeze sim after settle on mobile.

**Recommendation moment.** Position = faction of last-completed book. Three vectors = three recs; geometry is the classification (Continuation = short/same alliance; Deepening = into cluster core; Pivot = long/cross-alliance). Auto-expand latch: a rec targeting a sub-faction auto-expands its parent and keeps it open until the next query (distinct from transient hover-expand). Read-state dimming overlay.

**LLM contract.** Edge Function pulls history + reflections + phase docs + unread candidates (summaries + semantic_tags + faction + phase) + Tim's free-text intent. Output: exactly 3, each = existing short summary + personalised rationale (references prior reflections) + vector class + deviation-consequence line (from phase docs). Recs ephemeral/runtime-only; `recommendations_log` records the event.

**Data prerequisites (data sprint BEFORE frontend):** grand-alliance mapping (no column today), `parent_faction` grouping (Astartes→chapters, Chaos→gods), `prominence` signal, sigil completion for ~62 NULL factions.

**QoL staffelung.** Build: read-state dimming, map↔card highlight, rationale-on-vector-hover. Later: vector draw-in animation, position-glide on "Set as next" (map re-plots). Skip: mood-lens (Auspex' job), saga-progress rings (noise).

**Open frictions:** in-situ auto-expand (not promote-and-pin) → payload must carry "expand parent + dock here"; vectors need curved routing around nodes; vectors follow-after-settle; right panel hybrid (assessment + tappable rows) vs. three full cards — confirm before build.

## Cross-Project Note

The Infinity Archive consumes data curated in the BL-GRP project (in
Claude.ai). The BL-GRP phase files (`BL-GRP-NN-*.docx`) are the source
of truth for the reading list. When phase files change in ways that
affect the app's data shape (new books, restructured phases, new
factions), update the Supabase catalog (`public.phases` + `public.books`
tables) — the single source of truth for the app render since Sprint E.
This sync is manual for now.
