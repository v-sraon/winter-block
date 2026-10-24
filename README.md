# Winter Block

A phone web app (PWA) for a 16-week winter training block: climbing, strength, running, Abrahangs and yoga. It works offline, installs to the iPhone home screen, and keeps all data on the device.

## The plan it follows

| Day | Session | Every day |
|---|---|---|
| Mon | Rest: Yoga Flow A (hips, hamstrings, calves) | Abrahangs (~10 min) |
| Tue | Climb (Tension Board / spray wall) | + daily stretch |
| Wed | Lift A (+ Run #2 from week 5) | (yoga replaces the |
| Thu | Climb | stretch on rest days) |
| Fri | Rest: Yoga Flow B (shoulders, upper back, forearms) | |
| Sat | Run 10 km (+ optional Lift C, core & prehab) | |
| Sun | Lift B | |

- Starts Mon Oct 26 2026 and ends Sun Feb 14 2027. Weeks 4, 8, 12 and 16 are deloads.
- Wednesday run: 6 km in weeks 5–8, 8 km in weeks 9–12, 10 km in weeks 13–16. Deload weeks run ~70%.
- Lifts use double progression. Hit the top of the rep range on every set and the next session suggests +2.5 kg (or +1.25 kg for upper body). Miss the bottom of the range twice and it suggests −10%.
- You can change everything in **Settings**: layout, lift days, flows, Abrahangs timing and grips, running plan, start date, kg/lb, V/Font.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173 (also on your LAN for testing on the phone)
npm test         # plan generator, progression, timer and backup tests
npm run build    # production build in dist/
```

## Put it on your iPhone

1. Host `dist/` anywhere static, for example with the included GitHub Pages workflow: push to `main` on GitHub, then set **Settings → Pages → Source: GitHub Actions**.
2. Open the URL in Safari, tap **Share → Add to Home Screen**.
3. Open it from the home screen. It works offline from then on.

## Good to know

- **Back up.** Data lives only on the phone (IndexedDB). Use **Settings → Backup → Export** and keep the file in Files/iCloud. The app reminds you weekly.
- **Timer sounds.** Beeps and voice cues need the ringer switch on. The screen stays awake while a timer runs.
- **Abrahangs timing.** 10 s on / 20 s off for 10 min across 6 grips comes from public write-ups of Emil Abrahamsson's protocol. Adjust it to match the version you follow.
