/* ---------- Discord (Rich Presence) ---------- */
let presKey = '', presSent = false;
function syncPresence(){
  const T = S.settings, on = !!T.discord && /^\d{15,22}$/.test(T.discordId || ''), t = current(), live = on && !!t && playing;
  const key = live ? t.id + '|1' : 'off|' + on; if (key === presKey) return; presKey = key;
  if (live) {
    let pos = 0, dur = t.duration || 0; try { pos = Math.floor(player.getCurrentTime() || 0); dur = Math.round(player.getDuration() || dur); } catch {}
    presSent = true; send('/api/presence', {appId:T.discordId, title:t.title, artist:t.channel, duration:dur, position:pos, playing:true}).catch(() => {});
  } else if (presSent) { presSent = false; send('/api/presence', {playing:false}).catch(() => {}); }
}

