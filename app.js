// ----- State -----
let channels = [];
let zDir = "up"; // "up" => Y = left, "down" => Y = right

const CMP_OPTIONS = ["Off", "Ex", "Ey", "Hx", "Hy", "Hz", "Tx"];
const TX_POLE_THRESHOLD = 1000.0; // m

// ----- Init -----
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnCopyTemplate")
    .addEventListener("click", onCopyTemplate);

  document.getElementById("btnSaveTemplate")
    .addEventListener("click", onSaveTemplateFile);

  document.getElementById("btnLoadTemplate")
    .addEventListener("click", () => {
      document.getElementById("sttFileInput").click();
    });

  document.getElementById("sttFileInput")
    .addEventListener("change", onLoadTemplateFile);

  const zDirSel = document.getElementById("zDir");
  if (zDirSel) {
    zDirSel.addEventListener("change", () => {
      zDir = zDirSel.value === "down" ? "down" : "up";
      renderLayout();
      updateTemplateOutput();
    });
  }

  const numChInput = document.getElementById("numCh");
  if (numChInput) {
    numChInput.addEventListener("change", () => {
      let n = parseInt(numChInput.value || "1", 10);
      if (isNaN(n)) n = 1;
      n = Math.max(1, Math.min(16, n));
      numChInput.value = String(n);
      adjustChannelCount(n);
    });
  }

  const tmplNameInput = document.getElementById("templateName");
  if (tmplNameInput) {
    tmplNameInput.addEventListener("input", () => {
      updateTemplateOutput();
    });
  }

  // Initial default config
  initChannels(6);
  if (numChInput) numChInput.value = "6";
  renderChannelsTable();
  renderLayout();
  updateTemplateOutput();
});

// ----- Channels -----
function initChannels(n) {
  channels = [];
  for (let i = 0; i < n; i++) {
    channels.push({
      index: i + 1,
      cmp: i === 0 ? "Ex" : i === 1 ? "Off" : "Off",
      negX: i === 0 ? 0 : 0,
      negY: 0,
      posX: i === 0 ? 0 : 0,
      posY: i === 1 ? 0 : 0,
    });
  }
}

function adjustChannelCount(n) {
  const current = channels.length;

  if (n > current) {
    // Add new channels at the bottom as Off
    for (let i = current; i < n; i++) {
      channels.push({
        index: i + 1,
        cmp: "Off",
        negX: 0,
        negY: 0,
        posX: 0,
        posY: 0,
      });
    }
  } else if (n < current) {
    // Remove channels from the bottom
    channels = channels.slice(0, n);
  }

  // Reindex 1..N
  channels.forEach((ch, i) => {
    ch.index = i + 1;
  });

  renderChannelsTable();
  renderLayout();
  updateTemplateOutput();
}

// ----- Helpers: dipole length -----
function dipoleLengthNumeric(ch) {
  const dx = ch.posX - ch.negX;
  const dy = ch.posY - ch.negY;
  return Math.sqrt(dx * dx + dy * dy);
}

function computeDipoleLength(ch) {
  return dipoleLengthNumeric(ch).toFixed(1);
}

