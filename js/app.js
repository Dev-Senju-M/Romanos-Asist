(function () {
  let members = [];
  let events = [];
  let attendanceByEvent = {};

  function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 1800);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  }

  async function loadAll() {
    const [{ data: m, error: mErr }, { data: e, error: eErr }, { data: a, error: aErr }] =
        await Promise.all([
          supabaseClient.from("members").select("*").order("created_at", { ascending: true }),
          supabaseClient.from("events").select("*").order("event_date", { ascending: true }),
          supabaseClient.from("attendance").select("*"),
        ]);

    if (mErr || eErr || aErr) {
      console.error(mErr || eErr || aErr);
      showToast("No se pudo conectar con Supabase. Revisa js/supabaseClient.js");
      return;
    }

    members = m || [];
    events = e || [];
    attendanceByEvent = {};
    (a || []).forEach((row) => {
      if (!attendanceByEvent[row.event_id]) attendanceByEvent[row.event_id] = {};
      attendanceByEvent[row.event_id][row.member_id] = row.mark;
    });

    renderAll();
  }

  function renderAll() {
    renderMembers();
    renderEvents();
    renderEventSelect();
    renderAttendanceTab();
    renderRanking();
  }

  document.getElementById("formMember").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("memberName");
    const name = input.value.trim();
    if (!name) return;

    const { error } = await supabaseClient.from("members").insert({ name });
    if (error) {
      console.error(error);
      showToast("No se pudo agregar al integrante.");
      return;
    }
    input.value = "";
    showToast("Integrante agregado");
    await loadAll();
  });

  function renderMembers() {
    const list = document.getElementById("memberList");
    const empty = document.getElementById("memberEmpty");
    list.innerHTML = "";
    if (members.length === 0) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    members.forEach((m) => {
      const li = document.createElement("li");
      li.innerHTML = "<span class=\"name\">" + escapeHtml(m.name) + "</span>";
      const del = document.createElement("button");
      del.className = "btn ghost";
      del.textContent = "Quitar";
      del.addEventListener("click", async () => {
        if (!confirm("Quitar a " + m.name + " de la comision? Se borrara su asistencia registrada.")) return;
        const { error } = await supabaseClient.from("members").delete().eq("id", m.id);
        if (error) {
          console.error(error);
          showToast("No se pudo quitar al integrante.");
          return;
        }
        await loadAll();
      });
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  document.getElementById("formEvent").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("eventName");
    const dateInput = document.getElementById("eventDate");
    const name = nameInput.value.trim();
    const dateVal = dateInput.value;
    if (!name || !dateVal) return;

    const { error } = await supabaseClient.from("events").insert({ name, event_date: dateVal });
    if (error) {
      console.error(error);
      showToast("No se pudo crear el encuentro.");
      return;
    }
    nameInput.value = "";
    dateInput.value = "";
    showToast("Encuentro creado");
    await loadAll();
  });

  function renderEvents() {
    const list = document.getElementById("eventList");
    const empty = document.getElementById("eventEmpty");
    list.innerHTML = "";
    if (events.length === 0) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    events.forEach((ev) => {
      const li = document.createElement("li");
      li.innerHTML = "<span><span class=\"name\">" + escapeHtml(ev.name) + "</span><span class=\"meta\">" + formatDate(ev.event_date) + "</span></span>";
      const del = document.createElement("button");
      del.className = "btn ghost";
      del.textContent = "Eliminar";
      del.addEventListener("click", async () => {
        if (!confirm("Eliminar el encuentro \"" + ev.name + "\"? Se borrara la asistencia registrada.")) return;
        const { error } = await supabaseClient.from("events").delete().eq("id", ev.id);
        if (error) {
          console.error(error);
          showToast("No se pudo eliminar el encuentro.");
          return;
        }
        await loadAll();
      });
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  function renderEventSelect() {
    const sel = document.getElementById("eventSelect");
    const prev = sel.value;
    sel.innerHTML = "";
    events.forEach((ev) => {
      const opt = document.createElement("option");
      opt.value = ev.id;
      opt.textContent = ev.name + " - " + formatDate(ev.event_date);
      sel.appendChild(opt);
    });
    if (prev && events.some((e) => e.id === prev)) sel.value = prev;
  }

  function renderAttendanceTab() {
    const table = document.getElementById("attTable");
    const empty = document.getElementById("attEmpty");
    const sel = document.getElementById("eventSelect");

    if (members.length === 0 || events.length === 0) {
      table.style.display = "none";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    table.style.display = "table";

    const eventId = sel.value || (events[0] && events[0].id);
    if (sel.value !== eventId) sel.value = eventId;

    const marks = attendanceByEvent[eventId] || {};
    const body = document.getElementById("attBody");
    body.innerHTML = "";

    members.forEach((m) => {
      const mark = marks[m.id];
      const tr = document.createElement("tr");
      const tdName = document.createElement("td");
      tdName.textContent = m.name;
      const tdStamp = document.createElement("td");
      const row = document.createElement("div");
      row.className = "stamp-row";

      [["a", "A"], ["ex", "Ex"], ["f", "F"]].forEach(([cls, label]) => {
        const btn = document.createElement("button");
        btn.className = "stamp " + cls + (mark === label ? " on" : "");
        btn.textContent = label;
        btn.setAttribute("aria-label", label + " para " + m.name);
        btn.addEventListener("click", async () => {
          await setMark(eventId, m.id, mark === label ? null : label);
        });
        row.appendChild(btn);
      });

      tdStamp.appendChild(row);
      tr.appendChild(tdName);
      tr.appendChild(tdStamp);
      body.appendChild(tr);
    });
  }

  async function setMark(eventId, memberId, mark) {
    if (mark === null) {
      const { error } = await supabaseClient.from("attendance").delete().eq("event_id", eventId).eq("member_id", memberId);
      if (error) {
        console.error(error);
        showToast("No se pudo actualizar la marca.");
        return;
      }
    } else {
      const { error } = await supabaseClient.from("attendance").upsert({ event_id: eventId, member_id: memberId, mark }, { onConflict: "event_id,member_id" });
      if (error) {
        console.error(error);
        showToast("No se pudo actualizar la marca.");
        return;
      }
    }
    await loadAll();
  }

  document.getElementById("eventSelect").addEventListener("change", renderAttendanceTab);

  function pointsFor(mark) {
    if (mark === "A") return 3;
    if (mark === "Ex") return 1;
    return 0;
  }

  function percentFor(mark) {
    if (mark === "A") return 100;
    if (mark === "Ex") return 50;
    return 0;
  }

  function monthKey(iso) {
    return iso.slice(0, 7); // "YYYY-MM"
  }

  function monthLabel(key) {
    const d = new Date(key + "-01T00:00:00");
    const label = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function getMonthKeys() {
    const keys = Array.from(new Set(events.map((ev) => monthKey(ev.event_date))));
    keys.sort();
    return keys;
  }

  function renderRankMonthSelect() {
    const sel = document.getElementById("rankMonthSelect");
    const prev = sel.value;
    const keys = getMonthKeys();
    sel.innerHTML = "";

    keys.forEach((key) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = monthLabel(key);
      sel.appendChild(opt);
    });

    if (keys.length > 0) {
      const optAll = document.createElement("option");
      optAll.value = "__all__";
      optAll.textContent = "Todos los meses (total)";
      sel.appendChild(optAll);
    }

    if (prev && (keys.includes(prev) || prev === "__all__")) {
      sel.value = prev;
    } else if (keys.length > 0) {
      sel.value = keys[keys.length - 1]; // mes mas reciente por defecto
    }
  }

  function computeMonthRows(monthEvents) {
    const numEvents = monthEvents.length;
    return members.map((m) => {
      let a = 0, ex = 0, f = 0, percentSum = 0;
      monthEvents.forEach((ev) => {
        const mark = (attendanceByEvent[ev.id] || {})[m.id];
        if (mark === "A") a++;
        else if (mark === "Ex") ex++;
        else f++;
        percentSum += percentFor(mark);
      });
      const pct = numEvents > 0 ? percentSum / numEvents : 0;
      const pts = (pct / 100) * 20;
      return { name: m.name, a, ex, f, pct, pts };
    });
  }

  function getRankingData(selected, monthKeys) {
    let rows;
    let maxPts;
    let label;

    if (selected === "__all__") {
      maxPts = 20 * monthKeys.length;
      label = "Todos los meses";
      const totals = {};
      members.forEach((m) => { totals[m.name] = { name: m.name, a: 0, ex: 0, f: 0, pts: 0 }; });
      monthKeys.forEach((key) => {
        const monthEvents = events.filter((ev) => monthKey(ev.event_date) === key);
        computeMonthRows(monthEvents).forEach((r) => {
          const t = totals[r.name];
          t.a += r.a;
          t.ex += r.ex;
          t.f += r.f;
          t.pts += r.pts;
        });
      });
      rows = Object.values(totals);
    } else {
      maxPts = 20;
      label = monthLabel(selected);
      const monthEvents = events.filter((ev) => monthKey(ev.event_date) === selected);
      rows = computeMonthRows(monthEvents);
    }

    rows.sort((x, y) => y.pts - x.pts);
    return { rows, maxPts, label };
  }

  function renderRanking() {
    const table = document.getElementById("rankTable");
    const empty = document.getElementById("rankEmpty");
    const body = document.getElementById("rankBody");
    body.innerHTML = "";

    renderRankMonthSelect();
    const sel = document.getElementById("rankMonthSelect");
    const monthKeys = getMonthKeys();

    const hasAnyMark = Object.values(attendanceByEvent).some((byMember) => Object.keys(byMember).length > 0);

    if (members.length === 0 || monthKeys.length === 0 || !hasAnyMark) {
      table.style.display = "none";
      empty.style.display = "block";
      return;
    }

    const selected = sel.value;
    const { rows, maxPts } = getRankingData(selected, monthKeys);

    empty.style.display = "none";
    table.style.display = "table";

    rows.forEach((r, i) => {
      const tr = document.createElement("tr");
      const pct = maxPts > 0 ? Math.round((r.pts / maxPts) * 100) : 0;
      tr.innerHTML =
          "<td class=\"pos" + (i === 0 ? " gold" : "") + "\">" + (i + 1) + "</td>" +
          "<td>" + escapeHtml(r.name) + "</td>" +
          "<td class=\"counts\">" + r.a + " A - " + r.ex + " Ex - " + r.f + " F</td>" +
          "<td class=\"pts\">" + pct + "%</td>" +
          "<td class=\"pts\">" + r.pts.toFixed(1) + " / " + maxPts + " pts</td>" +
          "<td><div class=\"bar-bg\"><div class=\"bar-fill\" style=\"width:" + pct + "%\"></div></div></td>";
      body.appendChild(tr);
    });
  }

  document.getElementById("rankMonthSelect").addEventListener("change", renderRanking);

  document.getElementById("btnExportExcel").addEventListener("click", () => {
    const sel = document.getElementById("rankMonthSelect");
    const monthKeys = getMonthKeys();

    if (members.length === 0 || monthKeys.length === 0) {
      showToast("No hay datos suficientes para exportar.");
      return;
    }

    const selected = sel.value;
    const { rows, maxPts, label } = getRankingData(selected, monthKeys);

    const sheetData = rows.map((r, i) => ({
      "#": i + 1,
      "Integrante": r.name,
      "A": r.a,
      "Ex": r.ex,
      "F": r.f,
      "Porcentaje": (maxPts > 0 ? Math.round((r.pts / maxPts) * 100) : 0) + "%",
      "Puntaje": Number(r.pts.toFixed(1)),
      "Puntaje maximo": maxPts,
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    ws["!cols"] = [{ wch: 4 }, { wch: 24 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 14 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ranking");

    const safeLabel = label.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_");
    XLSX.writeFile(wb, "Ranking_" + safeLabel + ".xlsx");
    showToast("Excel exportado");
  });

  document.querySelectorAll("nav.tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("nav.tabs button").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll("section.panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "ranking") renderRanking();
      if (btn.dataset.tab === "asistencia") renderAttendanceTab();
    });
  });

  loadAll();
})();