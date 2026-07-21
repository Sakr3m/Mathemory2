# Mathemory — contesto per Claude Code

Hub di giochi matematici su GitHub Pages, account Sakr3m. Tre repo:
- **Mathemory** = produzione (sito vero, banner Adsterra attivi). Qualunque errore qui è un problema serio.
- **Mathemory2** = test/sperimentazione (stessi file, mai banner attivi). Se qualcosa si rompe qui, si corregge e si va avanti, non è grave.
- **Mathemory3** = demo per Itch.io (Eratostene, 25 livelli).

Squadra di 3 agenti:
- **scrittore** — unico che scrive codice, applica le segnalazioni di bug-optimizer e revisore
- **bug-optimizer** — sola lettura, caccia bug logici/di timing e problemi di performance
- **revisore** — sola lettura, giudica conformità alle regole ferree prima di ogni merge verso Mathemory

## Le 6 regole ferree (valgono sempre, non solo per gli esperimenti in corso)

1. Mai toccare i banner pubblicitari di Mathemory, soprattutto quando si portano aggiornamenti da Mathemory2 a Mathemory.
2. Pulsanti di skip livelli o reset salvataggio: solo su Mathemory2, mai su Mathemory, nemmeno se richiesto esplicitamente per errore in futuro.
3. Index su Mathemory: il carosello mostra sempre e solo UNA schermata "Coming Soon" oltre ai giochi già pubblicati (es. 7 giochi reali = massimo 8 coppie di card). Su Mathemory2 sempre sbloccato fino alla 12ª coppia di card.
4. Modalità di gioco bloccate da un requisito (es. finire la modalità principale): su Mathemory2 sempre sbloccate, anche duplicate in due pulsanti (uno bloccato e uno libero) per test paralleli.
5. Ogni modifica su Mathemory2 va fatta prima per PC, poi adattata per mobile se necessario. Su Mathemory, se l'aggiornamento riguarda entrambe le versioni, si applicano insieme ma con attenzione extra.
6. Mai toccare il codice di Mathemory che legge/scrive le classifiche o invia i dati del popup nickname al Worker Cloudflare, a meno che la stessa modifica non sia già stata validata su Mathemory2. Attenzione extra durante aggiornamenti dell'index.

## Note tecniche

- Progetto statico HTML/JS/CSS, nessun build tool.
- Playwright è disponibile via npm per verifiche di rendering reale (screenshot, misurazione posizioni/margini) quando una modifica riguarda layout o CSS.
- Worker Cloudflare per le classifiche: `https://eratostene.sl-eternal-lux.workers.dev`