// ----- Table Rendering -----
function renderChannelsTable() {
  const tbody = document.querySelector("#channelsTable tbody");
  tbody.innerHTML = "";

  channels.forEach((ch, idx) => {
    const tr = document.createElement("tr");

    const isE  = ch.cmp === "Ex" || ch.cmp === "Ey" || ch.cmp === "Tx";
    const isH  = ch.cmp === "Hx" || ch.cmp === "Hy" || ch.cmp === "Hz";
    const isOff = ch.cmp === "Off";

    // Channel index
    tr.innerHTML = `<td>Ch ${idx + 1}</td>`;

    // CMP selector
    const cmpSel = document.createElement("select");
    CMP_OPTIONS.forEach(opt => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      if (opt === ch.cmp) o.selected = true;
      cmpSel.appendChild(o);
    });
    cmpSel.addEventListener("change", () => {
      ch.cmp = cmpSel.value;
      if (ch.cmp === "Off") {
        ch.negX = 0;
        ch.negY = 0;
        ch.posX = 0;
        ch.posY = 0;
      }
      renderChannelsTable();
      renderLayout();
      updateTemplateOutput();
    });
    const tdCmp = document.createElement("td");
    tdCmp.appendChild(cmpSel);
    tr.appendChild(tdCmp);

    // Input helpers
    function makeInput(prop, enabled = true) {
      const i = document.createElement("input");
      i.type = "number";
      i.step = "0.01";
      i.style.width = "4.5rem";
      i.disabled = !enabled;
      i.value = enabled ? ch[prop] : "";
      if (enabled) {
        i.addEventListener("input", () => {
          ch[prop] = parseFloat(i.value || 0);
          renderLayout();
          updateTemplateOutput();
          dipCell.textContent = isE ? computeDipoleLength(ch) : "-";
        });
      }
      return i;
    }

    function makeBlankDisabledCell() {
      const i = document.createElement("input");
      i.type = "text";
      i.disabled = true;
      i.style.width = "4.5rem";
      i.value = "";
      i.style.color = "#6b7280";
      return i;
    }

    // Offsets columns
    const tdNegX = document.createElement("td");
    const tdNegY = document.createElement("td");
    const tdPosX = document.createElement("td");
    const tdPosY = document.createElement("td");

    if (isE) {
      tdNegX.appendChild(makeInput("negX", true));
      tdNegY.appendChild(makeInput("negY", true));
      tdPosX.appendChild(makeInput("posX", true));
      tdPosY.appendChild(makeInput("posY", true));
    } else if (isH) {
      tdNegX.appendChild(makeInput("posX", true));
      tdNegY.appendChild(makeInput("posY", true));
      tdPosX.textContent = "n/a";
      tdPosY.textContent = "n/a";
      tdPosX.style.color = "#6b7280";
      tdPosY.style.color = "#6b7280";
    } else if (isOff) {
      tdNegX.appendChild(makeBlankDisabledCell());
      tdNegY.appendChild(makeBlankDisabledCell());
      tdPosX.appendChild(makeBlankDisabledCell());
      tdPosY.appendChild(makeBlankDisabledCell());
    }

    tr.appendChild(tdNegX);
    tr.appendChild(tdNegY);
    tr.appendChild(tdPosX);
    tr.appendChild(tdPosY);

    // Dipole length
    const dipCell = document.createElement("td");
    dipCell.textContent = isE ? computeDipoleLength(ch) : "-";
    if (isOff) dipCell.style.color = "#6b7280";
    tr.appendChild(dipCell);

    tbody.appendChild(tr);
  });
}

