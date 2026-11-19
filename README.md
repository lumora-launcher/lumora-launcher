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

## ✨ Neler Var? (v1.2.1-beta)

- **🗂️ İzole Profil (Instance) Yönetimi:** Ana oyun klasörünü bozmadan **Fabric**, **NeoForge**, **OptiFine**, **Forge**, **Quilt** ve **Vanilla** profillerini birbirinden bağımsız `mods`, `saves`, `shaderpacks` ve `config` klasörlerinde tut.
- **🟢 Modrinth İçerik Mağazası & `.mrpack` Desteği:** Tarayıcıya ihtiyaç duymadan doğrudan launcher içinden **Mod**, **Modpack (`.mrpack`)**, **Shader** ve **Kaynak Paketi (Resource Pack)** ara, gerekli kütüphane bağımlılıklarıyla (*Fabric API* vb.) birlikte tek tıkla kur.
- **📦 Modpack İçe & Dışa Aktarma:** Bilgisayarındaki `.mrpack` paketlerini tek tıkla yeni profil olarak içe aktar veya kendi hazırladığın mod paketini `.mrpack` olarak dışa aktar.
- **📥 Başka Launcher'dan Profil Göçü (Import Wizard):** Bilgisayarındaki resmi `.minecraft`, **CurseForge**, **Prism Launcher**, **MultiMC** ve **Modrinth App** profillerini modları ve dünyalarıyla birlikte tek tıkla Lumora'ya kopyala.
- **🌐 Canlı Sunucu Listesi & Tek Tıkla Bağlan (`QuickPlay`):** Favori sunucularının canlı oyuncu sayısını, ping (ms) süresini, MOTD açıklamasını ve ikonunu gör; ana menüyü beklemeden doğrudan sunucuya bağlan.
- **🌍 Dünya (`saves`) Yöneticisi, ZIP Yedekleme & Ekran Görüntüsü Galerisi:** Tek oyunculu dünyalarına doğrudan gir, tek tıkla `.zip` yedeği al/geri yükle ve oyun içi `F2` ekran görüntülerini galeriden incele.
- **👕 3B Skin & Karakter Stüdyosu:** Tam boy 3B karakter önizleme, oyuncu adına göre skin arama, `.png` olarak bilgisayara indirme ve orijinal Microsoft hesabına doğrudan `.png` skin yükleme (*Klasik/Steve* ve *İnce/Alex* modelleri).
- **⚙️ Uygulama İçi Config & `options.txt` Düzenleyici:** Harici bir programa ihtiyaç duymadan aktif profilin `options.txt`, `optionsof.txt` ve `config/` altındaki (`.json`, `.toml`, `.properties`, `.cfg`, `.yml`, `.yaml`, `.txt`, `.ini`) ayar dosyalarını launcher içinden düzenleyip kaydetme.
- **🔐 Microsoft (Xbox Live) & Çevrimdışı Hesap Desteği:** Resmi Microsoft hesabınla orijinal sunuculara gir veya çevrimdışı (offline) modda istediğin kullanıcı adıyla oyna.
- **🔍 Akıllı Çökme (Crash) Analizcisi & `mclo.gs` Log Paylaşımı:** Oyun çöktüğünde logları ve `crash-reports` klasörünü tarayarak eksik modları, Java uyumsuzluğunu veya RAM yetersizliğini Türkçe açıklar; eksik kütüphaneyi Modrinth'te aratır ve erişim anahtarları otomatik gizlenmiş (`[GİZLENDİ]`) logları tek tıkla `mclo.gs` üzerinden paylaşır.
- **⚡ JVM Hazır Optimizasyon Ayarları:** Tek tıkla *Aikar's Flags (G1GC)* ve *Düşük Sistem* JVM argüman profilleri.
- **💬 Discord Rich Presence & Sistem Tepsisi (System Tray):** Oyun sırasında sağ alt tepsiye küçülme ve Discord profilinde oynadığın sürümü ve mod sayısını canlı gösterme desteği *(Discord Application ID yapılandırıldığında aktif olur)*.
- **🎨 5 Renk Teması & 3 Arayüz Düzeni:** *Aurora*, *Zümrüt*, *Nether*, *Cyberpunk*, *Buzul* temaları ve *Modern*, *Sinematik Alt Bar*, *Minimalist* yerleşim düzenleri.
- **☕ Akıllı Java & Ana Sürüm Denetimi:** Seçilen sürümün ihtiyaç duyduğu resmi Mojang Java sürümünü ve ana Vanilla dosyalarını otomatik denetler ve indirir.
- **🔒 Güvenlik & Sessiz Otomatik Güncelleme:** Windows DPAPI (`safeStorage`) ile şifrelenmiş oturum saklama, SHA-512 imza doğrulamalı ve kurulum sihirbazı açmadan arka planda sessizce kendi kendini güncelleyen resmi GitHub güncelleyicisi.

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

Kurulum dosyası (`Lumora-Launcher-Setup-1.2.1.exe` ve `latest.yml`) `dist/` klasörüne oluşturulur.

Beta sürümü için:

```powershell
# Bağımlılıkları yükle
npm.cmd install

# Geliştirici modunda başlat
npm.cmd start

# Windows kurulum paketi (.exe) oluştur
npm.cmd run dist:beta
```

Kurulum dosyası (`Lumora-Launcher-Setup-1.2.1-beta.exe` ve `latest.yml`) `dist/` klasörüne oluşturulur.(Beta için)


## ⚖️ Yasal Uyarı & Bağımsızlık Beyanı (Disclaimer)

> **NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

- **Lumora Launcher**, tamamen özgün olarak geliştirilmiş, bağımsız ve topluluk odaklı, açık kaynaklı bir yazılımdır.
- **Microsoft Corporation** veya **Mojang Studios** ile hiçbir resmi anlaşması, ortaklığı, sponsorluğu veya bağlantısı bulunmamaktadır.
- "Minecraft" adı, markası ve oyun varlıkları Microsoft Corporation / Mojang Studios'a aittir.
- Orijinal Microsoft hesabı ile giriş özelliği yalnızca kullanıcının kendi resmi Microsoft/Xbox Live OAuth2 oturumu üzerinden doğrudan Microsoft ve Minecraft sunucularıyla iletişim kurar; hiçbir üçüncü taraf sunucuya şifre veya hesap verisi gönderilmez ve yerel oturum anahtarları Windows DPAPI şifrelemesi ile korunur.

## 📄 Lisans

Bu proje **MIT Lisansı** ([LICENSE](LICENSE)) altında tamamen açık kaynak olarak sunulmaktadır.
