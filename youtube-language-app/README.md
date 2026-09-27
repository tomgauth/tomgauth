# App d'apprentissage de langue à partir de YouTube (MVP)

Deux briques, comme dans la spec :

- `generator/` (Python) : une URL YouTube → un deck JSON de phrases réelles, avec timestamps, niveau, traduction et notes. Export Anki en bonus.
- `app/` (PWA React + Vite + Dexie) : charge un deck, boucle d'étude (écoute → révélation → auto-évaluation), SM-2 intégré, données en IndexedDB, installable et utilisable hors ligne.

## Brique A : le générateur

```bash
cd generator
python -m venv .venv && source .venv/bin/activate
pip install -e .

# Une vidéo → un deck B1 en allemand, traduit en anglais, avec notes LLM
export ANTHROPIC_API_KEY=sk-ant-...
ytlang "https://www.youtube.com/watch?v=XXXXXXXXXXX" --lang de --level B1 --title "Wohnungssuche" --out deck.json

# Sans LLM (pas de traduction), et export Anki en plus
ytlang XXXXXXXXXXX --lang de --level A2 --no-llm --out deck.json --anki deck.tsv

# Boucle dev hors ligne : sauvegarder les sous-titres une fois, puis rejouer
ytlang XXXXXXXXXXX --lang de --save-transcript raw.json --no-llm
ytlang --from-transcript raw.json --lang de --level B2 --out deck.json
```

Pipeline (`ytlang/`) :

| Étape | Fichier | Ce que ça fait |
|---|---|---|
| 1 | `transcript.py` | Sous-titres YouTube automatiques avec timestamps (`youtube-transcript-api`) |
| 2 | `segment.py` | Découpage en phrases : ponctuation, pauses, puis coupe au point de rupture le plus naturel |
| 3 | `difficulty.py` | Score longueur + fréquence des mots (`wordfreq`), ramené à une bande CEFR |
| 4 | `cli.py` | Filtrage par niveau et par longueur, répartition sur toute la vidéo (`--max-cards`) |
| 5 | `enrich.py` | Passe LLM (Claude, sorties structurées) : traduction + note + mots clés, une fois pour toutes |
| 6 | `deck.py` | Deck JSON (schema 1) et TSV Anki |

Options utiles : `--translate-to fr`, `--min-level A2`, `--min-words 3 --max-words 14`, `--pause 0.7`, `--max-cards 60`, `--model`.

Tests : `pytest` (fixture allemande hors ligne dans `tests/fixtures/`).

## Brique B : la PWA

```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ prêt à déployer sur n'importe quel hébergeur statique
npm test
```

- Accueil : liste des decks avec compteurs (à revoir, nouvelles, apprises), import d'un JSON, deck d'exemple.
- Étude : clip YouTube qui démarre et s'arrête aux bornes de la phrase, bouton Révéler, phrase + traduction + note + mots clés, quatre boutons (Again / Hard / Good / Easy) qui nourrissent SM-2. Clavier : Espace pour révéler, 1 à 4 pour noter, r pour rejouer.
- Hors ligne : tout marche sauf la vidéo elle-même (un message le dit). Le service worker précache l'app.
- Réimporter un deck garde l'historique de révision des cartes déjà connues (même id de carte).

Le deck d'exemple (`app/public/decks/wohnungssuche-de.json`) vient de la fixture de test : son id vidéo est un placeholder, donc le clip ne charge pas. Génère un vrai deck avec le CLI pour voir la vidéo.

## Format du deck (schema 1)

```json
{
  "schema": 1, "id": "...", "title": "...", "lang": "de", "translationLang": "en", "level": "B1",
  "videoId": "...", "videoUrl": "...", "createdAt": "...",
  "cards": [{ "id": "...", "text": "...", "start": 12.3, "end": 15.8, "translation": "...", "note": "...",
              "keyWords": ["..."], "level": "A2", "score": 41.0, "hardestWords": ["..."], "tags": ["de", "A2"] }]
}
```

## Suite (hors MVP)

Recherche par thème ou par chaîne (multi-vidéos), sync Supabase, branchement à l'appli SOLV. Ces trois points sont déjà prévus par la structure : le générateur produit des decks indépendants, la PWA en importe autant qu'on veut.