// ----- Layout preview -----
function renderLayout() {
  const svg = document.getElementById("layoutSvg");
  const width = svg.viewBox.baseVal.width || svg.width.baseVal.value || 700;
  const height = svg.viewBox.baseVal.height || svg.height.baseVal.value || 260;

  if (!svg.getAttribute("viewBox")) {
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  svg.innerHTML = "";

  const { maxXAbs, maxYAbs } = getExtents();
  const margin = 30;

  const spanX = Math.max(maxXAbs * 2 || 200, 200);
  const spanY = Math.max(maxYAbs * 2 || 200, 200);

  const ySign = (zDir === "up") ? 1 : -1;

  const toScreenX = (x) =>
    margin + ((x + spanX / 2) / spanX) * (width - 2 * margin);
  const toScreenY = (y) =>
    height - margin - ((y + spanY / 2) / spanY) * (height - 2 * margin);

  // Helpers
  function line(x1, y1, x2, y2, c, w = 1) {
    const L = document.createElementNS("http://www.w3.org/2000/svg", "line");
    L.setAttribute("x1", toScreenX(x1));
    L.setAttribute("y1", toScreenY(y1));
    L.setAttribute("x2", toScreenX(x2));
    L.setAttribute("y2", toScreenY(y2));
    L.setAttribute("stroke", c);
    L.setAttribute("stroke-width", w);
    svg.appendChild(L);
  }

  function drawPoint(x, y, color) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", toScreenX(x));
    c.setAttribute("cy", toScreenY(y));
    c.setAttribute("r", 3);
    c.setAttribute("fill", color);
    svg.appendChild(c);
  }

  function drawCoil(x, y, color) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", toScreenX(x));
    c.setAttribute("cy", toScreenY(y));
    c.setAttribute("r", 4);
    c.setAttribute("stroke", color);
    c.setAttribute("stroke-width", "2");
    c.setAttribute("fill", "none");
    svg.appendChild(c);
  }

  function drawLabel(x, y, text, kind = "default") {
    let offsetX = 4;
    let offsetY = -4;

    if (kind === "Hx") {
      offsetX = 6;
      offsetY = -8;
    } else if (kind === "Hy") {
      offsetX = 6;
      offsetY = 10;
    } else if (kind === "Hz") {
      offsetX = 6;
      offsetY = -8;
    } else if (kind === "dipole") {
      offsetX = 4;
      offsetY = -4;
    }

    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", toScreenX(x) + offsetX);
    t.setAttribute("y", toScreenY(y) + offsetY);
    t.setAttribute("fill", "#e5e7eb");
    t.setAttribute("font-size", "10");
    t.textContent = text;
    svg.appendChild(t);
  }

  function drawDipoleArrow(x1, y1, x2, y2, color) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const L = Math.sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;

    const ux = dx / L;
    const uy = dy / L;
    const arrowLen = 0.06 * Math.min(spanX, spanY);
    const vx = -uy;
    const vy = ux;

    const ax1x = x2 - ux * arrowLen + vx * arrowLen * 0.5;
    const ax1y = y2 - uy * arrowLen + vy * arrowLen * 0.5;
    const ax2x = x2 - ux * arrowLen - vx * arrowLen * 0.5;
    const ax2y = y2 - uy * arrowLen - vy * arrowLen * 0.5;

    line(ax1x, ax1y, x2, y2, color, 2);
    line(ax2x, ax2y, x2, y2, color, 2);
  }

  function drawArrowFromPoint(x0, y0, dx, dy, color) {
    const L = Math.sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    const len = 0.12 * Math.min(spanX, spanY);
    const ux = dx / L;
    const uy = dy / L;

    const x1 = x0;
    const y1 = y0;
    const x2 = x0 + ux * len;
    const y2 = y0 + uy * len;

    line(x1, y1, x2, y2, color, 2);

    const vx = -uy;
    const vy = ux;
    const headLen = len * 0.3;

    const ax1x = x2 - ux * headLen + vx * headLen * 0.5;
    const ax1y = y2 - uy * headLen + vy * headLen * 0.5;
    const ax2x = x2 - ux * headLen - vx * headLen * 0.5;
    const ax2y = y2 - uy * headLen - vy * headLen * 0.5;

    line(ax1x, ax1y, x2, y2, color, 2);
    line(ax2x, ax2y, x2, y2, color, 2);
  }

  function drawHzArrow(x, y, up, color) {
    const len = 0.15 * spanY;
    const half = len / 2;

    let fromY, toY;
    if (up) {
      fromY = y - half;
      toY   = y + half;
    } else {
      fromY = y + half;
      toY   = y - half;
    }

    line(x, fromY, x, toY, color, 2);

    const head = len * 0.3;
    if (up) {
      line(x - head * 0.4, toY - head * 0.4, x, toY, color, 2);
      line(x + head * 0.4, toY - head * 0.4, x, toY, color, 2);
    } else {
      line(x - head * 0.4, toY + head * 0.4, x, toY, color, 2);
      line(x + head * 0.4, toY + head * 0.4, x, toY, color, 2);
    }
  }

  // Axes
  line(-spanX / 2, 0, spanX / 2, 0, "#4b5563", 1);
  line(0, -spanY / 2, 0, spanY / 2, "#4b5563", 1);

  // Origin
  const origin = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  origin.setAttribute("cx", toScreenX(0));
  origin.setAttribute("cy", toScreenY(0));
  origin.setAttribute("r", 3);
  origin.setAttribute("fill", "#e5e7eb");
  svg.appendChild(origin);

  // X axis arrow + label
  const xArrow = document.createElementNS("http://www.w3.org/2000/svg", "line");
  xArrow.setAttribute("x1", toScreenX(spanX / 2 - spanX * 0.05));
  xArrow.setAttribute("y1", toScreenY(0));
  xArrow.setAttribute("x2", toScreenX(spanX / 2));
  xArrow.setAttribute("y2", toScreenY(0));
  xArrow.setAttribute("stroke", "#9ca3af");
  xArrow.setAttribute("stroke-width", "2");
  svg.appendChild(xArrow);

  const xLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
  xLabel.setAttribute("x", toScreenX(spanX / 2) - 4);
  xLabel.setAttribute("y", toScreenY(0) - 6);
  xLabel.setAttribute("fill", "#9ca3af");
  xLabel.setAttribute("font-size", "10");
  xLabel.setAttribute("text-anchor", "end");
  xLabel.textContent = "X (along line)";
  svg.appendChild(xLabel);

  // Y axis arrow + label
  const yArrow = document.createElementNS("http://www.w3.org/2000/svg", "line");
  yArrow.setAttribute("x1", toScreenX(0));
  yArrow.setAttribute("y1", toScreenY(spanY / 2 - spanY * 0.05));
  yArrow.setAttribute("x2", toScreenX(0));
  yArrow.setAttribute("y2", toScreenY(spanY / 2));
  yArrow.setAttribute("stroke", "#9ca3af");
  yArrow.setAttribute("stroke-width", "2");
  svg.appendChild(yArrow);

  const yLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
  yLabel.setAttribute("x", toScreenX(0) + 4);
  yLabel.setAttribute("y", toScreenY(spanY / 2) + 10);
  yLabel.setAttribute("fill", "#9ca3af");
  yLabel.setAttribute("font-size", "10");
  yLabel.textContent = (zDir === "up") ? "Y (left)" : "Y (right)";
  svg.appendChild(yLabel);

  // Channels
  channels.forEach(ch => {
    if (ch.cmp === "Off") return;

    const isE  = ch.cmp === "Ex" || ch.cmp === "Ey" || ch.cmp === "Tx";
    const isHx = ch.cmp === "Hx";
    const isHy = ch.cmp === "Hy";
    const isHz = ch.cmp === "Hz";

    const color = getCmpColor(ch.cmp);
    const baseLabel = `${ch.cmp}${ch.index}`;

    if (isE) {
      const x1 = ch.negX;
      const y1 = ch.negY * ySign;
      const x2 = ch.posX;
      const y2 = ch.posY * ySign;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const L  = Math.sqrt(dx * dx + dy * dy);

      if (ch.cmp === "Tx" && L > TX_POLE_THRESHOLD) {
        drawPoint(x2, y2, color);
        const dirX = x1 - x2;
        const dirY = y1 - y2;
        drawArrowFromPoint(x2, y2, dirX, dirY, color);
        drawLabel(x2, y2, baseLabel, "dipole");
      } else {
        line(x1, y1, x2, y2, color, 2);
        drawPoint(x1, y1, color);
        drawPoint(x2, y2, color);
        drawDipoleArrow(x1, y1, x2, y2, color);
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        drawLabel(mx, my, baseLabel, "dipole");
      }

    } else if (isHx || isHy || isHz) {
      const x = ch.posX;
      const y = ch.posY * ySign;

      drawCoil(x, y, color);

      if (isHx) {
        drawArrowFromPoint(x, y, 1, 0, color);
        drawLabel(x, y, baseLabel, "Hx");
      } else if (isHy) {
        drawArrowFromPoint(x, y, 0, 1 * ySign, color);
        drawLabel(x, y, baseLabel, "Hy");
      } else if (isHz) {
        const up = (zDir === "up");
        drawHzArrow(x, y, up, color);
        const hzLabel = `${baseLabel} ${up ? "↑" : "↓"}`;
        drawLabel(x, y, hzLabel, "Hz");
      }
    }
  });
}

