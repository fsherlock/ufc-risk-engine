       const buildBtn = document.getElementById("buildBtn");
      const calcBtn = document.getElementById("calcBtn");
      const resetBtn = document.getElementById("resetBtn");
      const exportBtn = document.getElementById("exportBtn");
      const fightCountEl = document.getElementById("fightCount");
      const bankrollEl = document.getElementById("bankroll");
      const fightsContainer = document.getElementById("fightsContainer");
      const resultsContainer = document.getElementById("resultsContainer");
      const riskSummary = document.getElementById("riskSummary");
      const fightCountError = document.getElementById("fightCountError");
      const bankrollError = document.getElementById("bankrollError");
      const loadingMsg = document.getElementById("loadingMsg");
      const calcError = document.getElementById("calcError");
      const strategyAllocations = { Kelly: 100, "Equal Stake": 100, YOLO: 100, Singles: 100 };
      let lastStrategies = null;

      // Helper: Convert American to Decimal
      function americanToDecimal(odds) {
        if (!odds) return 0;
        const o = parseInt(odds, 10);
        if (isNaN(o)) return 0;
        if (o > 0) return o / 100 + 1;
        return 100 / Math.abs(o) + 1;
      }
      // Helper: Convert Decimal to American (for display if needed)
      function toAmerican(dec) {
        if (dec >= 2) return "+" + Math.round((dec - 1) * 100);
        return Math.round(-100 / (dec - 1));
      }
      function validateConfig() {
        let valid = true;
        const fc = parseInt(fightCountEl.value);
        const br = parseFloat(bankrollEl.value);
        if (isNaN(fc) || fc < 1 || fc > 20) {
          fightCountError.classList.remove("hidden");
          valid = false;
        } else {
          fightCountError.classList.add("hidden");
        }
        if (isNaN(br) || br <= 0) {
          bankrollError.classList.remove("hidden");
          valid = false;
        } else {
          bankrollError.classList.add("hidden");
        }
        return valid;
      }
      function formValid() {
        const rows = document.querySelectorAll(".fight-card");
        if (rows.length === 0) return false;
        let allGood = true;
        rows.forEach((row) => {
          const nameInput = row.querySelector(".fighter-name");
          const oddsInput = row.querySelector(".fighter-odds");
          const confInput = row.querySelector(".fighter-confidence");
          const errName = row.querySelector(".error-name");
          const errOdds = row.querySelector(".error-odds");
          const errConf = row.querySelector(".error-confidence");
          if (!nameInput.value.trim()) {
            errName.textContent = "Name required";
            errName.classList.remove("hidden");
            allGood = false;
          } else {
            errName.classList.add("hidden");
          }
          const odds = parseFloat(oddsInput.value);
          if (isNaN(odds) || odds <= 1.0) {
            errOdds.textContent = "Valid decimal odds > 1.0 required";
            errOdds.classList.remove("hidden");
            allGood = false;
          } else {
            errOdds.classList.add("hidden");
          }
          const conf = parseInt(confInput.value);
          if (isNaN(conf) || conf < 50 || conf > 100) {
            errConf.textContent = "Confidence 50-100 required";
            errConf.classList.remove("hidden");
            allGood = false;
          } else {
            errConf.classList.add("hidden");
          }
        });
        return allGood;
      }

      function calculateWinProbability(stats) {
          // Heuristic Model based on available stats
          let score = 50; // Base neutral score

          if (!stats) return score;

          // 1. Win Rate Impact
          const totalFights = stats.wins + stats.losses + stats.draws;
          if (totalFights > 0) {
              const winRate = stats.wins / totalFights;
              // Bonus for high win rate (> 70%), penalty for low (< 50%)
              score += (winRate - 0.5) * 40; 
          }

          // 2. Experience Factor (Logarithmic scale)
          // More fights = more reliable, slight edge for veterans up to a point
          if (totalFights > 5) score += 5;
          if (totalFights > 20) score -= 2; // Wear and tear penalty? keeping simple for now.

          // 3. Reach Advantage (Contextual) - Needs opponent context, but we can score raw athleticism
          // For now, raw stats are static. True prediction needs comparative delta.
          // We will refine this when comparing A vs B.

          return Math.min(95, Math.max(5, score));
      }

      function predictFightOutcome(fighterA, fighterB) {
          // Default statuses
          let statusA = "neutral";
          let statusB = "neutral";

          if (!fighterA || !fighterB) return { fighterAStatus: statusA, fighterBStatus: statusB };

          // Comparative Logic
          let scoreA = calculateWinProbability(fighterA);
          let scoreB = calculateWinProbability(fighterB);

          // Adjust for Physical Advantages
          if (fighterA.reach && fighterB.reach) {
             const rA = parseInt(fighterA.reach);
             const rB = parseInt(fighterB.reach);
             if (rA > rB + 5) scoreA += 5; // Significant reach advantage
             if (rB > rA + 5) scoreB += 5;
          }
          
          // Height Advantage
           if (fighterA.height && fighterB.height) {
             const hA = parseInt(fighterA.height);
             const hB = parseInt(fighterB.height);
             if (hA > hB + 7) scoreA += 2; 
             if (hB > hA + 7) scoreB += 2;
          }

          // Adjust for Stance (Southpaw Advantage vs Orthodox)
          if (fighterA.stance && fighterB.stance) {
             const sA = fighterA.stance.toLowerCase();
             const sB = fighterB.stance.toLowerCase();
             // Southpaw vs Orthodox: Southpaw gets edge
             if (sA.includes("southpaw") && sB.includes("orthodox")) scoreA += 3;
             if (sB.includes("southpaw") && sA.includes("orthodox")) scoreB += 3;
          }
          
          // Experience / Win Rate Edge
          const calcRate = (s) => {
              const t = (s.wins||0) + (s.losses||0) + (s.draws||0);
              return t > 0 ? (s.wins/t) : 0;
          };
          const rateA = calcRate(fighterA);
          const rateB = calcRate(fighterB);
          
          // Normalize to probabilities summing to ~100 (ignoring draw)
          const totalScore = scoreA + scoreB;
          const probA = (scoreA / totalScore) * 100;
          const probB = (scoreB / totalScore) * 100;

          // Apply Rules
          // Lock: > 70%
          // Fade: < 40% (which implies opponent is > 60%, close to lock)
          
          if (probA > 65) statusA = "lock"; // Relaxed threshold slightly for demo
          else if (probA < 35) statusA = "fade";
          
          if (probB > 65) statusB = "lock";
          else if (probB < 35) statusB = "fade";

          // Mutual exclusivity check (can't both be locks)
          if (statusA === "lock" && statusB === "lock") { statusA = "neutral"; statusB = "neutral"; }

          return { fighterAStatus: statusA, fighterBStatus: statusB, probA, probB };
      }
      
      function runPredictionForCard(card) {
          const fA_Input = card.querySelector('.fighter-name[placeholder="Fighter A"]');
          const fB_Input = card.querySelector('.fighter-name[placeholder="Fighter B"]');
          
          // We need the hidden stats we stored on the input element or parent wrapper
          // Problem: The input value is just text. The stats are lost after selection unless stored.
          // Solution: We need to retrieve the stats stored in the DOM or re-fetch.
          // Let's rely on the `dataset.stats` we attached to the autocomplete item.
          // But that item is gone. We need to store selected fighter stats on the CARD itself.
      }
      // --- SOUND EFFECTS ---
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      function playClickSound() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      }

      // Attach sound to all buttons
      document.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.classList.contains('autocomplete-item')) {
              playClickSound();
          }
      });

      // --- PREDICTION ENGINE END ---

      // --- API INTEGRATION START ---
      const API_KEY = "f7964d13-c1ff-4d83-b6f9-f1fe8d7e84a8";
      // const API_URL = "https://api.balldontlie.io/mma/v1"; // Deprecated/Unreliable for this context

      // Cache to prevent excessive API calls
      const fighterCache = new Map();

      /**
       * Unified Search Function
       * Strategy: Manual DB (Instant) -> TheSportsDB (Rich) -> Basic List (Fallback)
       */
      async function searchFightersAPI(query) {
          if (!query || query.length < 2) return [];
          const qLower = query.toLowerCase();
          
          // 1. Check Manual Stats Map First (Fastest & Most Accurate)
          // We convert the Map to an Array of objects on the fly for search
          const localMatches = Object.keys(fighterStatsMap)
              .filter(name => name.toLowerCase().includes(qLower))
              .map(name => ({ 
                  name, 
                  ...fighterStatsMap[name],
                  source: 'manual' // Tag source for debugging
              }));
          
          if (localMatches.length > 0) return localMatches;

          // 2. Check Cache
          if (fighterCache.has(qLower)) return fighterCache.get(qLower);

          try {
              // 3. Try TheSportsDB (Real Bio Data)
              // Note: Free key '3' is rate limited, but works for demos.
              const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(query)}`);
              const data = await res.json();
              
              if (data && data.player && data.player.length > 0) {
                  // Filter for Fighting/MMA
                  const fighters = data.player.filter(p => p.strSport === "Fighting" || p.strSport === "MMA");
                  
                  if (fighters.length > 0) {
                      const results = fighters.map(f => {
                          // Parse Height (e.g., "6 ft 4 in (1.93 m)" -> "193cm")
                          let h = f.strHeight;
                          if (h && h.includes("m)")) {
                              const match = h.match(/\(([\d\.]+) m\)/);
                              if (match) h = Math.round(parseFloat(match[1]) * 100) + "cm";
                          } else if (h && h.includes("m")) {
                              h = Math.round(parseFloat(h) * 100) + "cm";
                          }
                          
                          return {
                              name: f.strPlayer,
                              nickname: null, // TheSportsDB doesn't always have strNickname easily accessible in this view
                              wins: null, // Record not in search
                              losses: null,
                              draws: 0,
                              height: h || null,
                              reach: null, // Reach not in search
                              stance: null,
                              id: f.idPlayer,
                              thumb: f.strThumb,
                              status: f.strStatus, // "Active" or "Retired"
                              source: 'api'
                          };
                      });
                      fighterCache.set(qLower, results);
                      return results;
                  }
              }
          } catch (e) {
              console.warn("API Error, falling back to basic DB:", e);
          }
          
          // 4. Fallback to basic DB (Names only)
          return fightersDB
                .filter(name => name.toUpperCase().includes(query.toUpperCase()))
                .slice(0, 5)
                .map(name => ({ name: name, wins: null, source: 'fallback' })); 
      }

      // Legacy image fetcher (TheSportsDB) for avatars
      async function fetchFighterImage(name) {
          try {
              const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name)}`);
              const data = await res.json();
              if (data.player && data.player.length > 0) {
                  return data.player[0].strCutout || data.player[0].strThumb || null;
              }
          } catch (e) { console.error("Image API Error", e); }
          return null;
      }

      // Updated Autocomplete to use Live API
      function autocomplete(inp) {
        let currentFocus;
        let debounceTimer;

        inp.addEventListener("input", function(e) {
            const val = this.value;
            closeAllLists();
            if (!val) return false;
            
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                currentFocus = -1;
                
                // 1. Search API
                let results = await searchFightersAPI(val);
                
                // FALLBACK: Local DB if API fails or returns nothing
                if (results.length === 0) {
                     results = fightersDB
                        .filter(name => name.toUpperCase().includes(val.toUpperCase()))
                        .slice(0, 5)
                        .map(name => ({ name: name, wins: null })); // Minimal obj
                }

                if (results.length === 0) return;

                const a = document.createElement("DIV");
                a.setAttribute("id", inp.id + "autocomplete-list");
                a.setAttribute("class", "autocomplete-items");
                inp.parentNode.appendChild(a);

                results.slice(0, 5).forEach(fighter => {
                    const b = document.createElement("DIV");
                    b.className = "autocomplete-item";
                    
                    // Image Placeholder
                    const imgPlaceholder = document.createElement("div");
                    imgPlaceholder.className = "w-10 h-10 rounded-full bg-slate-700 flex-shrink-0 border border-white/10";
                    
                    // Text Info
                    const textDiv = document.createElement("div");
                    textDiv.className = "info";
                    const nick = fighter.nickname ? `"${fighter.nickname}" ` : "";
                    const recStr = (fighter.wins !== null && fighter.wins !== undefined) ? `${fighter.wins}-${fighter.losses}-${fighter.draws}` : "Record N/A";
                    const stanceStr = fighter.stance || "Stance N/A";
                    const statusBadge = fighter.status ? ` • <span class="${fighter.status === 'Active' ? 'text-green-400' : 'text-slate-500'}">${fighter.status}</span>` : "";
                    const record = `<span class="text-[10px] text-slate-400 block">${recStr} • ${stanceStr}${statusBadge}</span>`;
                    
                    textDiv.innerHTML = `<strong>${fighter.name}</strong> <span class="text-xs text-slate-400 italic">${nick}</span>${record}`;
                    
                    b.appendChild(imgPlaceholder);
                    b.appendChild(textDiv);

                    // Hidden Data for Selection
                    const hiddenInput = document.createElement("input");
                    hiddenInput.type = "hidden";
                    hiddenInput.value = fighter.name;
                    // Store extra metadata on the element itself
                    b.dataset.stats = JSON.stringify(fighter); 
                    
                    b.appendChild(hiddenInput);
                    
                    b.addEventListener("click", function(e) {
                        inp.value = this.getElementsByTagName("input")[0].value;
                        
                        // Populate "Tale of the Tape" if we have stats
                        try {
                            const stats = JSON.parse(this.dataset.stats);
                            
                            // STORE STATS ON INPUT FOR PREDICTION ENGINE
                            inp.dataset.fighterStats = JSON.stringify(stats);
                            
                            // Find the main card wrapper
                            const mainCard = inp.closest('.rounded-2xl.w-full'); 
                            
                            if (mainCard) {
                                const inputs = mainCard.querySelectorAll('.fighter-name');
                                if (inputs.length === 2) {
                                    const statsA = inputs[0].dataset.fighterStats ? JSON.parse(inputs[0].dataset.fighterStats) : null;
                                    const statsB = inputs[1].dataset.fighterStats ? JSON.parse(inputs[1].dataset.fighterStats) : null;
                                    
                                    if (statsA && statsB) {
                                        // 1. Prediction
                                        const outcome = predictFightOutcome(statsA, statsB);
                                        const selects = mainCard.querySelectorAll('.fighter-status');
                                        
                                        // Update Status Selects
                                        if (selects.length === 2) {
                                            selects[0].value = outcome.fighterAStatus;
                                            selects[1].value = outcome.fighterBStatus;
                                            selects[0].dispatchEvent(new Event('input'));
                                            selects[1].dispatchEvent(new Event('input'));
                                        }

                                        // 2. Tale of the Tape Visualization
                                        const tape = mainCard.querySelector('.tale-of-the-tape');
                                        if (tape) {
                                            const parseMetric = (s) => parseInt((s||"0").replace(/\D/g,'')) || 0;
                                            const calcWinRate = (s) => {
                                                const total = (s.wins||0) + (s.losses||0) + (s.draws||0);
                                                return total > 0 ? ((s.wins/total)*100).toFixed(1) : 0;
                                            };

                                            const rA = parseMetric(statsA.reach);
                                            const rB = parseMetric(statsB.reach);
                                            const hA = parseMetric(statsA.height);
                                            const hB = parseMetric(statsB.height);
                                            const wA = parseFloat(calcWinRate(statsA));
                                            const wB = parseFloat(calcWinRate(statsB));

                                            // Update Text
                                            tape.querySelector('.val-a-reach').textContent = statsA.reach || "—";
                                            tape.querySelector('.val-b-reach').textContent = statsB.reach || "—";
                                            tape.querySelector('.val-a-height').textContent = statsA.height || "—";
                                            tape.querySelector('.val-b-height').textContent = statsB.height || "—";
                                            tape.querySelector('.val-a-win').textContent = wA + "%";
                                            tape.querySelector('.val-b-win').textContent = wB + "%";

                                            // Update Bars (Max reference: 230cm for reach/height)
                                            const rows = tape.querySelectorAll('.tape-row');
                                            // Row 0: Reach
                                            if(rows[0]) {
                                                rows[0].querySelector('.bar-a').style.width = Math.min(100, (rA/230)*100) + "%";
                                                rows[0].querySelector('.bar-b').style.width = Math.min(100, (rB/230)*100) + "%";
                                            }
                                            // Row 1: Height
                                            if(rows[1]) {
                                                rows[1].querySelector('.bar-a').style.width = Math.min(100, (hA/230)*100) + "%";
                                                rows[1].querySelector('.bar-b').style.width = Math.min(100, (hB/230)*100) + "%";
                                            }
                                            // Row 2: Win Rate
                                            if(rows[2]) {
                                                rows[2].querySelector('.bar-a').style.width = wA + "%";
                                                rows[2].querySelector('.bar-b').style.width = wB + "%";
                                            }

                                            tape.classList.remove('hidden');
                                            tape.classList.add('animate-slide-in');
                                        }
                                    }
                                }
                            }
                            
                        } catch(e) { console.error("Stats render error", e); }

                        inp.dispatchEvent(new Event('input')); 
                        closeAllLists();
                    });
                    a.appendChild(b);
                    
                    // Lazy Load Image (still using TheSportsDB for images as BallDontLie might not have them yet)
                    fetchFighterImage(fighter.name).then(url => {
                        if (url && document.body.contains(b)) {
                            const img = document.createElement("img");
                            img.src = url;
                            b.replaceChild(img, imgPlaceholder);
                        }
                    });
                });
            }, 300); // 300ms debounce
        });
        
        // ... keydown listeners remain same ...
        inp.addEventListener("keydown", function(e) {
            let x = document.getElementById(this.id + "autocomplete-list");
            if (x) x = x.getElementsByTagName("div");
            if (e.keyCode == 40) { // Down
              currentFocus++;
              addActive(x);
            } else if (e.keyCode == 38) { // Up
              currentFocus--;
              addActive(x);
            } else if (e.keyCode == 13) { // Enter
              e.preventDefault();
              if (currentFocus > -1 && x) x[currentFocus].click();
            }
        });
        function addActive(x) {
          if (!x) return false;
          removeActive(x);
          if (currentFocus >= x.length) currentFocus = 0;
          if (currentFocus < 0) currentFocus = (x.length - 1);
          x[currentFocus].classList.add("autocomplete-active");
        }
        function removeActive(x) {
          for (let i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
          }
        }
        function closeAllLists(elmnt) {
          let x = document.getElementsByClassName("autocomplete-items");
          for (let i = 0; i < x.length; i++) {
            if (elmnt != x[i] && elmnt != inp) {
              x[i].parentNode.removeChild(x[i]);
            }
          }
        }
        document.addEventListener("click", function (e) {
            closeAllLists(e.target);
        });
      }

      function attachAutocomplete(fightCard) {
        const inputs = fightCard.querySelectorAll(".fighter-name");
        inputs.forEach(inp => {
            inp.parentNode.style.position = "relative"; // Ensure dropdown positions correctly
            autocomplete(inp);
        });
      }

      function money(x) {
        return Number.isFinite(x) ? "$" + x.toFixed(2) : "-";
      }
      function dec(x) {
        return Number.isFinite(x) ? x.toFixed(2) : "-";
      }
      function pct(x) {
        return Number.isFinite(x) ? (x * 100).toFixed(2) + "%" : "-";
      }
      function getScaledRows(rows, allocPct) {
        const f = Math.max(0, allocPct) / 100;
        return rows.map((r) => ({
          ...r,
          stake: Math.max(0, r.stake * f),
        }));
      }
      function clampOdds(x) {
        if (!Number.isFinite(x)) return NaN;
        return Math.max(1.01, x);
      }
      function clampConfidence(x) {
        if (!Number.isFinite(x)) return NaN;
        return Math.min(100, Math.max(50, x));
      }
      function clampBankroll(x) {
        if (!Number.isFinite(x)) return NaN;
        return Math.max(0, x);
      }
      function initTilt(selector) {
        const els = document.querySelectorAll(selector);
        els.forEach((el) => {
          el.style.transformStyle = "preserve-3d";
          el.addEventListener("mousemove", (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const rx = (y - cy) / 20;
            const ry = (cx - x) / 20;
            el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
          });
          el.addEventListener("mouseleave", () => {
            el.style.transform = "rotateX(0) rotateY(0)";
          });
        });
      }
      // Confetti & Chart utils
      function drawSparkline(canvas, data) {
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        if (!data || data.length === 0) return;
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const step = w / (data.length - 1);
        ctx.beginPath();
        ctx.moveTo(0, h - ((data[0] - min) / range) * h);
        for (let i = 1; i < data.length; i++) {
          ctx.lineTo(i * step, h - ((data[i] - min) / range) * h);
        }
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      function drawBars(canvas, metrics) {
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const barW = w / 3 - 4;
        const evH = Math.min(h, Math.max(0, (metrics.ev / metrics.worstLoss) * h));
        ctx.fillStyle = metrics.ev >= 0 ? "#10b981" : "#ef4444";
        ctx.fillRect(0, h - evH, barW, evH);
        const volH = Math.min(h, Math.max(0, (metrics.stdDev / metrics.worstLoss) * h));
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(barW + 4, h - volH, barW, volH);
        const expH = Math.min(h, metrics.exposurePct * h);
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect((barW + 4) * 2, h - expH, barW, expH);
      }
      function drawHistogram(canvas, results, bankroll) {
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const bins = 30;
        const min = Math.min(...results);
        const max = Math.max(...results);
        const range = max - min || 1;
        const counts = new Array(bins).fill(0);
        results.forEach(r => {
            const idx = Math.floor(((r - min) / range) * (bins - 1));
            counts[idx]++;
        });
        const maxCount = Math.max(...counts);
        const barW = w / bins;
        counts.forEach((c, i) => {
            const barH = (c / maxCount) * h;
            // Color gradient: red for loss, green for win
            const val = min + (i / bins) * range;
            ctx.fillStyle = val >= 0 ? "rgba(16, 185, 129, 0.6)" : "rgba(239, 68, 68, 0.6)";
            ctx.fillRect(i * barW, h - barH, barW - 1, barH);
        });
      }
      function buildWarnings(m) {
        const w = [];
        if (m.lossProb > 0.6) w.push({ text: "High Loss Prob", cls: "text-red-400 border-red-500/30" });
        if (m.exposurePct > 0.4) w.push({ text: "Overexposed", cls: "text-orange-400 border-orange-500/30" });
        if (m.volLevel === "High") w.push({ text: "High Volatility", cls: "text-yellow-400 border-yellow-500/30" });
        if (m.ev < 0) w.push({ text: "Negative EV", cls: "text-red-500 border-red-600/30" });
        return w;
      }
      function slugifyName(name) {
        return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
      }
      
      // ... Main Logic (readFights, buildFights, calculate) ...
      
      function buildFights() {
        const count = parseInt(fightCountEl.value);
        if (isNaN(count) || count < 1) return;
        fightsContainer.innerHTML = "";
        for (let i = 0; i < count; i++) {
          const div = document.createElement("div");
          // Use flex-col on mobile, flex-row on lg screens for side-by-side
          // Actually, stick to vertical stack for rows, but inside row use grid
          div.className = "fight-card rounded-2xl w-full p-1 opacity-0 animate-slide-in relative border border-white/10 overflow-hidden";
          div.style.animationDelay = `${i * 100}ms`;
          
          div.innerHTML = `
            <div class="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-transparent opacity-50"></div>
            <div class="p-5 grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
            
            <!-- VS Badge -->
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 border border-white/10 z-10 shadow-xl pointer-events-none">
              <span class="text-[10px] font-bold text-slate-500">VS</span>
            </div>

            <div class="rounded-xl border border-white/10 bg-white/5 fight-card">
              <div class="p-6 space-y-3">
                <div>
                  <label class="block text-xs mb-1 text-slate-400">Fighter A Name</label>
                  <input type="text" class="fighter-name w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500 input-glow font-mono text-sm" placeholder="Fighter A" />
                  <p class="error-name mt-1 text-xs text-rose-400 hidden"></p>
                </div>
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs mb-1 text-slate-400">Decimal Odds</label>
                    <input type="number" step="0.01" min="1.01" class="fighter-odds w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500 input-glow font-mono text-sm" placeholder="1.90" />
                    <p class="error-odds mt-1 text-xs text-rose-400 hidden"></p>
                    <p class="mt-1 text-[11px] text-slate-500 font-mono fighter-meta">Implied: —</p>
                  </div>
                  <div>
                    <label class="block text-xs mb-1 text-slate-400">Status</label>
                    <select class="fighter-status w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500 input-glow text-sm">
                      <option value="neutral">Neutral</option>
                      <option value="lock">🔒 LOCK</option>
                      <option value="fade">⚠️ FADE</option>
                    </select>
                  </div>
                </div>
              <div>
                <label class="block text-xs mb-2 text-slate-400 flex justify-between">
                  <span>Confidence</span>
                  <span class="confidence-value font-mono text-slate-200">50%</span>
                </label>
                <div class="relative h-2 bg-slate-800 rounded-full mb-1 overflow-hidden">
                   <div class="absolute top-0 left-0 h-full bg-slate-700 w-full opacity-20"></div>
                   <div class="implied-marker absolute top-0 bottom-0 w-0.5 bg-white z-10 hidden" title="Implied Probability"></div>
                   <div class="confidence-fill absolute top-0 left-0 h-full bg-slate-500 transition-all duration-300" style="width: 50%"></div>
                </div>
                <input type="range" min="50" max="100" value="50" class="fighter-confidence w-full accent-slate-500 opacity-0 absolute inset-0 cursor-pointer z-20 h-6 -mt-4" />
                <div class="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>50%</span>
                  <span class="edge-display text-slate-400">0% Edge</span>
                  <span>100%</span>
                </div>
                <p class="error-confidence mt-1 text-xs text-rose-400 hidden"></p>
              </div>
              </div>
            </div>

            <div class="rounded-xl border border-white/10 bg-white/5 fight-card">
              <div class="p-6 space-y-3">
                <div>
                  <label class="block text-xs mb-1 text-slate-400">Fighter B Name</label>
                  <input type="text" class="fighter-name w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500 input-glow font-mono text-sm" placeholder="Fighter B" />
                  <p class="error-name mt-1 text-xs text-rose-400 hidden"></p>
                </div>
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs mb-1 text-slate-400">Decimal Odds</label>
                    <input type="number" step="0.01" min="1.01" class="fighter-odds w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500 input-glow font-mono text-sm" placeholder="2.10" />
                    <p class="error-odds mt-1 text-xs text-rose-400 hidden"></p>
                    <p class="mt-1 text-[11px] text-slate-500 font-mono fighter-meta">Implied: —</p>
                  </div>
                  <div>
                    <label class="block text-xs mb-1 text-slate-400">Status</label>
                    <select class="fighter-status w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500 input-glow text-sm">
                      <option value="neutral">Neutral</option>
                      <option value="lock">🔒 LOCK</option>
                      <option value="fade">⚠️ FADE</option>
                    </select>
                  </div>
                </div>
              <div>
                <label class="block text-xs mb-2 text-slate-400 flex justify-between">
                  <span>Confidence</span>
                  <span class="confidence-value font-mono text-slate-200">75%</span>
                </label>
                <div class="relative h-2 bg-slate-800 rounded-full mb-1 overflow-hidden">
                   <!-- Edge Bar Background -->
                   <div class="absolute top-0 left-0 h-full bg-slate-700 w-full opacity-20"></div>
                   <!-- Implied Prob Marker (White Line) -->
                   <div class="implied-marker absolute top-0 bottom-0 w-0.5 bg-white z-10 hidden" title="Implied Probability"></div>
                   <!-- Confidence Fill -->
                   <div class="confidence-fill absolute top-0 left-0 h-full bg-slate-500 transition-all duration-300" style="width: 75%"></div>
                </div>
                <input type="range" min="50" max="100" value="75" class="fighter-confidence w-full accent-slate-500 opacity-0 absolute inset-0 cursor-pointer z-20 h-6 -mt-4" />
                <div class="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>50%</span>
                  <span class="edge-display text-slate-400">0% Edge</span>
                  <span>100%</span>
                </div>
                <p class="error-confidence mt-1 text-xs text-rose-400 hidden"></p>
              </div>
              </div>
            </div>
          </div>
          
          <!-- Tale of the Tape Visualization -->
          <div class="tale-of-the-tape hidden mt-6 pt-6 border-t border-white/10">
             <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 text-center mb-4">Tale of the Tape</h4>
             <div class="grid grid-cols-1 gap-4 text-xs font-mono">
                <!-- Reach Comparison -->
                <div class="tape-row flex items-center gap-3">
                   <div class="flex-1 text-right text-slate-300 val-a-reach"></div>
                   <div class="w-1/2 flex items-center gap-1 bg-slate-800/50 rounded-full h-4 relative overflow-hidden">
                      <div class="bar-a h-full bg-red-500/80 absolute right-1/2 transition-all duration-500" style="width: 0%"></div>
                      <div class="w-px h-full bg-white/20 absolute left-1/2 z-10"></div>
                      <div class="bar-b h-full bg-blue-500/80 absolute left-1/2 transition-all duration-500" style="width: 0%"></div>
                   </div>
                   <div class="flex-1 text-left text-slate-300 val-b-reach"></div>
                </div>
                <div class="text-center text-[10px] text-slate-500 -mt-3">Reach</div>

                <!-- Height Comparison -->
                <div class="tape-row flex items-center gap-3">
                   <div class="flex-1 text-right text-slate-300 val-a-height"></div>
                   <div class="w-1/2 flex items-center gap-1 bg-slate-800/50 rounded-full h-4 relative overflow-hidden">
                      <div class="bar-a h-full bg-red-500/80 absolute right-1/2 transition-all duration-500" style="width: 0%"></div>
                      <div class="w-px h-full bg-white/20 absolute left-1/2 z-10"></div>
                      <div class="bar-b h-full bg-blue-500/80 absolute left-1/2 transition-all duration-500" style="width: 0%"></div>
                   </div>
                   <div class="flex-1 text-left text-slate-300 val-b-height"></div>
                </div>
                <div class="text-center text-[10px] text-slate-500 -mt-3">Height</div>

                <!-- Win Rate Comparison -->
                <div class="tape-row flex items-center gap-3">
                   <div class="flex-1 text-right text-slate-300 val-a-win"></div>
                   <div class="w-1/2 flex items-center gap-1 bg-slate-800/50 rounded-full h-4 relative overflow-hidden">
                      <div class="bar-a h-full bg-red-500/80 absolute right-1/2 transition-all duration-500" style="width: 0%"></div>
                      <div class="w-px h-full bg-white/20 absolute left-1/2 z-10"></div>
                      <div class="bar-b h-full bg-blue-500/80 absolute left-1/2 transition-all duration-500" style="width: 0%"></div>
                   </div>
                   <div class="flex-1 text-left text-slate-300 val-b-win"></div>
                </div>
                <div class="text-center text-[10px] text-slate-500 -mt-3">Win Rate</div>
             </div>
          </div>
          `;
          fightsContainer.appendChild(div);
          
          attachAutocomplete(div);
          
          // Wire up event listeners for this specific card
          const oddsInputs = div.querySelectorAll(".fighter-odds");
          const confInputs = div.querySelectorAll(".fighter-confidence");
          const metas = div.querySelectorAll(".fighter-meta");
          const confFills = div.querySelectorAll(".confidence-fill");
          const confVals = div.querySelectorAll(".confidence-value");
          const edgeDisplays = div.querySelectorAll(".edge-display");
          const impliedMarkers = div.querySelectorAll(".implied-marker");
          
          const updateEdge = (idx) => {
              const odds = parseFloat(oddsInputs[idx].value);
              const conf = parseInt(confInputs[idx].value);
              const meta = metas[idx];
              const fill = confFills[idx];
              const valDisplay = confVals[idx];
              const edgeDisplay = edgeDisplays[idx];
              const marker = impliedMarkers[idx];
              
              valDisplay.textContent = conf + "%";
              fill.style.width = conf + "%";
              
              // Dynamic Color based on Confidence
              if (conf >= 80) fill.className = "confidence-fill absolute top-0 left-0 h-full transition-all duration-300 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]";
              else if (conf >= 60) fill.className = "confidence-fill absolute top-0 left-0 h-full transition-all duration-300 bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]";
              else fill.className = "confidence-fill absolute top-0 left-0 h-full transition-all duration-300 bg-slate-500";
              
              if (!isNaN(odds) && odds > 1) {
                  const implied = (1 / odds) * 100;
                  meta.textContent = `Implied: ${implied.toFixed(1)}%`;
                  marker.style.left = implied + "%";
                  marker.classList.remove("hidden");
                  
                  // Calculate Edge: (Conf - Implied)
                  const edge = conf - implied;
                  const edgeText = `${edge > 0 ? "+" : ""}${edge.toFixed(1)}% Edge`;
                  edgeDisplay.textContent = edgeText;
                  
                  if (edge > 5) edgeDisplay.className = "edge-display text-[10px] text-green-400 font-bold animate-pulse";
                  else if (edge < -5) edgeDisplay.className = "edge-display text-[10px] text-red-400";
                  else edgeDisplay.className = "edge-display text-[10px] text-slate-400";
                  
              } else {
                  meta.textContent = "Implied: —";
                  marker.classList.add("hidden");
                  edgeDisplay.textContent = "0% Edge";
                  edgeDisplay.className = "edge-display text-slate-400";
              }
          };
          
          oddsInputs.forEach((inp, idx) => inp.addEventListener("input", () => updateEdge(idx)));
          confInputs.forEach((inp, idx) => inp.addEventListener("input", () => updateEdge(idx)));
        }
        calcBtn.disabled = false;
        calcBtn.classList.remove("cursor-not-allowed", "bg-white/10");
        calcBtn.classList.add("bg-red-600", "hover:bg-red-500");
        calcBtn.textContent = "Calculate Strategies";
      }
      
      function readFights() {
        const rows = document.querySelectorAll(".fight-card .grid"); // .fight-card is the row wrapper now
        const fights = [];
        // We iterate through the container children which are the row wrappers
        const wrappers = fightsContainer.children;
        for (let i = 0; i < wrappers.length; i++) {
            const wrap = wrappers[i];
            const cards = wrap.querySelectorAll('.rounded-xl.border.bg-white\\/5'); // inner cards
            if (cards.length < 2) continue;
            
            const getFighterData = (card) => {
                return {
                    name: card.querySelector(".fighter-name").value.trim(),
                    odds: parseFloat(card.querySelector(".fighter-odds").value),
                    confidence: parseInt(card.querySelector(".fighter-confidence").value),
                    status: card.querySelector(".fighter-status").value
                };
            };
            
            const f1 = getFighterData(cards[0]);
            const f2 = getFighterData(cards[1]);
            
            fights.push({
                id: i + 1,
                fighters: [f1, f2]
            });
        }
        return fights;
      }
      function generateParlays(fights) {
        // We only pick ONE side per fight or SKIP.
        // A parlay is a combination of picks from N fights.
        // For N=3, we have 3 fights. We can pick A, B, or Skip.
        // Actually, for "parlay" generation in this context, we usually mean:
        // iterate all combinations of outcome A or B. 2^N combinations.
        // We filter out "bad" EV picks later? No, we generate all valid combos of picks.
        const combinations = [];
        const n = fights.length;
        // Limit N to avoid browser crash. 2^10 = 1024 is fine. 2^20 is too big.
        // We rely on buildFights limit (max 20). But 2^20 is 1M. Too slow.
        // We should warn user or limit parlay size.
        // Let's implement a recursive generator that picks A or B.
        
        function recurse(idx, currentParlay) {
            if (idx === n) {
                if (currentParlay.length > 0) combinations.push(currentParlay);
                return;
            }
            const f = fights[idx];
            const [a, b] = f.fighters;
            
            // Option 1: Pick A (if valid)
            if (!isNaN(a.odds) && !isNaN(a.confidence)) {
                recurse(idx + 1, [...currentParlay, { fight: f.id, name: a.name, odds: a.odds, prob: a.confidence / 100, status: a.status }]);
            }
            // Option 2: Pick B (if valid)
            if (!isNaN(b.odds) && !isNaN(b.confidence)) {
                recurse(idx + 1, [...currentParlay, { fight: f.id, name: b.name, odds: b.odds, prob: b.confidence / 100, status: b.status }]);
            }
            // Option 3: Skip this fight (allow smaller parlays? usually we want full parlays or singles)
            // For this app, let's assume we want to parlay ALL selected fights. 
            // OR allow subsets? Complexity explodes with subsets. 3^N.
            // Let's stick to: A parlay must include a pick from EVERY fight configured?
            // No, usually you bet on a subset.
            // Let's stick to "All combinations of outcomes" for the configured fights.
            // i.e. 2^N outcomes.
        }
        // Actually, simply generating 2^N outcomes creates "Full Parlays".
        recurse(0, []);
        
        // Calculate combined stats
        return combinations.map(picks => {
            const combinedOdds = picks.reduce((acc, p) => acc * p.odds, 1);
            const combinedProb = picks.reduce((acc, p) => acc * p.prob, 1);
            return { picks, combinedOdds, combinedProb };
        }).filter(p => p.combinedProb > 0);
      }
      
      function computeSinglesRows(fights, bankroll) {
        const bets = [];
        fights.forEach((fight, i) => {
          const [a, b] = computeFightProbabilities(fight);
          const ka = kellyFraction(a.odds, a.prob);
          const kb = kellyFraction(b.odds, b.prob);
          if (ka > 0) bets.push({ fight: i + 1, name: a.name, odds: a.odds, prob: a.prob, fraction: ka, status: a.status });
          if (kb > 0) bets.push({ fight: i + 1, name: b.name, odds: b.odds, prob: b.prob, fraction: kb, status: b.status });
        });
        const rows = bets.map((b) => ({ picks: [{ fight: b.fight, name: b.name, status: b.status }], combinedOdds: b.odds, combinedProb: b.prob, stake: bankroll * b.fraction }));
        const totalStake = rows.reduce((s, r) => s + r.stake, 0);
        if (totalStake > bankroll && totalStake > 0) {
          const scale = bankroll / totalStake;
          rows.forEach((r) => (r.stake = r.stake * scale));
        }
        return rows;
      }
      
      function computeFightProbabilities(fight) {
          const f1 = fight.fighters[0];
          const f2 = fight.fighters[1];
          // We trust user confidence as true probability
          // But they must sum to <= 100% ideally. If not, we normalize?
          // Kelly assumes probabilities are "true".
          // If user inputs 70% vs 70%, that's arbitrage or error.
          // We normalize them to sum to 1 (minus vig/margin if we want to be fancy, but let's just normalize to 1 for simplicity or trust input?)
          // Standard Kelly: trust the Probability vs the Odds.
          // Let's NOT normalize, because maybe there's a draw probability?
          // But for MMA, draw is rare.
          // Let's normalize to 100% for the pair to be safe?
          // If user puts 80% and 80%, we scale to 50/50? No, that ruins their "Confidence".
          // Let's assume User knows best. If they sum > 100, so be it.
          return [
              { name: f1.name, odds: f1.odds, prob: f1.confidence / 100, status: f1.status },
              { name: f2.name, odds: f2.odds, prob: f2.confidence / 100, status: f2.status }
          ];
      }

      function truncateParlaysByKelly(parlays, bankroll, limit) {
          // Sort by Kelly Fraction/Impact
          // We calculate raw kelly fraction for each parlay
          const withK = parlays.map(p => {
              const k = kellyFraction(p.combinedOdds, p.combinedProb);
              return { ...p, rawKelly: k };
          });
          // Filter positive Kelly only? No, maybe equal stake wants them.
          // Sort by "Edge" or "EV"?
          // EV = (Prob * Odds) - 1
          withK.sort((a, b) => {
              const evA = a.combinedProb * a.combinedOdds;
              const evB = b.combinedProb * b.combinedOdds;
              return evB - evA;
          });
          
          if (withK.length <= limit) return { rows: withK, warn: "" };
          
          // Cut off
          return { 
              rows: withK.slice(0, limit), 
              warn: `Analysis truncated to top ${limit} combinations (by EV) for performance.` 
          };
      }

      function kellyFraction(odds, prob) {
        const b = odds - 1;
        const p = prob;
        const q = 1 - p;
        const k = (b * p - q) / b;
        if (!Number.isFinite(k) || k <= 0) return 0;
        return k * 0.25;
      }
      function computeKelly(parlays, bankroll) {
        const rows = parlays.map((p) => {
          const f = kellyFraction(p.combinedOdds, p.combinedProb);
          const stake = f > 0 ? bankroll * f : 0;
          return { ...p, fraction: f, stake };
        });
        const sumStake = rows.reduce((s, r) => s + r.stake, 0);
        if (sumStake > bankroll && sumStake > 0) {
          const scale = bankroll / sumStake;
          rows.forEach((r) => (r.stake = r.stake * scale));
        }
        rows.sort((a, b) => b.stake - a.stake);
        return rows;
      }
      function computeEqualStake(parlays, bankroll) {
        if (parlays.length === 0) return [];
        const stakeEach = bankroll / parlays.length;
        const rows = parlays.map((p) => ({ ...p, stake: stakeEach }));
        rows.sort((a, b) => b.combinedOdds - a.combinedOdds);
        return rows;
      }
      function computeYOLO(parlays, bankroll) {
        if (parlays.length === 0) return [];
        const best = [...parlays].sort((a, b) => b.combinedOdds - a.combinedOdds)[0];
        return [{ ...best, stake: bankroll, yolo: true }];
      }
      
      // Simulation Logic
      function simulateStrategy(fights, rows, bankroll, trials = 1000) {
          const results = [];
          const winners = fights.map((fight) => {
              const [a, b] = computeFightProbabilities(fight);
              return { a, b }; // We simulate based on User Probabilities
          });
          
          for(let i=0; i<trials; i++) {
              // 1. Simulate Outcomes
              const outcomes = {};
              winners.forEach((w, idx) => {
                  const fightId = idx + 1;
                  // Random vs A.prob
                  outcomes[fightId] = Math.random() < w.a.prob ? w.a.name : w.b.name;
              });
              
              // 2. Check Bets
              let currentBankroll = bankroll;
              let totalStaked = 0;
              let totalReturn = 0;
              
              rows.forEach(bet => {
                  totalStaked += bet.stake;
                  // Check if bet won
                  const won = bet.picks.every(p => outcomes[p.fight] === p.name);
                  if(won) {
                      totalReturn += bet.stake * bet.combinedOdds;
                  }
              });
              
              results.push(totalReturn - totalStaked);
          }
          results.sort((a, b) => a - b);
          const q = (p) => results[Math.floor(p * (results.length - 1))];
          return { median: q(0.5), p5: q(0.05), p95: q(0.95), drawdownProb: results.filter((x) => x < -0.3 * bankroll).length / results.length, results };
      }

      function strategyMetrics(rows, bankroll) {
        const totalStake = rows.reduce((s, r) => s + r.stake, 0);
        const noWinProb = rows.reduce((s, r) => s * (1 - r.combinedProb), 1);
        const lossProb = Math.max(0, noWinProb);
        const outcomes = [];
        for (const r of rows) {
          const net = r.stake * r.combinedOdds - totalStake;
          outcomes.push({ prob: r.combinedProb, net });
        }
        outcomes.push({ prob: lossProb, net: -totalStake });
        const ev = outcomes.reduce((s, o) => s + o.prob * o.net, 0);
        const variance = outcomes.reduce((s, o) => s + o.prob * Math.pow(o.net - ev, 2), 0);
        const stdDev = Math.sqrt(Math.max(0, variance));
        const volRatio = totalStake > 0 && bankroll > 0 ? stdDev / bankroll : 0;
        const volLevel = volRatio < 0.1 ? "Low" : volRatio < 0.25 ? "Medium" : "High";
        const best = Math.max(...rows.map((r) => r.stake * r.combinedOdds - totalStake), -totalStake);
        return {
          lossProb,
          worstLoss: totalStake,
          exposurePct: totalStake / bankroll,
          variance,
          stdDev,
          volLevel,
          bestCase: best,
          ev,
        };
      }
      function classifyVerdict(m) {
        if (m.ev <= 0) return { label: "Dangerous", cardCls: "verdict-red", badgeCls: "badge badge-red" };
        if (m.exposurePct > 0.5 || m.lossProb > 0.7) return { label: "Dangerous", cardCls: "verdict-red", badgeCls: "badge badge-red" };
        if (m.ev > 0 && m.exposurePct <= 0.2 && m.lossProb <= 0.5) return { label: "Best", cardCls: "verdict-green", badgeCls: "badge badge-green" };
        if (m.ev > 0 && m.exposurePct <= 0.35) return { label: "Solid", cardCls: "verdict-cyan", badgeCls: "badge badge-cyan" };
        return { label: "Risky", cardCls: "verdict-yellow", badgeCls: "badge badge-yellow" };
      }
      function renderParlayRow(r, totalStake) {
        const picks = r.picks.map((p) => {
          const cls = p.status === "lock" ? "lock-badge" : p.status === "fade" ? "fade-badge" : "neutral-badge";
          const label = p.status === "lock" ? "LOCK" : p.status === "fade" ? "FADE" : "NEUTRAL";
          return `F${p.fight}: ${p.name} <span class="text-[10px] px-2 py-0.5 rounded-md ${cls} ml-1">${label}</span>`;
        }).join(" • ");
        const returnAmt = r.stake * r.combinedOdds;
        const netIfWin = returnAmt - totalStake;
        const stakeCell = `${money(r.stake)}${r.stake <= 0 ? ' <span class="text-[10px] text-slate-400">(no stake)</span>' : ''}`;
        const rowCls = netIfWin>=0 ? "row-pos" : "row-neg";
        return `
          <tr class="border-t border-white/10 ${rowCls}">
            <td class="px-3 py-2 text-sm">${picks}</td>
            <td class="px-3 py-2 text-sm font-mono text-slate-300">${dec(r.combinedOdds)}</td>
            <td class="px-3 py-2 text-sm font-mono text-slate-300">${pct(r.combinedProb)}</td>
            <td class="px-3 py-2 text-sm font-mono text-slate-300">${stakeCell}</td>
            <td class="px-3 py-2 text-sm font-mono text-slate-300">${money(returnAmt)}</td>
            <td class="px-3 py-2 text-sm font-mono ${netIfWin>=0?"text-green-400":"text-red-400"}">${money(netIfWin)}</td>
          </tr>
        `;
      }
      function renderStrategy(name, rows, bankroll, opts = {}) {
        const allocPct = opts.allocPct ?? 100;
        const scaled = getScaledRows(rows, allocPct);
        const totalStake = scaled.reduce((s, r) => s + r.stake, 0);
        const metrics = strategyMetrics(scaled, bankroll);
        const warn = opts.warn ? `<div class="text-xs text-red-400 mb-2">${opts.warn}</div>` : "";
        const table =
          scaled.length === 0
            ? `<div class="text-sm text-slate-400">No valid parlays</div>`
            : `
          <div class="overflow-x-auto rounded-lg border border-white/10">
            <table class="min-w-full text-left text-slate-200 text-sm">
              <thead class="bg-white/5 thead-luminous">
                <tr>
                  <th class="px-3 py-2">Parlay Picks</th>
                  <th class="px-3 py-2">Decimal Odds</th>
                  <th class="px-3 py-2">Implied Prob</th>
                  <th class="px-3 py-2">Stake</th>
                  <th class="px-3 py-2">Potential Return</th>
                  <th class="px-3 py-2">Net Result</th>
                </tr>
              </thead>
              <tbody>
                ${scaled.map((r) => renderParlayRow(r, totalStake)).join("")}
              </tbody>
            </table>
          </div>
        `;
        const card = document.createElement("div");
        const verdict = classifyVerdict(metrics);
        card.className = `rounded-2xl border bg-white/5 backdrop-blur-md shadow-glow strategy-card ${verdict.cardCls}`;
        card.innerHTML = `
          <div class="strategy-card-header p-4 sm:p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-medium">${name}</h3>
              ${warn}
              ${opts.truncationWarn ? `<div class="text-[11px] text-orange-300">${opts.truncationWarn}</div>` : ""}
              <div class="mt-2 flex items-center gap-2">
                <span class="${verdict.badgeCls}">${verdict.label}</span>
                <div class="text-[11px] text-slate-400">
                  <span class="${metrics.ev>=0?'text-green-400':'text-red-400'}">${money(metrics.ev)}</span>
                  • ${pct(metrics.lossProb)} loss • ${pct(metrics.exposurePct)} exposed
                </div>
              </div>
              <div class="mt-2">
                <div class="text-[11px] text-slate-400 mb-1">
                  ${opts.sim ? "Profit/Loss Distribution (Monte Carlo)" : "Parlay EV Profile"}
                </div>
                <canvas class="sparkline" width="220" height="60"></canvas>
              </div>
              <div class="mt-2 flex items-center gap-2">
                <label class="text-[11px] text-slate-400">Stake %</label>
                <input type="range" min="0" max="100" value="${allocPct}" data-alloc="${name}" class="w-24 accent-red-500">
                <span class="text-[11px] text-slate-300">${allocPct.toFixed(0)}%</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-[11px] text-slate-400">Total Stake: ${money(totalStake)}</div>
              <div class="mt-2 h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
                <div class="stake-bar h-full" style="width:${(metrics.exposurePct*100).toFixed(2)}%"></div>
              </div>
              <button class="mt-2 sm:hidden text-[11px] px-2 py-1 rounded-md bg-white/10 border border-white/10" data-collapse>Details</button>
          </div>
        </div>
          <div class="strategy-body p-5 sm:p-6 space-y-3 hidden sm:block">
            ${table}
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                <div class="text-xs text-slate-400">Prob. Total Loss (approx)</div>
                <div class="text-sm font-mono text-slate-200">${pct(metrics.lossProb)}</div>
                <div class="text-[11px] text-slate-400">Shared-fight dependency acknowledged</div>
              </div>
              <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                <div class="text-xs text-slate-400">Worst-case Loss</div>
                <div class="text-sm font-mono text-slate-200">${money(metrics.worstLoss)}</div>
              </div>
              <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                <div class="text-xs text-slate-400">Bankroll Exposure</div>
                <div class="text-sm font-mono text-slate-200">${pct(metrics.exposurePct)}</div>
              </div>
              <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                <div class="text-xs text-slate-400">Variance (unit²)</div>
                <div class="text-sm font-mono text-slate-200">${metrics.variance.toFixed(2)}</div>
              </div>
              <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                <div class="text-xs text-slate-400">Best-case Return</div>
                <div class="text-sm font-mono text-slate-200">${money(metrics.bestCase)}</div>
              </div>
              <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                <div class="text-xs text-slate-400">Expected Value</div>
                <div class="text-sm font-mono text-slate-200">${money(metrics.ev)}</div>
              </div>
              <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                <div class="text-xs text-slate-400">Std Dev</div>
                <div class="text-sm font-mono text-slate-200">${money(metrics.stdDev)}</div>
              </div>
              <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                <div class="text-xs text-slate-400">Volatility Level</div>
                <div class="text-sm font-mono text-slate-200">${metrics.volLevel}</div>
              </div>
              <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                <div class="text-xs text-slate-400">Edge (EV / Stake)</div>
                <div class="text-sm font-mono text-slate-200">${metrics.worstLoss>0 ? pct(metrics.ev/metrics.worstLoss) : "—"}</div>
              </div>
              <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                <div class="text-[11px] text-slate-400 mb-1">EV/Vol/Exp</div>
                <canvas class="bars" width="160" height="44"></canvas>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              ${buildWarnings(metrics).map(w => `<span class="text-[11px] px-2 py-1 rounded-md border border-white/10 bg-white/5 warn-glow ${w.cls}">${w.text}</span>`).join("")}
            </div>
            ${opts.sim ? `
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                <div class="text-xs text-slate-400">Median Outcome</div>
                <div class="text-sm">${money(opts.sim.median)}</div>
              </div>
              <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                <div class="text-xs text-slate-400">P5 (bad luck)</div>
                <div class="text-sm">${money(opts.sim.p5)}</div>
              </div>
              <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                <div class="text-xs text-slate-400">P95 (good luck)</div>
                <div class="text-sm">${money(opts.sim.p95)}</div>
              </div>
              <div class="rounded-lg border border-white/10 bg-white/5 p-3">
                <div class="text-xs text-slate-400">Drawdown > 30%</div>
                <div class="text-sm">${pct(opts.sim.drawdownProb)}</div>
              </div>
            </div>
            ` : ``}
          </div>
        `;
        const spark = card.querySelector("canvas.sparkline");
        if (spark) {
          if (opts.sim && opts.sim.results && opts.sim.results.length > 0) {
              // Draw Histogram if sim results exist
              drawHistogram(spark, opts.sim.results, bankroll);
          } else {
              // Fallback to EV Profile sparkline
              const evVals = scaled.map((r) => {
                const ret = r.stake * r.combinedOdds;
                const netWin = ret - totalStake;
                const netLoss = -totalStake;
                return r.combinedProb * netWin + (1 - r.combinedProb) * netLoss;
              });
              drawSparkline(spark, evVals.slice(0, Math.min(evVals.length, 24)));
          }
        }
        const bars = card.querySelector("canvas.bars");
        drawBars(bars, metrics);
        const body = card.querySelector(".strategy-body");
        const collapseBtn = card.querySelector("[data-collapse]");
        if (collapseBtn && body) {
          const key = "strategy-collapse:" + slugifyName(name);
          const state = localStorage.getItem(key);
          if (state === "open") body.classList.remove("hidden");
          else if (state === "closed") body.classList.add("hidden");
          collapseBtn.addEventListener("click", () => {
            body.classList.toggle("hidden");
            localStorage.setItem(key, body.classList.contains("hidden") ? "closed" : "open");
          });
        }
        return { card, metrics };
      }
      function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
          if (!startTimestamp) startTimestamp = timestamp;
          const progress = Math.min((timestamp - startTimestamp) / duration, 1);
          // Ease out cubic
          const ease = 1 - Math.pow(1 - progress, 3);
          const current = start + (end - start) * ease;
          obj.innerHTML = money(current);
          if (progress < 1) {
            window.requestAnimationFrame(step);
          } else {
             obj.innerHTML = money(end);
          }
        };
        window.requestAnimationFrame(step);
      }

      function renderRiskSummary(items) {
        riskSummary.innerHTML = "";
        const ranked = [...items].sort((a,b)=>b.metrics.ev-a.metrics.ev);
        const best = ranked[0];
        const v = classifyVerdict(best.metrics);
        const top = document.createElement("div");
        top.className = "rounded-xl border border-white/10 bg-white/5 p-4 mb-4";
        top.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="text-sm">Best Strategy</div>
            <span class="${v.badgeCls} font-mono">${best.name}: <span class="anim-val" data-val="${best.metrics.ev}">$0.00</span></span>
          </div>
          <div class="mt-2 text-xs text-slate-400 font-mono">Loss ${pct(best.metrics.lossProb)} • Exposure ${pct(best.metrics.exposurePct)}</div>
        `;
        riskSummary.appendChild(top);
        items.forEach((it) => {
          const row = document.createElement("div");
          row.className = "rounded-xl border border-white/10 bg-white/5 p-4";
          row.innerHTML = `
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm font-medium">${it.name}</div>
              <div class="text-xs text-slate-400 font-mono">Exposure ${pct(it.metrics.exposurePct)}</div>
            </div>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>Total Stake: <span class="text-slate-200 font-mono">${money(it.metrics.worstLoss)}</span></div>
              <div>Loss Prob (approx): <span class="text-slate-200 font-mono">${pct(it.metrics.lossProb)}</span></div>
              <div>Worst Loss: <span class="text-slate-200 font-mono">${money(it.metrics.worstLoss)}</span></div>
              <div>Variance (unit²): <span class="text-slate-200 font-mono">${it.metrics.variance.toFixed(2)}</span></div>
              <div>Std Dev: <span class="text-slate-200 font-mono">${money(it.metrics.stdDev)}</span></div>
              <div>Volatility: <span class="text-slate-200 font-mono">${it.metrics.volLevel}</span></div>
              <div>Best-case: <span class="text-slate-200 font-mono">${money(it.metrics.bestCase)}</span></div>
              <div>Edge (EV / Stake): <span class="text-slate-200 font-mono">${it.metrics.worstLoss>0 ? pct(it.metrics.ev/it.metrics.worstLoss) : "—"}</span></div>
            </div>
          `;
          riskSummary.appendChild(row);
        });
        
        // Trigger animations
        setTimeout(() => {
           top.querySelectorAll('.anim-val').forEach(el => {
               const val = parseFloat(el.getAttribute('data-val'));
               if (!isNaN(val)) animateValue(el, 0, val, 1000);
           });
        }, 100);
      }
      async function calculate() {
        if (!formValid()) {
          calcError.textContent = "Fix validation errors before calculating.";
          return;
        }
        calcError.textContent = "";
        loadingMsg.textContent = "";
        exportBtn.disabled = true;
        exportBtn.title = "Results not ready yet";
        const bankroll = parseFloat(bankrollEl.value);
        if (!Number.isFinite(bankroll) || bankroll <= 0) {
          calcError.textContent = "Bankroll must be > 0.";
          return;
        }
        const fights = readFights();
        const parlaysAll = generateParlays(fights);
        let truncWarnMsg = "";
        let useParlays = parlaysAll;
        if (parlaysAll.length > 256) {
          const trunc = truncateParlaysByKelly(parlaysAll, bankroll, 256);
          useParlays = trunc.rows;
          truncWarnMsg = trunc.warn;
          const tw = document.getElementById("truncWarn"); if (tw) tw.textContent = truncWarnMsg;
        } else {
          const tw = document.getElementById("truncWarn"); if (tw) tw.textContent = "";
        }
        const kellyRows = computeKelly(useParlays, bankroll);
        const equalRows = computeEqualStake(useParlays, bankroll);
        const yoloRows = computeYOLO(useParlays, bankroll);
        const singlesRows = computeSinglesRows(fights, bankroll);
        resultsContainer.innerHTML = "";
        const mcOn = document.getElementById("mcToggle")?.checked;
        let kSim, eSim, ySim, sSim;
        if (mcOn) {
          loadingMsg.textContent = "Running Monte Carlo…";
          await new Promise((resolve) => requestAnimationFrame(resolve));
          const trials = 10000;
          kSim = await runMonteCarloAsync(() => simulateStrategy(fights, kellyRows, bankroll, 1000), trials);
          eSim = await runMonteCarloAsync(() => simulateStrategy(fights, equalRows, bankroll, 1000), trials);
          ySim = await runMonteCarloAsync(() => simulateStrategy(fights, yoloRows, bankroll, 1000), trials);
          sSim = await runMonteCarloAsync(() => {
            const keySingles = singlesRows.map((r) => ({ idx: r.picks[0].fight - 1, name: r.picks[0].name, stake: r.stake, odds: r.combinedOdds }));
            const results = [];
            const trialsChunk = 1000;
            const winners = fights.map((fight) => {
              const [a, b] = computeFightProbabilities(fight);
              return { a, b };
            });
            for (let t = 0; t < trialsChunk; t++) {
              const outcome = winners.map(({ a, b }) => (Math.random() < a.prob ? a.name : b.name));
              const totalStake = singlesRows.reduce((s, r) => s + r.stake, 0);
              let ret = 0;
              keySingles.forEach((ks) => {
                if (outcome[ks.idx] === ks.name) ret += ks.stake * ks.odds;
              });
              results.push(ret - totalStake);
            }
            results.sort((a, b) => a - b);
            const q = (p) => results[Math.floor(p * (results.length - 1))];
            return { median: q(0.5), p5: q(0.05), p95: q(0.95), drawdownProb: results.filter((x) => x < -0.3 * bankroll).length / results.length, results }; // Added results
          }, trials);
          loadingMsg.textContent = "";
        }
        const kCard = renderStrategy("Fractional Kelly (Minimum Risk)", kellyRows, bankroll, { truncationWarn: truncWarnMsg, sim: kSim, allocPct: strategyAllocations.Kelly });
        const eCard = renderStrategy("Equal Stake Strategy", equalRows, bankroll, { sim: eSim, allocPct: strategyAllocations["Equal Stake"] });
        const yCard = renderStrategy("YOLO Strategy", yoloRows, bankroll, { warn: "Warning: extreme risk — 100% bankroll on single parlay.", sim: ySim, allocPct: strategyAllocations.YOLO });
        const sCard = renderStrategy("Single Bets (Kelly-optimized)", singlesRows, bankroll, { sim: sSim, allocPct: strategyAllocations.Singles });
        resultsContainer.appendChild(kCard.card);
        resultsContainer.appendChild(eCard.card);
        resultsContainer.appendChild(yCard.card);
        resultsContainer.appendChild(sCard.card);
        // Change: remove auto confetti to preserve professional, math-first UX
        [kCard.card, eCard.card, yCard.card, sCard.card].forEach((c, i) => {
          c.classList.add("opacity-0", "animate-slide-in");
          c.style.animationDelay = `${i * 100}ms`;
        });
        initTilt(".strategy-card");
        renderRiskSummary([
          { name: "Kelly", metrics: kCard.metrics },
          { name: "Equal Stake", metrics: eCard.metrics },
          { name: "YOLO", metrics: yCard.metrics },
          { name: "Singles", metrics: sCard.metrics },
        ]);
        lastStrategies = [
          { name: "Kelly", rows: kellyRows },
          { name: "Equal Stake", rows: equalRows },
          { name: "YOLO", rows: yoloRows },
          { name: "Singles", rows: singlesRows },
        ];
        exportBtn.disabled = false;
        exportBtn.title = "Export current strategies as PDF";
        attachAllocationInputs(bankroll, truncWarnMsg);
      }
      function attachAllocationInputs(bankroll, truncWarnMsg) {
        const inputs = resultsContainer.querySelectorAll('input[data-alloc]');
        inputs.forEach((inp) => {
          inp.addEventListener('input', () => {
            const key = inp.getAttribute('data-alloc');
            const val = parseInt(inp.value, 10);
            if (key === "Fractional Kelly (Minimum Risk)") strategyAllocations.Kelly = val;
            else if (key === "Equal Stake Strategy") strategyAllocations["Equal Stake"] = val;
            else if (key === "YOLO Strategy") strategyAllocations.YOLO = val;
            else if (key === "Single Bets (Kelly-optimized)") strategyAllocations.Singles = val;
            if (lastStrategies) {
              const fights = readFights();
              resultsContainer.innerHTML = "";
              const mcOn = document.getElementById("mcToggle")?.checked;
              let kSim, eSim, ySim, sSim;
              if (mcOn) {
                loadingMsg.textContent = "Updating Monte Carlo…";
              }
              const kCard = renderStrategy("Fractional Kelly (Minimum Risk)", lastStrategies[0].rows, bankroll, { truncationWarn: truncWarnMsg, allocPct: strategyAllocations.Kelly, sim: kSim });
              const eCard = renderStrategy("Equal Stake Strategy", lastStrategies[1].rows, bankroll, { allocPct: strategyAllocations["Equal Stake"], sim: eSim });
              const yCard = renderStrategy("YOLO Strategy", lastStrategies[2].rows, bankroll, { warn: "Warning: extreme risk — 100% bankroll on single parlay.", allocPct: strategyAllocations.YOLO, sim: ySim });
              const sCard = renderStrategy("Single Bets (Kelly-optimized)", lastStrategies[3].rows, bankroll, { allocPct: strategyAllocations.Singles, sim: sSim });
              resultsContainer.appendChild(kCard.card);
              resultsContainer.appendChild(eCard.card);
              resultsContainer.appendChild(yCard.card);
              resultsContainer.appendChild(sCard.card);
              renderRiskSummary([
                { name: "Kelly", metrics: kCard.metrics },
                { name: "Equal Stake", metrics: eCard.metrics },
                { name: "YOLO", metrics: yCard.metrics },
                { name: "Singles", metrics: sCard.metrics },
              ]);
              attachAllocationInputs(bankroll, truncWarnMsg);
              loadingMsg.textContent = "";
            }
          });
        });
      }
      async function runMonteCarloAsync(stepFn, totalTrials) {
        let agg = { median: 0, p5: 0, p95: 0, drawdownProb: 0, results: [] };
        let done = 0;
        while (done < totalTrials) {
          const res = stepFn();
          agg.median = (agg.median * done + res.median * 1000) / (done + 1000);
          agg.p5 = (agg.p5 * done + res.p5 * 1000) / (done + 1000);
          agg.p95 = (agg.p95 * done + res.p95 * 1000) / (done + 1000);
          agg.drawdownProb = (agg.drawdownProb * done + res.drawdownProb * 1000) / (done + 1000);
          if (res.results) agg.results = agg.results.concat(res.results);
          done += 1000;
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        return agg;
      }
      buildBtn.addEventListener("click", () => {
        if (!validateConfig()) return;
        buildFights();
      });
      calcBtn.addEventListener("click", calculate);
      resetBtn.addEventListener("click", () => {
        fightCountEl.value = 3;
        bankrollEl.value = 1000;
        fightsContainer.innerHTML = "";
        resultsContainer.innerHTML = "";
        riskSummary.innerHTML = "";
        calcBtn.disabled = true;
        calcBtn.classList.add("cursor-not-allowed");
        calcBtn.classList.remove("bg-red-600", "hover:bg-red-500");
        calcBtn.classList.add("bg-white/10");
        fightCountError.classList.add("hidden");
        bankrollError.classList.add("hidden");
        loadingMsg.textContent = "";
        exportBtn.disabled = true;
      });
      exportBtn.addEventListener("click", async () => {
        if (!lastStrategies) { calcError.textContent = "Build fights and click Calculate Strategies before exporting."; return; }
        // Simple Print/PDF export via browser
        window.print();
      });
      
      // Init
      document.addEventListener("DOMContentLoaded", () => {
          setTimeout(() => {
              const loader = document.getElementById('intro-screen');
              if(loader) loader.classList.add('opacity-0', 'pointer-events-none');
              setTimeout(() => { if(loader) loader.style.display = 'none'; }, 700);
          }, 2500);
          buildFights();
      });
