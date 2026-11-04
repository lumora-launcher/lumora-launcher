<div align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Lumora Launcher Logo" />
  <h1>Lumora Launcher</h1>
  <p><strong>Modern, hızlı ve tamamen açık kaynaklı yeni nesil Minecraft Launcher</strong></p>
  <p>
    <a href="https://github.com/lumora-launcher/lumora-launcher/releases">⬇ İndir (Releases)</a> ·
    <a href="https://github.com/lumora-launcher/lumora-launcher/issues">🐞 Hata Bildir</a>
  </p>
</div>

---

## ✨ Neler Var? (v1.1.0)

- **🗂️ İzole Profil (Instance) Yönetimi:** Ana oyun klasörünü bozmadan **Fabric**, **OptiFine**, **Forge**, **Quilt** ve **Vanilla** profillerini birbirinden bağımsız `mods`, `saves`, `shaderpacks` ve `config` klasörlerinde tut.
- **🟢 Modrinth İçerik Mağazası & `.mrpack` Desteği:** Tarayıcıya ihtiyaç duymadan doğrudan launcher içinden **Mod**, **Modpack (`.mrpack`)**, **Shader** ve **Kaynak Paketi (Resource Pack)** ara, gerekli kütüphane bağımlılıklarıyla (*Fabric API* vb.) birlikte tek tıkla kur.
- **📦 Modpack İçe & Dışa Aktarma:** Bilgisayarındaki `.mrpack` paketlerini tek tıkla yeni profil olarak içe aktar veya kendi hazırladığın mod paketini `.mrpack` olarak dışa aktar.
- **📥 Başka Launcher'dan Profil Göçü (Import Wizard):** Bilgisayarındaki resmi `.minecraft`, **CurseForge**, **Prism Launcher**, **MultiMC** ve **Modrinth App** profillerini modları ve dünyalarıyla birlikte tek tıkla Lumora'ya kopyala.
- **🌐 Canlı Sunucu Listesi & Tek Tıkla Bağlan (`QuickPlay`):** Favori sunucularının canlı oyuncu sayısını, ping (ms) süresini, MOTD açıklamasını ve ikonunu gör; ana menüyü beklemeden doğrudan sunucuya bağlan.
- **🌍 Dünya (`saves`) Yöneticisi, ZIP Yedekleme & Ekran Görüntüsü Galerisi:** Tek oyunculu dünyalarına doğrudan gir, tek tıkla `.zip` yedeği al/geri yükle ve oyun içi `F2` ekran görüntülerini galeriden incele.
- **🔐 Microsoft (Xbox Live) & Çevrimdışı Hesap Desteği:** Resmi Microsoft hesabınla orijinal sunuculara gir veya çevrimdışı (offline) modda istediğin kullanıcı adıyla oyna.
- **🔍 Akıllı Çökme (Crash) Analizcisi:** Oyun çöktüğünde logları ve `crash-reports` klasörünü tarayarak eksik modları, Java uyumsuzluğunu veya RAM yetersizliğini Türkçe açıklar ve eksik modu Modrinth'te tek tıkla aratır.
- **💬 Discord Rich Presence & Sistem Tepsisi (System Tray):** Discord profilinde oynadığın sürümü ve mod sayısını canlı gösterir.
- **🎨 5 Renk Teması & 3 Arayüz Düzeni:** *Aurora*, *Zümrüt*, *Nether*, *Cyberpunk*, *Buzul* temaları ve *Modern*, *Sinematik Alt Bar*, *Minimalist* yerleşim düzenleri.
- **☕ Akıllı Java & Ana Sürüm Denetimi:** Seçilen sürümün ihtiyaç duyduğu resmi Mojang Java sürümünü ve ana Vanilla dosyalarını otomatik denetler ve indirir.

## 🛠️ Geliştirici Kurulumu

Projeyi kendi bilgisayarında çalıştırmak veya derlemek için:

```powershell
# Bağımlılıkları yükle
npm.cmd install

# Geliştirici modunda başlat
npm.cmd start

# Windows kurulum paketi (.exe) oluştur
npm.cmd run dist
```

Kurulum dosyası (`Lumora Launcher Setup 1.1.0.exe` ve `latest.yml`) `dist/` klasörüne oluşturulur.

## 📄 Lisans

Bu proje **MIT Lisansı** altında açık kaynak olarak sunulmaktadır.