function getExtents() {
  let maxXAbs = 0;
  let maxYAbs = 0;

  channels.forEach(ch => {
    const isE = ch.cmp === "Ex" || ch.cmp === "Ey" || ch.cmp === "Tx";

    if (isE && ch.cmp === "Tx") {
      const L = dipoleLengthNumeric(ch);
      if (L > TX_POLE_THRESHOLD) {
        maxXAbs = Math.max(maxXAbs, Math.abs(ch.posX));
        maxYAbs = Math.max(maxYAbs, Math.abs(ch.posY));
        return;
      }
    }

    maxXAbs = Math.max(maxXAbs, Math.abs(ch.negX), Math.abs(ch.posX));
    maxYAbs = Math.max(maxYAbs, Math.abs(ch.negY), Math.abs(ch.posY));
  });

  return { maxXAbs, maxYAbs };
}

function getCmpColor(cmp) {
  return {
    Ex: "#22c55e",
    Ey: "#38bdf8",
    Tx: "#ef4444",
    Hx: "#f97316",
    Hy: "#eab308",
    Hz: "#a855f7"
  }[cmp] || "#6b7280";
}

// ----- Template export (with tabs indentation) -----
function updateTemplateOutput() {
  const ySign = (zDir === "up") ? 1 : -1;
  const blockLines = [];

  channels.forEach((ch, idx) => {
    if (ch.cmp === "Off") return;

    const chIdx = idx + 1;
    const isE  = ch.cmp === "Ex" || ch.cmp === "Ey" || ch.cmp === "Tx";
    const isHx = ch.cmp === "Hx";
    const isHy = ch.cmp === "Hy";
    const isHz = ch.cmp === "Hz";

    const lines = [];
    lines.push("\t<CH>");
    lines.push(`\t\tCH.CMP = ${ch.cmp}`);
    lines.push(`\t\tCH.INDEX = ${chIdx}`);

    if (isE) {
      lines.push(`\t\tCH.NAME1 = ${ch.cmp}${chIdx}-`);
      lines.push(
        `\t\tCH.OFFSET.XYZ1 = ${ch.negX.toFixed(3)}:${(ch.negY * ySign).toFixed(3)}:0`
      );
      lines.push(`\t\tCH.NAME2 = ${ch.cmp}${chIdx}+`);
      lines.push(
        `\t\tCH.OFFSET.XYZ2 = ${ch.posX.toFixed(3)}:${(ch.posY * ySign).toFixed(3)}:0`
      );
    } else if (isHx || isHy || isHz) {
      lines.push(`\t\tCH.NAME1 = ${ch.cmp}${chIdx}`);
      lines.push(
        `\t\tCH.OFFSET.XYZ1 = ${ch.posX.toFixed(3)}:${(ch.posY * ySign).toFixed(3)}:0`
      );
      if (isHy) {
        lines.push("\t\tCH.AZIMUTH = 90");
      } else {
        lines.push("\t\tCH.AZIMUTH = 0");
      }
      if (isHz) {
        lines.push("\t\tCH.INCL = 90.000");
      } else {
        lines.push("\t\tCH.INCL = 0");
      }
    }

    lines.push("\t</CH>");
    blockLines.push(lines.join("\n"));
  });

  const nameRaw = (document.getElementById("templateName").value || "ZEN_template").trim();
  const templateName = nameRaw || "ZEN_template";
  const zPos = (zDir === "down") ? "DOWN" : "UP";

  const allLines = [];
  allLines.push("<TEMPLATE>");
  allLines.push(`\tTEMPLATE.NAME=${templateName}`);
  allLines.push("\tRX.XAZIMUTH=90");
  allLines.push(`\tRX.ZPOSITIVE=${zPos}`);
  allLines.push("");

  if (blockLines.length > 0) {
    allLines.push(blockLines.join("\n\n"));
    allLines.push("");
  }

  allLines.push("</TEMPLATE>");

  document.getElementById("templateOutput").value = allLines.join("\n");
}

