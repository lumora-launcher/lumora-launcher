# 📣 Lumora Launcher — Tanıtım & Büyüme Rehberi (v1.3.0)

GitHub'a yayınladıktan sonra projenin kendi kendine keşfedilmesi ve organik indirme alması için uygulayabileceğin en etkili adımlar:

---

## 1️⃣ İlk 2 Dakikalık GitHub Ayarları (Çok Önemli)

1. **Resmi Web Sitesini Aç (GitHub Pages):**
   - Repo sayfasında **Settings → Pages** bölümüne gir.
   - **Source:** `Deploy from a branch` seç.
   - **Branch:** `main` ve klasör olarak **`/docs`** seçip **Save** butonuna bas.
   - 1 dakika içinde tanıtım & indirme siten yayında olur:
     `https://lumora-launcher.github.io/lumora-launcher/`
2. **GitHub Topics (Arama Etiketleri) Ekle:**
   - Repo ana sayfasının sağ üstündeki **About ⚙️** simgesine tıkla:
   - **Website** alanına `https://lumora-launcher.github.io/lumora-launcher/` yaz.
   - **Topics** alanına şu etiketleri ekle:
     `minecraft` `minecraft-launcher` `modrinth` `fabric` `neoforge` `electron` `minecraft-mods` `open-source`

---

## 2️⃣ Hazır Forum Paylaşımı (Technopat Sosyal / DonanımArşivi / ShiftDelete)

**Başlık Önerisi:**
> `[Açık Kaynak] Lumora Launcher v1.3.0 — Dahili Modrinth, Mod Doktoru, 3B Alex/Steve Skin Stüdyosu & 7 Dil Desteği`

**Konu İçeriği (Kopyala-Yapıştır):**
```markdown
Selamlar! Sıfırdan **Electron + Node.js** ile geliştirdiğim tamamen açık kaynaklı (`MIT Lisansı`), reklamsız ve modern Minecraft Launcher projem **Lumora Launcher v1.3.0**'ı paylaşmak istiyorum.

### Neler Yapabiliyor?
- **🗂️ İzole Profiller:** Fabric, NeoForge, Forge, OptiFine, Quilt ve Vanilla profilleri birbirinden ayrı klasörlerde tutulur; özel RAM ve simge atayabilirsiniz.
- **🟢 Dahili Modrinth Mağazası & `.mrpack`:** Tarayıcı açmadan mod, shader, kaynak paketi ve modpack arayıp gerekli kütüphaneleriyle kurabilirsiniz.
- **🩺 Oyun Öncesi Mod Doktoru:** Oyuna girmeden önce eksik kütüphaneleri (*Fabric API*, *Cloth Config* vb.) tespit edip çökmeden uyarır.
- **📦 Sürükle-Bırak Kurulum:** Launcher penceresine `.jar`, `.zip` (shader/kaynak) veya `.mrpack` dosyasını sürükleyip bırakmanız yeterli.
- **👕 Dahili 3B Skin Stüdyosu:** Mojang API üzerinden otomatik ince kol (Alex 3px) ve klasik (Steve 4px) 3B önizleme + özel PNG yükleme.
- **🔐 Güvenlik & Şeffaflık:** Microsoft OAuth2 oturumları Windows DPAPI (`safeStorage`) ile yerel cihazınızda şifrelenir. Tüm kod açıktır ve GitHub'dan incelenebilir.

🌐 **Resmi İndirme Sitesi:** https://lumora-launcher.github.io/lumora-launcher/
💻 **GitHub Kaynak Kodu & Sürümler:** https://github.com/lumora-launcher/lumora-launcher

*Not: Proje tamamen bağımsız ve açık kaynaklıdır; Mojang AB veya Microsoft ile resmi bir bağlantısı yoktur.*
Görüş ve önerilerinizi bekliyorum!
```

---

## 3️⃣ Hazır Reddit Paylaşımı (`r/feedthebeast`, `r/opensource`, `r/Minecraft`)

**Title:**
> `I built Lumora Launcher v1.3.0 — an open-source Electron Minecraft Launcher with built-in Modrinth store, Pre-Launch Mod Doctor, Drag & Drop installs, and 3D Alex/Steve Skin Studio`

**Body:**
```markdown
Hey everyone! After several beta iterations with community feedback, I just released **Lumora Launcher v1.3.0 (Stable)** under the **MIT License**.

It is a lightweight, ad-free Windows launcher built with Electron and designed to remove the friction of managing modded Minecraft instances:

- **🗂️ Isolated Instances:** Separate directories per profile for **Fabric, NeoForge, Forge, OptiFine, Quilt, and Vanilla**, with 1-click duplication, custom icons, and per-instance RAM limits.
- **🩺 Pre-Launch Mod & Dependency Doctor:** Scans `.jar` metadata (`fabric.mod.json`, `mods.toml`, `neoforge.mods.toml`) before launching to catch missing dependencies (like Fabric API or Cloth Config) before your game crashes.
- **📦 Drag & Drop Smart Installer:** Drop `.jar`, `.zip` (auto-detects shaderpacks vs resourcepacks), or `.mrpack` files anywhere onto the window.
- **🟢 Integrated Modrinth Store + Importer:** Search and install Mods, Modpacks (`.mrpack`), Shaders, and Resource Packs directly, or import existing instances from `.minecraft`, CurseForge, Prism, and Modrinth App.
- **👕 Built-in 3D Canvas Skin Studio:** Supports both 3px slim (Alex) and 4px classic (Steve) rendering, Mojang UUID lookup, custom PNG preview, and direct Microsoft upload.
- **🌍 7 Languages Out of the Box:** Auto-detects OS language across EN, TR, DE, ES, RU, FR, and PT.
- **🔒 Security:** Official Microsoft logins are encrypted locally using Windows DPAPI (`safeStorage`), and updates verify GitHub SHA-256 / SHA-512 hashes.

🌐 Website: https://lumora-launcher.github.io/lumora-launcher/
📦 Source & Releases: https://github.com/lumora-launcher/lumora-launcher

Feedback, bug reports, and contributions are very welcome!
```

---

## 4️⃣ Diğer Ücretsiz Keşfedilme Kanalları
- **AlternativeTo (`alternativeto.net`):** *Prism Launcher*, *Modrinth App* ve *ATLauncher* alternatifi olarak ücretsiz listele.
- **Kısa Video (YouTube Shorts / TikTok / Reels):** 25 saniyede *"5 Tema Değişimi + Sürükle-Bırak Mod Kurulumu + 3B Skin Stüdyosu + Mod Doktoru"* videosu çekip açıklama kısmına `lumora-launcher.github.io/lumora-launcher` linkini bırak.
