// mathemory-audio.js — sistema audio condiviso su tutto il sito:
// mute globale, volumi musica/effetti, popup PC con 2 slider, comportamento mobile con standby.
// Le scelte sono salvate in localStorage e valgono su TUTTE le pagine (index + le 3 modalità).
// Il pulsante audio è HTML statico su ogni pagina (presente fin dal primo istante), quindi
// questo script può legarsi direttamente, senza bisogno di osservare il DOM o delegare eventi.
(function(){
  const MUTED_KEY = 'mathemory_muted';
  const MUSIC_VOL_KEY = 'mathemory_music_vol';
  const SFX_VOL_KEY = 'mathemory_sfx_vol';
  const DEFAULT_MUSIC_VOL = 40;
  const DEFAULT_SFX_VOL = 100;

  function isMobile(){ return window.innerWidth <= 900; }

  // ogni pagina imposta window.MATHEMORY_MUSIC_VOLUME_MULTIPLIER = { desktop: X, mobile: Y }
  // prima di caricare questo file. Se manca, o manca un lato, quel lato vale 1 (nessuna modifica)
  function getMusicVolumeMultiplier(){
    const m = window.MATHEMORY_MUSIC_VOLUME_MULTIPLIER;
    if (!m || typeof m !== 'object') return 1;
    const value = isMobile() ? m.mobile : m.desktop;
    return typeof value === 'number' ? value : 1;
  }

  function getMusicVol(){
    const v = localStorage.getItem(MUSIC_VOL_KEY);
    return v === null ? DEFAULT_MUSIC_VOL : parseInt(v);
  }
  function getSfxVol(){
    const v = localStorage.getItem(SFX_VOL_KEY);
    return v === null ? DEFAULT_SFX_VOL : parseInt(v);
  }
  function setMusicVol(v){
    localStorage.setItem(MUSIC_VOL_KEY, String(v));
    applyMusicPlayback();
  }
  function setSfxVol(v){
    localStorage.setItem(SFX_VOL_KEY, String(v));
  }


  // stato EFFETTIVO tenuto in memoria: rispecchia sempre la situazione reale (audio che suona o no)
  let runtimeMuted = null;
  function isMuted(){
    return runtimeMuted === null ? true : runtimeMuted;
  }
  function setMuted(val){
    runtimeMuted = val;
    localStorage.setItem(MUTED_KEY, val ? 'true' : 'false');
    applyMusicPlayback();
    updateAllButtons();
  }

  const MUSIC_POSITION_KEY = 'mathemory_music_position'; // { src, time } — per continuare la musica tra un livello e l'altro invece di farla ripartire da zero

  const bgMusic = document.getElementById('bgMusic');
  const buttons = document.querySelectorAll('.audio-toggle-btn');

  // ripristino la posizione SOLO alla primissima riproduzione di questa pagina (non ogni volta
  // che si smuta/rimuta durante la stessa visita, altrimenti tornerebbe indietro ogni volta)
  let musicPositionRestored = false;
  function restoreMusicPositionOnce(){
    if (musicPositionRestored || !bgMusic) return;
    musicPositionRestored = true;
    try {
      const saved = JSON.parse(sessionStorage.getItem(MUSIC_POSITION_KEY) || 'null');
      if (saved && saved.src === bgMusic.src && typeof saved.time === 'number' && isFinite(saved.time)){
        bgMusic.currentTime = saved.time;
      }
    } catch(e){}
  }
  function saveMusicPosition(){
    if (!bgMusic || !bgMusic.src) return;
    try {
      sessionStorage.setItem(MUSIC_POSITION_KEY, JSON.stringify({ src: bgMusic.src, time: bgMusic.currentTime }));
    } catch(e){}
  }
  // 'pagehide' e piu affidabile di 'beforeunload' su mobile (Safari in particolare)
  window.addEventListener('beforeunload', saveMusicPosition);
  window.addEventListener('pagehide', saveMusicPosition);

  // volume "normale" che la musica dovrebbe avere in questo momento, secondo le impostazioni
  // (usato sia per l'avvio normale sia per tornare al volume giusto dopo un abbassamento temporaneo)
  function normalMusicVolume(){
    return Math.min(1, (getMusicVol() / 100) * getMusicVolumeMultiplier());
  }

  // abbassamento temporaneo della musica (es. mentre suona badge/winner), poi torna al volume
  // giusto da sola. Un contatore gestisce eventuali sovrapposizioni (es. badge e winner insieme):
  // il volume torna normale solo quando TUTTI gli abbassamenti attivi sono finiti
  let duckActive = 0;
  // porta la musica a un volume ASSOLUTO fisso (es. 0.15 = 15%, qualunque sia il volume
  // normale di partenza), non la abbassa di un tot rispetto a dove si trova. Il volume
  // normale torna da solo, invariato, una volta finiti tutti gli abbassamenti attivi
  function duckMusic(targetVolume, durationMs){
    if (!bgMusic) return;
    duckActive++;
    bgMusic.volume = Math.max(0, Math.min(1, targetVolume));
    setTimeout(() => {
      duckActive = Math.max(0, duckActive - 1);
      if (duckActive === 0) bgMusic.volume = normalMusicVolume();
    }, durationMs);
  }

  // moltiplicatore di volume specifico per pagina: ogni pagina lo imposta a modo
  // suo (con una riga prima di caricare questo file) o lo lascia non impostato
  // (= 1, nessuna modifica). Cosi si puo alzare/abbassare la musica di UNA sola
  // pagina senza toccare le altre. Il risultato finale resta comunque bloccato
  // al 100% (1.0), il tetto massimo valido per il volume di un elemento audio
  function applyMusicPlayback(){
    if (!bgMusic) return;
    restoreMusicPositionOnce();
    bgMusic.volume = normalMusicVolume();
    if (isMuted()) bgMusic.pause();
    else bgMusic.play().catch(() => {});
  }

  function updateAllButtons(){
    // l'icona resta sempre la stessa (non cambia più tra muto/attivo): lo stato si
    // vede solo dall'accensione del pulsante, come i numeri selezionati nella griglia
    buttons.forEach(btn => { btn.classList.toggle('audio-on', !isMuted()); });
  }

  function hasUserChoice(){ return localStorage.getItem(MUTED_KEY) !== null; }

  // --- stato iniziale: eredita la scelta fatta in precedenza (su questa o un'altra pagina) ---
  // eredita la scelta salvata: icona corretta subito, riparte al primo tocco se il browser blocca l'avvio
  function tryResumeInherited(){
    runtimeMuted = localStorage.getItem(MUTED_KEY) === 'true';
    updateAllButtons();
    restoreMusicPositionOnce(); // sempre, anche se muto: la posizione e' pronta per quando riprende

    if (runtimeMuted || !bgMusic){
      if (bgMusic) bgMusic.pause();
      return;
    }

    bgMusic.volume = normalMusicVolume();
    const p = bgMusic.play();
    if (p && p.catch){
      p.catch(() => {
        function resumeOnce(){
          bgMusic.play().catch(() => {});
          document.removeEventListener('click', resumeOnce);
          document.removeEventListener('touchstart', resumeOnce);
        }
        document.addEventListener('click', resumeOnce, { once: true });
        document.addEventListener('touchstart', resumeOnce, { once: true });
      });
    }
  }

  function forceMutedStart(){
    runtimeMuted = true;
    localStorage.setItem(MUTED_KEY, 'true'); // scrivo esplicitamente: diventa la scelta "attuale" per le pagine successive
    restoreMusicPositionOnce();
    if (bgMusic) bgMusic.pause();
    updateAllButtons();
  }

  function initAudioState(){
    if (hasUserChoice()){
      tryResumeInherited();
      return;
    }

    // nessuna scelta esplicita ancora fatta: parte sempre spento (audio reale E icona),
    // stessa regola su PC e mobile, finché non si interagisce col pulsante
    forceMutedStart();
  }

  // --- standby: quando lo schermo si spegne o la scheda va in background, la musica va in pausa ---
  document.addEventListener('visibilitychange', () => {
    if (!bgMusic) return;
    if (document.hidden) bgMusic.pause();
    else if (!isMuted()) bgMusic.play().catch(() => {});
  });

  // --- pannello volumi, solo PC: ancorato al pulsante, compare in hover (non al click) e
  // resta visibile finché il mouse è sopra di lui o sul pulsante stesso. 2 slider (musica
  // sopra, effetti sotto), step del 10% — costruito una sola volta, riposizionato ad ogni
  // comparsa in base al pulsante che l'ha aperto (la pagina può averne più di uno: PC/mobile) */
  function buildVolumePanel(){
    if (document.getElementById('volumePanel')) return;
    const panel = document.createElement('div');
    panel.id = 'volumePanel';
    panel.style.cssText = 'position:fixed; z-index:2000; background:var(--bg-panel); border:1px solid var(--rule); border-radius:10px; padding:1rem 1.2rem; box-sizing:border-box; width:300px; opacity:0; visibility:hidden; pointer-events:none; transition:opacity 0.15s ease;';
    panel.innerHTML = `
      <div class="audio-slider-row" style="margin-bottom:0.7rem; gap:0.9rem;">
        <label style="width:auto; flex-shrink:0;">Music</label>
        <input type="range" id="musicVolSlider" min="0" max="100" step="10" value="${getMusicVol()}" style="flex:1; min-width:0;">
        <span id="musicVolLabel" style="width:2.6rem; flex-shrink:0;">${getMusicVol()}%</span>
      </div>
      <div class="audio-slider-row" style="margin-bottom:0; gap:0.9rem;">
        <label style="width:auto; flex-shrink:0;">SFX</label>
        <input type="range" id="sfxVolSlider" min="0" max="100" step="10" value="${getSfxVol()}" style="flex:1; min-width:0;">
        <span id="sfxVolLabel" style="width:2.6rem; flex-shrink:0;">${getSfxVol()}%</span>
      </div>
    `;
    document.body.appendChild(panel);
    // il mouse resta "dentro" il gruppo pulsante+pannello anche attraversando il piccolo
    // spazio tra i due: hover sul pannello stesso lo tiene aperto allo stesso modo
    panel.addEventListener('mouseenter', () => { clearTimeout(hidePanelTimer); });
    panel.addEventListener('mouseleave', scheduleHidePanel);
    document.getElementById('musicVolSlider').addEventListener('input', (e) => {
      setMusicVol(parseInt(e.target.value));
      document.getElementById('musicVolLabel').textContent = e.target.value + '%';
    });
    document.getElementById('sfxVolSlider').addEventListener('input', (e) => {
      setSfxVol(parseInt(e.target.value));
      document.getElementById('sfxVolLabel').textContent = e.target.value + '%';
    });
  }
  let hidePanelTimer = null;
  function showVolumePanel(btn){
    // niente pannello se il pulsante non è davvero visibile ancora (es. prima che il gate
    // d'ingresso lo riveli, o prima che positionIndexSoundBtn() lo posizioni sul serio):
    // altrimenti si apre ancorato a una posizione ancora provvisoria/sbagliata
    const style = getComputedStyle(btn);
    const rect = btn.getBoundingClientRect();
    if (btn.offsetParent === null || style.opacity === '0' || style.visibility === 'hidden' || (rect.width === 0 && rect.height === 0)){
      return;
    }
    buildVolumePanel();
    const panel = document.getElementById('volumePanel');
    // di fianco al pulsante, con un margine reale (non attaccato) e centrato verticalmente
    // rispetto a lui — misuro l'altezza del pannello ORA che esiste già nel DOM, per
    // calcolare il centro esatto invece di allinearlo al bordo superiore del pulsante
    const panelHeight = panel.offsetHeight;
    panel.style.top = (rect.top + rect.height / 2 - panelHeight / 2) + 'px';
    panel.style.right = 'auto';
    panel.style.left = (rect.right + 18) + 'px';
    clearTimeout(hidePanelTimer);
    panel.style.opacity = '1';
    panel.style.visibility = 'visible';
    panel.style.pointerEvents = 'auto';
  }
  function scheduleHidePanel(){
    clearTimeout(hidePanelTimer);
    hidePanelTimer = setTimeout(() => {
      const panel = document.getElementById('volumePanel');
      if (!panel) return;
      panel.style.opacity = '0';
      panel.style.visibility = 'hidden';
      panel.style.pointerEvents = 'none';
    }, 150); // piccolo margine per attraversare lo spazio tra pulsante e pannello senza che si chiuda
  }

  // --- collego i pulsanti audio della pagina (index ne ha 2: PC e mobile) ---
  buttons.forEach(btn => {
    // PC: click singolo alterna sempre muto/smutato, come su mobile — il pannello volumi
    // si apre e si chiude solo con l'hover, mai col click
    btn.addEventListener('click', () => {
      setMuted(!isMuted());
    });
    btn.addEventListener('mouseenter', () => {
      if (isMobile()) return; // il touch non deve mai aprire il pannello
      showVolumePanel(btn);
    });
    btn.addEventListener('mouseleave', () => {
      if (isMobile()) return;
      scheduleHidePanel();
    });
  });

  // esposto globalmente: le pagine di gioco lo usano per gli effetti sonori (Web Audio API);
  // "init" serve solo a index.html, per avviare l'audio nel momento esatto in cui si preme
  // il titolo Mathemory, con un vero gesto dell'utente alle spalle — rispetta la preferenza
  // già salvata (riparte attivo se l'utente l'aveva attivato prima), muto solo se non c'è
  // ancora nessuna scelta esplicita
  window.MathemoryAudio = {
    isMuted,
    setMuted,
    getMusicVol,
    getSfxVol,
    getSfxVolume: () => getSfxVol() / 100,
    setMusicVol,
    setSfxVol,
    duckMusic,
    init: initAudioState,
  };

  // MATHEMORY_DEFER_AUDIO_INIT: solo index.html lo imposta, per rimandare l'avvio a dopo
  // il click sul gate d'ingresso invece che a caricamento pagina. Tutte le altre pagine
  // (qui la variabile resta undefined) si comportano esattamente come prima
  if (!window.MATHEMORY_DEFER_AUDIO_INIT) initAudioState();
})();