// ----- Copy / Save -----
function onCopyTemplate() {
  const text = document.getElementById("templateOutput").value;
  if (!text) return;
  navigator.clipboard.writeText(text);
}

function onSaveTemplateFile() {
  const text = document.getElementById("templateOutput").value;
  if (!text) return;

  let nameRaw = (document.getElementById("templateName").value || "ZEN_template").trim();
  if (!nameRaw) nameRaw = "ZEN_template";
  const safeName = nameRaw.replace(/[^\w.-]+/g, "_");

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = safeName + ".stt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ----- Load .stt -----
function onLoadTemplateFile(e) {
  const input = e.target;
  if (!input.files || !input.files.length) return;
  const file = input.files[0];

  const reader = new FileReader();
  reader.onload = (evt) => {
    const text = evt.target.result;
    try {
      loadTemplateFromText(text);
    } catch (err) {
      console.error("Error parsing .stt:", err);
      alert("Error parsing .stt file. See console for details.");
    }
  };
  reader.readAsText(file);

  input.value = "";
}

function loadTemplateFromText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  let templateName = "ZEN_template";
  let zPos = "UP";

  const chBlocks = [];
  let currentCH = null;

  lines.forEach(line => {
    if (line.startsWith("TEMPLATE.NAME")) {
      const parts = line.split("=", 2);
      if (parts.length === 2) templateName = parts[1].trim();
    } else if (line.startsWith("RX.ZPOSITIVE")) {
      const parts = line.split("=", 2);
      if (parts.length === 2) {
        const v = parts[1].trim().toUpperCase();
        if (v === "DOWN" || v === "UP") zPos = v;
      }
    } else if (line.startsWith("<CH>")) {
      currentCH = {};
    } else if (line.startsWith("</CH>")) {
      if (currentCH) chBlocks.push(currentCH);
      currentCH = null;
    } else if (currentCH && line.includes("=")) {
      const parts = line.split("=", 2);
      const key = parts[0].trim();
      const val = parts[1].trim();
      currentCH[key] = val;
    }
  });

  document.getElementById("templateName").value = templateName;
  zDir = (zPos === "DOWN") ? "down" : "up";
  const zSelect = document.getElementById("zDir");
  if (zSelect) zSelect.value = zDir;

  const zSignFile = (zPos === "DOWN") ? -1 : 1;

  const newChannels = [];

  function parseXYZ(str) {
    if (!str) return [0, 0, 0];
    const parts = str.split(":");
    const x = parseFloat(parts[0] || "0");
    const y = parseFloat(parts[1] || "0");
    const z = parseFloat(parts[2] || "0");
    return [x, y, z];
  }

  chBlocks.forEach(ch => {
    const cmp = (ch["CH.CMP"] || "Off").trim();
    const idx = parseInt(ch["CH.INDEX"] || "0", 10) || 0;

    if (!["Ex", "Ey", "Tx", "Hx", "Hy", "Hz"].includes(cmp)) {
      return;
    }

    const [x1_file, y1_file] = parseXYZ(ch["CH.OFFSET.XYZ1"]);
    const [x2_file, y2_file] = parseXYZ(ch["CH.OFFSET.XYZ2"]);

    const localNegX = x1_file;
    const localNegY = y1_file / zSignFile;
    const localPosX = x2_file;
    const localPosY = y2_file / zSignFile;

    if (cmp === "Ex" || cmp === "Ey" || cmp === "Tx") {
      newChannels.push({
        index: idx,
        cmp: cmp,
        negX: localNegX,
        negY: localNegY,
        posX: localPosX,
        posY: localPosY,
      });
    } else {
      newChannels.push({
        index: idx,
        cmp: cmp,
        negX: 0,
        negY: 0,
        posX: localNegX,
        posY: localNegY,
      });
    }
  });

  if (!newChannels.length) {
    alert("No valid CH blocks found in .stt file.");
    return;
  }

  newChannels.sort((a, b) => a.index - b.index);
  newChannels.forEach((ch, i) => ch.index = i + 1);

  channels = newChannels;
  const numChInput = document.getElementById("numCh");
  if (numChInput) numChInput.value = String(channels.length);

  renderChannelsTable();
  renderLayout();
  updateTemplateOutput();
}