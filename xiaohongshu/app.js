const packList = document.querySelector("#pack-list");
const packDetail = document.querySelector("#pack-detail");
const packSearch = document.querySelector("#pack-search");
const toast = document.querySelector("#toast");
const sharePage = document.querySelector("#share-page");
const updateTime = document.querySelector("#update-time");

let packs = [];
let activeId = null;
let query = "";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1700);
}

async function copyText(value, message = "已复制") {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const area = document.createElement("textarea");
    area.value = value;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  showToast(message);
}

function isPublished(id) {
  return localStorage.getItem(`xhs-published:${id}`) === "true";
}

function packText(pack) {
  const slides = pack.slides.map((slide) => `${slide.label}\n${slide.text}`).join("\n\n");
  return `【标题】\n${pack.recommendedTitle}\n\n【发布正文】\n${pack.caption}\n\n【话题标签】\n${pack.hashtags.join(" ")}\n\n【轮播逐页】\n${slides}`;
}

function downloadPack(pack) {
  const blob = new Blob([packText(pack)], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${pack.name}-发布包.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function setActive(id) {
  activeId = id;
  history.replaceState(null, "", `#${encodeURIComponent(id)}`);
  renderList();
  renderDetail();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderList() {
  const needle = query.toLowerCase();
  const visible = packs.filter((pack) => `${pack.name} ${pack.status} ${pack.recommendedTitle}`.toLowerCase().includes(needle));
  packList.innerHTML = visible.map((pack) => `
    <button class="pack-item${pack.id === activeId ? " active" : ""}" type="button" data-pack="${escapeHtml(pack.id)}">
      <strong>${escapeHtml(pack.name)}</strong>
      <span>${escapeHtml(pack.status)} · ${escapeHtml(pack.version)}${isPublished(pack.id) ? " · 已发布" : ""}</span>
    </button>`).join("") || '<div class="placeholder">没有匹配内容</div>';
  packList.querySelectorAll("[data-pack]").forEach((button) => button.addEventListener("click", () => setActive(button.dataset.pack)));
}

function section(title, content, copyLabel) {
  return `<section class="copy-section">
    <div class="copy-section-header"><h3>${escapeHtml(title)}</h3><button class="action" type="button" data-copy="${escapeHtml(content)}">${copyLabel}</button></div>
    <div class="copy-content">${escapeHtml(content)}</div>
  </section>`;
}

function renderDetail() {
  const pack = packs.find((item) => item.id === activeId);
  if (!pack) {
    packDetail.innerHTML = '<div class="placeholder">请选择一篇内容</div>';
    return;
  }
  const published = isPublished(pack.id);
  const titles = pack.titleCandidates.map((title, index) => `
    <div class="title-option"><span>${index + 1}. ${escapeHtml(title)}</span><button class="action" type="button" data-copy="${escapeHtml(title)}">复制</button></div>`).join("");
  const slides = pack.slides.map((slide, index) => `
    <details class="slide"${index === 0 ? " open" : ""}>
      <summary><span>${escapeHtml(slide.label)}</span><span>展开</span></summary>
      <div class="slide-body"><div class="slide-text">${escapeHtml(slide.text)}</div><button class="action" type="button" data-copy="${escapeHtml(slide.text)}">复制这一页</button></div>
    </details>`).join("");
  const tags = pack.hashtags.join(" ");
  packDetail.innerHTML = `
    <section class="pack-header">
      <p class="meta">${escapeHtml(pack.status)} · ${escapeHtml(pack.version)} · ${pack.slides.length}页</p>
      <h2>${escapeHtml(pack.name)}</h2>
      <p class="hint">发布前请人工复核事实、措辞和封面，并由你亲自点击发送。</p>
      <div class="pack-actions">
        <button id="copy-all" class="action" type="button">复制完整包</button>
        <button id="download-pack" class="action secondary" type="button">下载 TXT</button>
        <button id="copy-link" class="action secondary" type="button">复制此稿链接</button>
        <button id="mark-published" class="action secondary${published ? " done" : ""}" type="button">${published ? "已标记发布" : "标记已发布"}</button>
      </div>
    </section>
    <section class="copy-section"><div class="copy-section-header"><h3>标题候选</h3><button class="action" type="button" data-copy="${escapeHtml(pack.recommendedTitle)}">复制推荐标题</button></div><div class="copy-content title-options">${titles}</div></section>
    ${section("发布正文", pack.caption || "尚未形成发布正文", "复制正文")}
    ${section("话题标签", tags || "暂无标签", "复制标签")}
    <section class="copy-section"><div class="copy-section-header"><h3>轮播逐页 · ${pack.slides.length}页</h3><button id="copy-slides" class="action" type="button">复制全部</button></div><div class="copy-content slides">${slides}</div></section>`;

  packDetail.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", () => copyText(button.dataset.copy)));
  document.querySelector("#copy-all").addEventListener("click", () => copyText(packText(pack), "完整发布包已复制"));
  document.querySelector("#download-pack").addEventListener("click", () => downloadPack(pack));
  document.querySelector("#copy-link").addEventListener("click", () => copyText(location.href, "此稿链接已复制"));
  document.querySelector("#copy-slides").addEventListener("click", () => copyText(pack.slides.map((slide) => `${slide.label}\n${slide.text}`).join("\n\n"), "全部逐页文案已复制"));
  document.querySelector("#mark-published").addEventListener("click", () => {
    localStorage.setItem(`xhs-published:${pack.id}`, String(!published));
    renderList();
    renderDetail();
  });
}

packSearch.addEventListener("input", (event) => {
  query = event.target.value.trim();
  renderList();
});

sharePage.addEventListener("click", async () => {
  if (navigator.share) {
    try { await navigator.share({ title: document.title, url: location.href }); return; } catch {}
  }
  copyText(location.href, "工作台链接已复制");
});

fetch("./publish-packs.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error("load failed");
    return response.json();
  })
  .then((data) => {
    packs = data;
    const fromHash = decodeURIComponent(location.hash.slice(1));
    activeId = packs.some((pack) => pack.id === fromHash) ? fromHash : packs[0]?.id;
    const newest = packs.map((pack) => pack.updatedAt).filter(Boolean).sort().at(-1);
    updateTime.textContent = newest ? `内容更新 ${newest}` : `${packs.length} 个发布包`;
    renderList();
    renderDetail();
  })
  .catch(() => {
    packDetail.innerHTML = '<div class="placeholder">发布包加载失败，请刷新页面。</div>';
    updateTime.textContent = "同步失败";
  });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
