// ============================================================
//  Lumora Launcher - Çoklu Dil Sistemi (i18n)
//  Desteklenen Diller: TR, EN, DE, ES, RU, FR, PT
// ============================================================
(function () {
  const TRANSLATIONS = {
    tr: {
      // Menü & Genel
      nav_home: 'Oyna',
      nav_instances: 'Profiller',
      nav_modrinth: 'Modrinth',
      nav_servers: 'Sunucular',
      nav_appearance: 'Görünüm',
      nav_settings: 'Ayarlar',
      nav_updates: 'Güncelle',
      nav_console: 'Konsol',
      nav_folder: 'Klasör',

      // Ana Sayfa
      hero_title_html: 'Maceraya <span class="gradient-text">hazır mısın?</span>',
      hero_sub: 'İzole profilini seç, Modrinth\'ten modlarını ekle ve tek tıkla oyuna gir.',
      beta_hero: '🧪 BETA ÖNİZLEME SÜRÜMÜ',
      acc_label: 'Oyuncu Hesabı',
      auth_offline: 'Çevrimdışı',
      auth_ms: '🟢 Microsoft (Orijinal)',
      inst_label: 'Aktif Profil (Instance)',
      manage_inst: 'Profilleri Yönet →',
      play_btn: 'OYNA',
      stat_loader: 'Yükleyici',
      stat_mods: 'Kurulu İçerik',
      stat_ram: 'RAM & Java',
      stat_theme: 'Tema',
      pill_offline: 'ÇEVRİMDIŞI',
      pill_original: '✓ ORİJİNAL',
      greetings: ['İyi geceler', 'Günaydın', 'İyi günler', 'İyi akşamlar'],
      greeting_anon: 'Hoş geldin!',
      theme_names: { aurora: 'Aurora', emerald: 'Zümrüt', nether: 'Nether', cyber: 'Cyberpunk', frost: 'Buzul' },

      // Profiller
      inst_page_title: 'İzole Profiller (Instances)',
      inst_page_sub: 'Her profil kendi bağımsız <code>mods</code>, <code>saves</code>, <code>shaderpacks</code> ve <code>config</code> klasörüne sahiptir.',
      btn_import_wizard: '📥 Başka Launcher\'dan Aktar',
      btn_import_mrpack: '📦 .mrpack İçe Aktar',
      btn_new_inst: '+ YENİ PROFİL OLUŞTUR',
      tab_mod: '🧩 Modlar',
      tab_shader: '✨ Shader',
      tab_resourcepack: '🎨 Kaynak Paketleri',
      tab_worlds: '🌍 Dünyalar & Yedekler',
      tab_screenshots: '📸 Ekran Görüntüleri',
      tab_configs: '⚙️ Config & Ayarlar',
      btn_dup_inst: '📋 Profili Çoğalt',
      btn_fps_pack: '⚡ Tek Tıkla FPS Paketi Kur',
      btn_check_mods: '🔄 Mod Güncellemelerini Denetle',
      btn_export_mrpack: '📤 .mrpack Dışa Aktar',
      btn_open_mr: '+ Modrinth\'ten Ekle',
      btn_open_folder: 'Klasörü Aç',

      // Modrinth
      mr_page_title: 'Modrinth İçerik Mağazası',
      mr_page_sub: 'Tarayıcıya gerek kalmadan doğrudan aktif profiline mod, shader veya kaynak paketi indir.',
      mr_target: 'Hedef Profil:',
      mr_tab_mod: '🧩 Modlar',
      mr_tab_modpack: '📦 Modpack (.mrpack)',
      mr_tab_shader: '✨ Shader',
      mr_tab_rp: '🎨 Kaynak Paketi',
      mr_search_ph: 'Mod, shader veya kaynak paketi ara (örn: Sodium, Iris, Complementary, Fresh Animations)...',
      mr_search_btn: 'ARA',

      // Sunucular
      srv_page_title: 'Sunucu Listesi & Hızlı Bağlan',
      srv_page_sub: 'Favori sunucularının canlı ping ve oyuncu sayısını gör, tek tıkla doğrudan sunucuya bağlan.',
      srv_refresh: '🔄 Tümünü Yenile',
      srv_name_label: 'Sunucu Adı',
      srv_name_ph: 'Örn: Favori Survival Sunucum',
      srv_addr_label: 'Sunucu Adresi (IP / Domain)',
      srv_addr_ph: 'Örn: mc.hypixel.net veya 127.0.0.1:25565',
      srv_add_btn: '+ SUNUCU EKLE',

      // Görünüm
      app_page_title: 'Görünüm ve Arayüz Tasarımı',
      app_themes_title: 'Renk Temaları',
      app_themes_sub: 'Launcher\'ın atmosferini ve ışıklandırmasını anında değiştir',
      app_layouts_title: 'Arayüz Düzeni (Layout)',
      app_layouts_sub: 'Ana sayfanın ve menülerin yerleşim tarzını seç',
      app_anim_title: 'Animasyonlar',
      app_splash_title: 'Açılış Animasyonu',
      app_replay_splash: 'Şimdi Önizle',

      // Ayarlar
      set_page_title: 'Oyun & Sistem Ayarları',
      set_ram: 'Bellek (RAM)',
      set_java: 'Java',
      set_scan_java: 'Yeniden tara',
      set_pick_java: 'Gözat... (javaw.exe seç)',
      set_screen: 'Ekran',
      set_fullscreen: 'Tam ekran',
      set_width: 'Genişlik',
      set_height: 'Yükseklik',
      set_launcher: 'Launcher & Entegrasyonlar',
      set_advanced: 'Gelişmiş',
      set_saved: '✓ Kaydedildi',

      // Güncellemeler & Konsol & Skin Stüdyosu
      upd_page_title: 'Güncellemeler & Açık Kaynak',
      upd_check_btn: 'GÜNCELLEMELERİ DENETLE',
      con_page_title: 'Konsol & Akıllı Çökme Analizi',
      con_analyze: '🔍 Akıllı Çökme & Log Analizi',
      con_share: '🔗 Logu Paylaş (mclo.gs)',
      con_clear: 'Temizle',
      skin_studio_badge: '👕 Skin & Karakter Stüdyosu',
      skin_studio_title: 'Dahili 3B Görünüm & Alex/Steve Skin Yönetimi',
      skin_use_name: '✓ Bu İsmi Kullan',
      skin_dl_png: '⬇ Skin (.png) İndir'
    },

    en: {
      nav_home: 'Play',
      nav_instances: 'Profiles',
      nav_modrinth: 'Modrinth',
      nav_servers: 'Servers',
      nav_appearance: 'Themes',
      nav_settings: 'Settings',
      nav_updates: 'Updates',
      nav_console: 'Console',
      nav_folder: 'Folder',

      hero_title_html: 'Ready for <span class="gradient-text">adventure?</span>',
      hero_sub: 'Pick an isolated instance, install mods directly from Modrinth, and launch in one click.',
      beta_hero: '🧪 BETA PREVIEW BUILD',
      acc_label: 'Player Account',
      auth_offline: 'Offline',
      auth_ms: '🟢 Microsoft (Premium)',
      inst_label: 'Active Profile (Instance)',
      manage_inst: 'Manage Profiles →',
      play_btn: 'PLAY',
      stat_loader: 'Loader',
      stat_mods: 'Installed Content',
      stat_ram: 'RAM & Java',
      stat_theme: 'Theme',
      pill_offline: 'OFFLINE',
      pill_original: '✓ PREMIUM',
      greetings: ['Good night', 'Good morning', 'Good afternoon', 'Good evening'],
      greeting_anon: 'Welcome back!',
      theme_names: { aurora: 'Aurora', emerald: 'Emerald', nether: 'Nether', cyber: 'Cyberpunk', frost: 'Frost' },

      inst_page_title: 'Isolated Profiles (Instances)',
      inst_page_sub: 'Every profile keeps its own separate <code>mods</code>, <code>saves</code>, <code>shaderpacks</code>, and <code>config</code> folders.',
      btn_import_wizard: '📥 Import from Launcher',
      btn_import_mrpack: '📦 Import .mrpack',
      btn_new_inst: '+ CREATE NEW PROFILE',
      tab_mod: '🧩 Mods',
      tab_shader: '✨ Shaders',
      tab_resourcepack: '🎨 Resource Packs',
      tab_worlds: '🌍 Worlds & Backups',
      tab_screenshots: '📸 Screenshots',
      tab_configs: '⚙️ Configs & Options',
      btn_dup_inst: '📋 Duplicate Profile',
      btn_fps_pack: '⚡ 1-Click FPS Pack',
      btn_check_mods: '🔄 Check Mod Updates',
      btn_export_mrpack: '📤 Export .mrpack',
      btn_open_mr: '+ Add from Modrinth',
      btn_open_folder: 'Open Folder',

      mr_page_title: 'Modrinth Content Store',
      mr_page_sub: 'Download mods, modpacks, shaders, and resource packs straight into your active profile.',
      mr_target: 'Target Profile:',
      mr_tab_mod: '🧩 Mods',
      mr_tab_modpack: '📦 Modpacks (.mrpack)',
      mr_tab_shader: '✨ Shaders',
      mr_tab_rp: '🎨 Resource Packs',
      mr_search_ph: 'Search mods, shaders or resource packs (e.g. Sodium, Iris, Complementary)...',
      mr_search_btn: 'SEARCH',

      srv_page_title: 'Server List & Quick Join',
      srv_page_sub: 'Monitor live player count and latency, and connect directly with one click.',
      srv_refresh: '🔄 Refresh All',
      srv_name_label: 'Server Name',
      srv_name_ph: 'e.g. Favorite Survival Server',
      srv_addr_label: 'Server Address (IP / Domain)',
      srv_addr_ph: 'e.g. mc.hypixel.net or 127.0.0.1:25565',
      srv_add_btn: '+ ADD SERVER',

      app_page_title: 'Appearance & UI Design',
      app_themes_title: 'Color Themes',
      app_themes_sub: 'Switch launcher atmosphere and glow palette instantly',
      app_layouts_title: 'Interface Layout',
      app_layouts_sub: 'Choose how the home page and navigation bar are arranged',
      app_anim_title: 'Animations',
      app_splash_title: 'Startup Intro',
      app_replay_splash: 'Preview Now',

      set_page_title: 'Game & System Settings',
      set_ram: 'Memory (RAM)',
      set_java: 'Java Runtime',
      set_scan_java: 'Rescan',
      set_pick_java: 'Browse... (select javaw.exe)',
      set_screen: 'Display',
      set_fullscreen: 'Fullscreen',
      set_width: 'Width',
      set_height: 'Height',
      set_launcher: 'Launcher & Integrations',
      set_advanced: 'Advanced',
      set_saved: '✓ Saved',

      upd_page_title: 'Updates & Open Source',
      upd_check_btn: 'CHECK FOR UPDATES',
      con_page_title: 'Console & Smart Crash Analyzer',
      con_analyze: '🔍 Smart Crash & Log Analysis',
      con_share: '🔗 Share Log (mclo.gs)',
      con_clear: 'Clear',
      skin_studio_badge: '👕 Skin & Character Studio',
      skin_studio_title: 'Built-in 3D Viewer & Alex/Steve Skin Manager',
      skin_use_name: '✓ Use This Username',
      skin_dl_png: '⬇ Download Skin (.png)'
    },

    de: {
      nav_home: 'Spielen',
      nav_instances: 'Profile',
      nav_modrinth: 'Modrinth',
      nav_servers: 'Server',
      nav_appearance: 'Design',
      nav_settings: 'Einstell.',
      nav_updates: 'Updates',
      nav_console: 'Konsole',
      nav_folder: 'Ordner',

      hero_title_html: 'Bereit für das <span class="gradient-text">Abenteuer?</span>',
      hero_sub: 'Wähle ein isoliertes Profil, installiere Mods über Modrinth und starte mit einem Klick.',
      beta_hero: '🧪 BETA-VORSCHAUVERSION',
      acc_label: 'Spielerkonto',
      auth_offline: 'Offline',
      auth_ms: '🟢 Microsoft (Original)',
      inst_label: 'Aktives Profil (Instanz)',
      manage_inst: 'Profile verwalten →',
      play_btn: 'SPIELEN',
      stat_loader: 'Mod-Loader',
      stat_mods: 'Installiert',
      stat_ram: 'RAM & Java',
      stat_theme: 'Design',
      pill_offline: 'OFFLINE',
      pill_original: '✓ PREMIUM',
      greetings: ['Gute Nacht', 'Guten Morgen', 'Guten Tag', 'Guten Abend'],
      greeting_anon: 'Willkommen zurück!',
      theme_names: { aurora: 'Aurora', emerald: 'Smaragd', nether: 'Nether', cyber: 'Cyberpunk', frost: 'Frost' },

      inst_page_title: 'Isolierte Profile (Instanzen)',
      inst_page_sub: 'Jedes Profil besitzt eigene <code>mods</code>-, <code>saves</code>-, <code>shaderpacks</code>- und <code>config</code>-Ordner.',
      btn_import_wizard: '📥 Aus Launcher importieren',
      btn_import_mrpack: '📦 .mrpack importieren',
      btn_new_inst: '+ NEUES PROFIL',
      tab_mod: '🧩 Mods',
      tab_shader: '✨ Shader',
      tab_resourcepack: '🎨 Ressourcenpakete',
      tab_worlds: '🌍 Welten & Backups',
      tab_screenshots: '📸 Screenshots',
      tab_configs: '⚙️ Config & Optionen',
      btn_dup_inst: '📋 Duplizieren',
      btn_fps_pack: '⚡ 1-Klick FPS-Paket',
      btn_check_mods: '🔄 Mod-Updates prüfen',
      btn_export_mrpack: '📤 .mrpack exportieren',
      btn_open_mr: '+ Von Modrinth',
      btn_open_folder: 'Ordner öffnen',

      mr_page_title: 'Modrinth Store',
      mr_page_sub: 'Lade Mods, Modpacks, Shader und Ressourcenpakete direkt in dein Profil.',
      mr_target: 'Zielprofil:',
      mr_tab_mod: '🧩 Mods',
      mr_tab_modpack: '📦 Modpacks (.mrpack)',
      mr_tab_shader: '✨ Shader',
      mr_tab_rp: '🎨 Ressourcenpakete',
      mr_search_ph: 'Mods, Shader oder Pakete suchen...',
      mr_search_btn: 'SUCHEN',

      srv_page_title: 'Serverliste & Schnellbeitritt',
      srv_page_sub: 'Live-Ping und Spielerzahlen prüfen, mit einem Klick direkt verbinden.',
      srv_refresh: '🔄 Alle aktualisieren',
      srv_name_label: 'Servername',
      srv_name_ph: 'z.B. Mein Survival-Server',
      srv_addr_label: 'Serveradresse (IP / Domain)',
      srv_addr_ph: 'z.B. mc.hypixel.net',
      srv_add_btn: '+ HINZUFÜGEN',

      app_page_title: 'Erscheinungsbild & Design',
      app_themes_title: 'Farbthemen',
      app_themes_sub: 'Passe Atmosphäre und Farben des Launchers sofort an',
      app_layouts_title: 'Layout-Stil',
      app_layouts_sub: 'Wähle die Anordnung von Startseite und Navigation',
      app_anim_title: 'Animationen',
      app_splash_title: 'Startanimation',
      app_replay_splash: 'Vorschau',

      set_page_title: 'Spiel- & Systemeinstellungen',
      set_ram: 'Arbeitsspeicher (RAM)',
      set_java: 'Java-Laufzeit',
      set_scan_java: 'Neu scannen',
      set_pick_java: 'Durchsuchen... (javaw.exe)',
      set_screen: 'Bildschirm',
      set_fullscreen: 'Vollbild',
      set_width: 'Breite',
      set_height: 'Höhe',
      set_launcher: 'Launcher & Integrationen',
      set_advanced: 'Erweitert',
      set_saved: '✓ Gespeichert',

      upd_page_title: 'Updates & Open Source',
      upd_check_btn: 'NACH UPDATES SUCHEN',
      con_page_title: 'Konsole & Absturzanalyse',
      con_analyze: '🔍 Absturz & Log analysieren',
      con_share: '🔗 Log teilen (mclo.gs)',
      con_clear: 'Leeren',
      skin_studio_badge: '👕 Skin- & Charakterstudio',
      skin_studio_title: '3D-Vorschau & Alex/Steve Skin-Verwaltung',
      skin_use_name: '✓ Namen verwenden',
      skin_dl_png: '⬇ Skin (.png) laden'
    },

    es: {
      nav_home: 'Jugar',
      nav_instances: 'Perfiles',
      nav_modrinth: 'Modrinth',
      nav_servers: 'Servidores',
      nav_appearance: 'Aspecto',
      nav_settings: 'Ajustes',
      nav_updates: 'Actualizar',
      nav_console: 'Consola',
      nav_folder: 'Carpeta',

      hero_title_html: '¿Listo para la <span class="gradient-text">aventura?</span>',
      hero_sub: 'Elige un perfil aislado, instala mods desde Modrinth y juega en un clic.',
      beta_hero: '🧪 VERSIÓN BETA PREVIEW',
      acc_label: 'Cuenta de Jugador',
      auth_offline: 'Sin conexión',
      auth_ms: '🟢 Microsoft (Original)',
      inst_label: 'Perfil Activo (Instancia)',
      manage_inst: 'Gestionar Perfiles →',
      play_btn: 'JUGAR',
      stat_loader: 'Cargador',
      stat_mods: 'Contenido',
      stat_ram: 'RAM y Java',
      stat_theme: 'Tema',
      pill_offline: 'OFFLINE',
      pill_original: '✓ PREMIUM',
      greetings: ['Buenas noches', 'Buenos días', 'Buenas tardes', 'Buenas noches'],
      greeting_anon: '¡Bienvenido de nuevo!',
      theme_names: { aurora: 'Aurora', emerald: 'Esmeralda', nether: 'Nether', cyber: 'Cyberpunk', frost: 'Escarcha' },

      inst_page_title: 'Perfiles Aislados (Instancias)',
      inst_page_sub: 'Cada perfil mantiene sus propias carpetas <code>mods</code>, <code>saves</code>, <code>shaderpacks</code> y <code>config</code>.',
      btn_import_wizard: '📥 Importar de Launcher',
      btn_import_mrpack: '📦 Importar .mrpack',
      btn_new_inst: '+ CREAR PERFIL',
      tab_mod: '🧩 Mods',
      tab_shader: '✨ Shaders',
      tab_resourcepack: '🎨 Paquetes de Recursos',
      tab_worlds: '🌍 Mundos y Copias',
      tab_screenshots: '📸 Capturas',
      tab_configs: '⚙️ Config y Opciones',
      btn_dup_inst: '📋 Duplicar Perfil',
      btn_fps_pack: '⚡ Pack FPS (1 clic)',
      btn_check_mods: '🔄 Buscar Actualizaciones',
      btn_export_mrpack: '📤 Exportar .mrpack',
      btn_open_mr: '+ Añadir de Modrinth',
      btn_open_folder: 'Abrir Carpeta',

      mr_page_title: 'Tienda Modrinth',
      mr_page_sub: 'Descarga mods, modpacks, shaders y paquetes directamente en tu perfil.',
      mr_target: 'Perfil destino:',
      mr_tab_mod: '🧩 Mods',
      mr_tab_modpack: '📦 Modpacks (.mrpack)',
      mr_tab_shader: '✨ Shaders',
      mr_tab_rp: '🎨 Texturas',
      mr_search_ph: 'Buscar mods, shaders o texturas (ej. Sodium, Iris)...',
      mr_search_btn: 'BUSCAR',

      srv_page_title: 'Servidores y Conexión Rápida',
      srv_page_sub: 'Ve el ping en vivo y jugadores conectados, y entra en un clic.',
      srv_refresh: '🔄 Actualizar Todo',
      srv_name_label: 'Nombre del Servidor',
      srv_name_ph: 'Ej. Mi Servidor Survival',
      srv_addr_label: 'Dirección (IP / Dominio)',
      srv_addr_ph: 'Ej. mc.hypixel.net',
      srv_add_btn: '+ AÑADIR SERVIDOR',

      app_page_title: 'Apariencia e Interfaz',
      app_themes_title: 'Temas de Color',
      app_themes_sub: 'Cambia la iluminación y colores del launcher al instante',
      app_layouts_title: 'Diseño (Layout)',
      app_layouts_sub: 'Elige la distribución de la pantalla principal',
      app_anim_title: 'Animaciones',
      app_splash_title: 'Animación de Inicio',
      app_replay_splash: 'Vista Previa',

      set_page_title: 'Ajustes del Juego y Sistema',
      set_ram: 'Memoria (RAM)',
      set_java: 'Java',
      set_scan_java: 'Reescanear',
      set_pick_java: 'Examinar... (javaw.exe)',
      set_screen: 'Pantalla',
      set_fullscreen: 'Pantalla completa',
      set_width: 'Ancho',
      set_height: 'Alto',
      set_launcher: 'Launcher e Integraciones',
      set_advanced: 'Avanzado',
      set_saved: '✓ Guardado',

      upd_page_title: 'Actualizaciones y Código Abierto',
      upd_check_btn: 'BUSCAR ACTUALIZACIONES',
      con_page_title: 'Consola y Analizador de Fallos',
      con_analyze: '🔍 Analizar Fallos y Logs',
      con_share: '🔗 Compartir Log (mclo.gs)',
      con_clear: 'Limpiar',
      skin_studio_badge: '👕 Estudio de Skin 3D',
      skin_studio_title: 'Vista 3D Integrada y Gestor Alex/Steve',
      skin_use_name: '✓ Usar Este Nombre',
      skin_dl_png: '⬇ Descargar Skin (.png)'
    },

    ru: {
      nav_home: 'Играть',
      nav_instances: 'Профили',
      nav_modrinth: 'Modrinth',
      nav_servers: 'Серверы',
      nav_appearance: 'Вид',
      nav_settings: 'Настр.',
      nav_updates: 'Обновл.',
      nav_console: 'Консоль',
      nav_folder: 'Папка',

      hero_title_html: 'Готовы к <span class="gradient-text">приключениям?</span>',
      hero_sub: 'Выберите изолированный профиль, установите моды с Modrinth и запускайте в один клик.',
      beta_hero: '🧪 БЕТА-ВЕРСИЯ (PREVIEW)',
      acc_label: 'Аккаунт игрока',
      auth_offline: 'Офлайн',
      auth_ms: '🟢 Microsoft (Лицензия)',
      inst_label: 'Активный профиль',
      manage_inst: 'Управление профилями →',
      play_btn: 'ИГРАТЬ',
      stat_loader: 'Загрузчик',
      stat_mods: 'Контент',
      stat_ram: 'ОЗУ и Java',
      stat_theme: 'Тема',
      pill_offline: 'ОФЛАЙН',
      pill_original: '✓ ЛИЦЕНЗИЯ',
      greetings: ['Доброй ночи', 'Доброе утро', 'Добрый день', 'Добрый вечер'],
      greeting_anon: 'С возвращением!',
      theme_names: { aurora: 'Аврора', emerald: 'Изумруд', nether: 'Незер', cyber: 'Киберпанк', frost: 'Лёд' },

      inst_page_title: 'Изолированные профили',
      inst_page_sub: 'У каждого профиля свои папки <code>mods</code>, <code>saves</code>, <code>shaderpacks</code> и <code>config</code>.',
      btn_import_wizard: '📥 Импорт из лаунчера',
      btn_import_mrpack: '📦 Импорт .mrpack',
      btn_new_inst: '+ СОЗДАТЬ ПРОФИЛЬ',
      tab_mod: '🧩 Моды',
      tab_shader: '✨ Шейдеры',
      tab_resourcepack: '🎨 Ресурспаки',
      tab_worlds: '🌍 Миры и бэкапы',
      tab_screenshots: '📸 Скриншоты',
      tab_configs: '⚙️ Конфиги',
      btn_dup_inst: '📋 Дублировать',
      btn_fps_pack: '⚡ FPS-пакет (1 клик)',
      btn_check_mods: '🔄 Обновить моды',
      btn_export_mrpack: '📤 Экспорт .mrpack',
      btn_open_mr: '+ Из Modrinth',
      btn_open_folder: 'Открыть папку',

      mr_page_title: 'Каталог Modrinth',
      mr_page_sub: 'Устанавливайте моды, сборки, шейдеры и ресурспаки напрямую в профиль.',
      mr_target: 'Профиль:',
      mr_tab_mod: '🧩 Моды',
      mr_tab_modpack: '📦 Сборки (.mrpack)',
      mr_tab_shader: '✨ Шейдеры',
      mr_tab_rp: '🎨 Ресурспаки',
      mr_search_ph: 'Поиск модов, шейдеров или текстур (напр. Sodium, Iris)...',
      mr_search_btn: 'ПОИСК',

      srv_page_title: 'Список серверов и быстрый вход',
      srv_page_sub: 'Живой пинг, онлайн игроков и подключение к серверу в один клик.',
      srv_refresh: '🔄 Обновить все',
      srv_name_label: 'Название сервера',
      srv_name_ph: 'Напр.: Любимый сервер',
      srv_addr_label: 'Адрес (IP / Домен)',
      srv_addr_ph: 'Напр.: mc.hypixel.net',
      srv_add_btn: '+ ДОБАВИТЬ',

      app_page_title: 'Внешний вид и темы',
      app_themes_title: 'Цветовые темы',
      app_themes_sub: 'Мгновенно меняйте атмосферу и подсветку лаунчера',
      app_layouts_title: 'Макет интерфейса',
      app_layouts_sub: 'Выберите расположение главного экрана и меню',
      app_anim_title: 'Анимации',
      app_splash_title: 'Заставка запуска',
      app_replay_splash: 'Предпросмотр',

      set_page_title: 'Настройки игры и системы',
      set_ram: 'Память (ОЗУ)',
      set_java: 'Java',
      set_scan_java: 'Найти снова',
      set_pick_java: 'Обзор... (javaw.exe)',
      set_screen: 'Экран',
      set_fullscreen: 'На весь экран',
      set_width: 'Ширина',
      set_height: 'Высота',
      set_launcher: 'Лаунчер и интеграции',
      set_advanced: 'Дополнительно',
      set_saved: '✓ Сохранено',

      upd_page_title: 'Обновления и Open Source',
      upd_check_btn: 'ПРОВЕРИТЬ ОБНОВЛЕНИЯ',
      con_page_title: 'Консоль и анализ сбоев',
      con_analyze: '🔍 Анализ сбоя и логов',
      con_share: '🔗 Поделиться логом (mclo.gs)',
      con_clear: 'Очистить',
      skin_studio_badge: '👕 3D Студия скинов',
      skin_studio_title: 'Встроенный 3D-просмотр и скины Alex/Steve',
      skin_use_name: '✓ Использовать ник',
      skin_dl_png: '⬇ Скачать скин (.png)'
    },

    fr: {
      nav_home: 'Jouer',
      nav_instances: 'Profils',
      nav_modrinth: 'Modrinth',
      nav_servers: 'Serveurs',
      nav_appearance: 'Apparence',
      nav_settings: 'Réglages',
      nav_updates: 'Mises à jour',
      nav_console: 'Console',
      nav_folder: 'Dossier',

      hero_title_html: 'Prêt pour <span class="gradient-text">l\'aventure ?</span>',
      hero_sub: 'Choisissez un profil isolé, ajoutez des mods via Modrinth et jouez en un clic.',
      beta_hero: '🧪 VERSION BÊTA PREVIEW',
      acc_label: 'Compte Joueur',
      auth_offline: 'Hors-ligne',
      auth_ms: '🟢 Microsoft (Officiel)',
      inst_label: 'Profil Actif (Instance)',
      manage_inst: 'Gérer les Profils →',
      play_btn: 'JOUER',
      stat_loader: 'Chargeur',
      stat_mods: 'Contenu',
      stat_ram: 'RAM & Java',
      stat_theme: 'Thème',
      pill_offline: 'HORS-LIGNE',
      pill_original: '✓ OFFICIEL',
      greetings: ['Bonne nuit', 'Bonjour', 'Bon après-midi', 'Bonsoir'],
      greeting_anon: 'Bon retour !',
      theme_names: { aurora: 'Aurore', emerald: 'Émeraude', nether: 'Nether', cyber: 'Cyberpunk', frost: 'Givre' },

      inst_page_title: 'Profils Isolés (Instances)',
      inst_page_sub: 'Chaque profil possède ses propres dossiers <code>mods</code>, <code>saves</code>, <code>shaderpacks</code> et <code>config</code>.',
      btn_import_wizard: '📥 Importer d\'un Launcher',
      btn_import_mrpack: '📦 Importer .mrpack',
      btn_new_inst: '+ NOUVEAU PROFIL',
      tab_mod: '🧩 Mods',
      tab_shader: '✨ Shaders',
      tab_resourcepack: '🎨 Packs de Ressources',
      tab_worlds: '🌍 Mondes & Sauvegardes',
      tab_screenshots: '📸 Captures',
      tab_configs: '⚙️ Config & Options',
      btn_dup_inst: '📋 Dupliquer',
      btn_fps_pack: '⚡ Pack FPS (1 clic)',
      btn_check_mods: '🔄 MàJ des Mods',
      btn_export_mrpack: '📤 Exporter .mrpack',
      btn_open_mr: '+ Ajouter Modrinth',
      btn_open_folder: 'Ouvrir Dossier',

      mr_page_title: 'Boutique Modrinth',
      mr_page_sub: 'Téléchargez mods, modpacks, shaders et packs directement dans votre profil.',
      mr_target: 'Profil cible :',
      mr_tab_mod: '🧩 Mods',
      mr_tab_modpack: '📦 Modpacks (.mrpack)',
      mr_tab_shader: '✨ Shaders',
      mr_tab_rp: '🎨 Packs de Ressources',
      mr_search_ph: 'Rechercher un mod, shader ou pack...',
      mr_search_btn: 'CHERCHER',

      srv_page_title: 'Serveurs & Connexion Rapide',
      srv_page_sub: 'Affichez le ping en direct et rejoignez le serveur en un clic.',
      srv_refresh: '🔄 Tout actualiser',
      srv_name_label: 'Nom du Serveur',
      srv_name_ph: 'Ex : Mon Serveur Survie',
      srv_addr_label: 'Adresse (IP / Domaine)',
      srv_addr_ph: 'Ex : mc.hypixel.net',
      srv_add_btn: '+ AJOUTER',

      app_page_title: 'Apparence & Design',
      app_themes_title: 'Thèmes de Couleurs',
      app_themes_sub: 'Changez instantanément les couleurs du launcher',
      app_layouts_title: 'Disposition (Layout)',
      app_layouts_sub: 'Choisissez la mise en page de l\'accueil',
      app_anim_title: 'Animations',
      app_splash_title: 'Animation d\'ouverture',
      app_replay_splash: 'Aperçu',

      set_page_title: 'Paramètres Jeu & Système',
      set_ram: 'Mémoire (RAM)',
      set_java: 'Java',
      set_scan_java: 'Rescanner',
      set_pick_java: 'Parcourir... (javaw.exe)',
      set_screen: 'Écran',
      set_fullscreen: 'Plein écran',
      set_width: 'Largeur',
      set_height: 'Hauteur',
      set_launcher: 'Launcher & Intégrations',
      set_advanced: 'Avancé',
      set_saved: '✓ Enregistré',

      upd_page_title: 'Mises à jour & Open Source',
      upd_check_btn: 'VÉRIFIER LES MISES À JOUR',
      con_page_title: 'Console & Analyseur de Crash',
      con_analyze: '🔍 Analyser Crash & Logs',
      con_share: '🔗 Partager Log (mclo.gs)',
      con_clear: 'Effacer',
      skin_studio_badge: '👕 Studio Skin 3D',
      skin_studio_title: 'Aperçu 3D & Gestionnaire Alex/Steve',
      skin_use_name: '✓ Utiliser ce Pseudo',
      skin_dl_png: '⬇ Télécharger (.png)'
    },

    pt: {
      nav_home: 'Jogar',
      nav_instances: 'Perfis',
      nav_modrinth: 'Modrinth',
      nav_servers: 'Servidores',
      nav_appearance: 'Visual',
      nav_settings: 'Ajustes',
      nav_updates: 'Atualizar',
      nav_console: 'Console',
      nav_folder: 'Pasta',

      hero_title_html: 'Pronto para a <span class="gradient-text">aventura?</span>',
      hero_sub: 'Escolha um perfil isolado, instale mods pelo Modrinth e jogue com um clique.',
      beta_hero: '🧪 VERSÃO BETA PREVIEW',
      acc_label: 'Conta do Jogador',
      auth_offline: 'Offline',
      auth_ms: '🟢 Microsoft (Original)',
      inst_label: 'Perfil Ativo (Instância)',
      manage_inst: 'Gerenciar Perfis →',
      play_btn: 'JOGAR',
      stat_loader: 'Carregador',
      stat_mods: 'Conteúdo',
      stat_ram: 'RAM & Java',
      stat_theme: 'Tema',
      pill_offline: 'OFFLINE',
      pill_original: '✓ ORIGINAL',
      greetings: ['Boa noite', 'Bom dia', 'Boa tarde', 'Boa noite'],
      greeting_anon: 'Bem-vindo!',
      theme_names: { aurora: 'Aurora', emerald: 'Esmeralda', nether: 'Nether', cyber: 'Cyberpunk', frost: 'Gelo' },

      inst_page_title: 'Perfis Isolados (Instâncias)',
      inst_page_sub: 'Cada perfil possui pastas separadas de <code>mods</code>, <code>saves</code>, <code>shaderpacks</code> e <code>config</code>.',
      btn_import_wizard: '📥 Importar de Launcher',
      btn_import_mrpack: '📦 Importar .mrpack',
      btn_new_inst: '+ CRIAR PERFIL',
      tab_mod: '🧩 Mods',
      tab_shader: '✨ Shaders',
      tab_resourcepack: '🎨 Texturas',
      tab_worlds: '🌍 Mundos & Backups',
      tab_screenshots: '📸 Capturas',
      tab_configs: '⚙️ Config & Opções',
      btn_dup_inst: '📋 Duplicar Perfil',
      btn_fps_pack: '⚡ Pacote FPS (1 clique)',
      btn_check_mods: '🔄 Atualizar Mods',
      btn_export_mrpack: '📤 Exportar .mrpack',
      btn_open_mr: '+ Modrinth',
      btn_open_folder: 'Abrir Pasta',

      mr_page_title: 'Loja Modrinth',
      mr_page_sub: 'Baixe mods, modpacks, shaders e texturas direto para o perfil ativo.',
      mr_target: 'Perfil alvo:',
      mr_tab_mod: '🧩 Mods',
      mr_tab_modpack: '📦 Modpacks (.mrpack)',
      mr_tab_shader: '✨ Shaders',
      mr_tab_rp: '🎨 Texturas',
      mr_search_ph: 'Buscar mods, shaders ou texturas (ex: Sodium, Iris)...',
      mr_search_btn: 'BUSCAR',

      srv_page_title: 'Lista de Servidores & Entrada Rápida',
      srv_page_sub: 'Veja o ping ao vivo e jogadores online e conecte com um clique.',
      srv_refresh: '🔄 Atualizar Tudo',
      srv_name_label: 'Nome do Servidor',
      srv_name_ph: 'Ex: Meu Servidor Survival',
      srv_addr_label: 'Endereço (IP / Domínio)',
      srv_addr_ph: 'Ex: mc.hypixel.net',
      srv_add_btn: '+ ADICIONAR',

      app_page_title: 'Aparência & Interface',
      app_themes_title: 'Temas de Cores',
      app_themes_sub: 'Altere o visual e o brilho do launcher na hora',
      app_layouts_title: 'Layout da Interface',
      app_layouts_sub: 'Escolha a organização dos menus e cartões',
      app_anim_title: 'Animações',
      app_splash_title: 'Animação Inicial',
      app_replay_splash: 'Visualizar',

      set_page_title: 'Configurações do Jogo & Sistema',
      set_ram: 'Memória (RAM)',
      set_java: 'Java',
      set_scan_java: 'Reescanear',
      set_pick_java: 'Procurar... (javaw.exe)',
      set_screen: 'Tela',
      set_fullscreen: 'Tela cheia',
      set_width: 'Largura',
      set_height: 'Altura',
      set_launcher: 'Launcher & Integrações',
      set_advanced: 'Avançado',
      set_saved: '✓ Salvo',

      upd_page_title: 'Atualizações & Open Source',
      upd_check_btn: 'VERIFICAR ATUALIZAÇÕES',
      con_page_title: 'Console & Análise de Falhas',
      con_analyze: '🔍 Analisar Crash & Logs',
      con_share: '🔗 Compartilhar Log (mclo.gs)',
      con_clear: 'Limpar',
      skin_studio_badge: '👕 Estúdio de Skin 3D',
      skin_studio_title: 'Visualizador 3D e Gerenciador Alex/Steve',
      skin_use_name: '✓ Usar Este Nome',
      skin_dl_png: '⬇ Baixar Skin (.png)'
    }
  };

  let activeLang = 'tr';

  function dict(lang) {
    return TRANSLATIONS[lang || activeLang] || TRANSLATIONS.tr;
  }

  function t(key) {
    const d = dict(activeLang);
    return d[key] !== undefined ? d[key] : TRANSLATIONS.tr[key] || key;
  }

  function getGreeting(lang, name) {
    const d = dict(lang);
    const h = new Date().getHours();
    const idx = h < 6 ? 0 : h < 12 ? 1 : h < 18 ? 2 : 3;
    const part = d.greetings[idx];
    return name ? `${part}, ${name}` : part || d.greeting_anon;
  }

  function setText(sel, val) {
    const el = document.querySelector(sel);
    if (el && val !== undefined) el.textContent = val;
  }

  function setHtml(sel, val) {
    const el = document.querySelector(sel);
    if (el && val !== undefined) el.innerHTML = val;
  }

  function setPlaceholder(sel, val) {
    const el = document.querySelector(sel);
    if (el && val !== undefined) el.placeholder = val;
  }

  function applyLanguage(lang) {
    activeLang = TRANSLATIONS[lang] ? lang : 'tr';
    document.documentElement.setAttribute('lang', activeLang);
    const d = dict(activeLang);

    // Kenar çubuğu
    setText('.nav-btn[data-page="home"] span', d.nav_home);
    setText('.nav-btn[data-page="instances"] span', d.nav_instances);
    setText('.nav-btn[data-page="modrinth"] span', d.nav_modrinth);
    setText('.nav-btn[data-page="servers"] span', d.nav_servers);
    setText('.nav-btn[data-page="appearance"] span', d.nav_appearance);
    setText('.nav-btn[data-page="settings"] span', d.nav_settings);
    setText('.nav-btn[data-page="updates"] span:last-child', d.nav_updates);
    setText('.nav-btn[data-page="console"] span', d.nav_console);
    setText('#btnFolder span', d.nav_folder);

    // Ana Sayfa
    setHtml('#page-home .hero-text h1', d.hero_title_html);
    setText('#page-home .hero-text .sub', d.hero_sub);
    setText('#betaHeroBadge', d.beta_hero);
    setText('#page-home .play-card label[for="username"]', d.acc_label);
    setText('.auth-tab[data-authmode="offline"]', d.auth_offline);
    setText('.auth-tab[data-authmode="microsoft"]', d.auth_ms);
    setText('#page-home label[for="homeInstanceSelect"]', d.inst_label);
    setText('#btnManageInstances', d.manage_inst);
    setText('#playBtn .play-label', d.play_btn);
    setText('.stat[data-goto="instances"] .stat-label', d.stat_loader);
    setText('.stat[data-goto="modrinth"] .stat-label', d.stat_mods);
    setText('.stat[data-goto="settings"] .stat-label', d.stat_ram);
    setText('.stat[data-goto="appearance"] .stat-label', d.stat_theme);

    // Profiller
    setText('#page-instances .page-title', d.inst_page_title);
    setHtml('#page-instances .sub-sm', d.inst_page_sub);
    setText('#btnShowImportWizard', d.btn_import_wizard);
    setText('#btnImportMrpack', d.btn_import_mrpack);
    setText('#btnShowCreateInstance .play-label', d.btn_new_inst);
    setText('#instContentTabs [data-ctype="mod"]', d.tab_mod);
    setText('#instContentTabs [data-ctype="shader"]', d.tab_shader);
    setText('#instContentTabs [data-ctype="resourcepack"]', d.tab_resourcepack);
    setText('#instContentTabs [data-ctype="worlds"]', d.tab_worlds);
    setText('#instContentTabs [data-ctype="screenshots"]', d.tab_screenshots);
    setText('#instContentTabs [data-ctype="configs"]', d.tab_configs);
    setText('#btnDuplicateInstance', d.btn_dup_inst);
    setText('#btnInstallFpsPack', d.btn_fps_pack);
    setText('#btnCheckModUpdates', d.btn_check_mods);
    setText('#btnExportMrpack', d.btn_export_mrpack);
    setText('#btnOpenInstModrinth', d.btn_open_mr);
    setText('#btnOpenInstFolder', d.btn_open_folder);

    // Modrinth
    setText('#page-modrinth .page-title', d.mr_page_title);
    setText('#page-modrinth .sub-sm', d.mr_page_sub);
    setText('.modrinth-target-box .stat-label', d.mr_target);
    setText('#modrinthTypeTabs [data-mtype="mod"]', d.mr_tab_mod);
    setText('#modrinthTypeTabs [data-mtype="modpack"]', d.mr_tab_modpack);
    setText('#modrinthTypeTabs [data-mtype="shader"]', d.mr_tab_shader);
    setText('#modrinthTypeTabs [data-mtype="resourcepack"]', d.mr_tab_rp);
    setPlaceholder('#modrinthSearchInput', d.mr_search_ph);
    setText('#btnModrinthSearch .play-label', d.mr_search_btn);

    // Sunucular
    setText('#page-servers .page-title', d.srv_page_title);
    setText('#page-servers .sub-sm', d.srv_page_sub);
    setText('#btnRefreshServers', d.srv_refresh);
    const srvLabels = document.querySelectorAll('#page-servers .srv-add-row label');
    if (srvLabels[0]) srvLabels[0].textContent = d.srv_name_label;
    if (srvLabels[1]) srvLabels[1].textContent = d.srv_addr_label;
    setPlaceholder('#newServerName', d.srv_name_ph);
    setPlaceholder('#newServerAddress', d.srv_addr_ph);
    setText('#btnAddServer .play-label', d.srv_add_btn);

    // Görünüm
    setText('#page-appearance .page-title', d.app_page_title);
    const appCards = document.querySelectorAll('#page-appearance .card-head h3');
    if (appCards[0]) appCards[0].textContent = d.app_themes_title;
    if (appCards[1]) appCards[1].textContent = d.app_layouts_title;
    if (appCards[2]) appCards[2].textContent = d.app_anim_title;
    if (appCards[3]) appCards[3].textContent = d.app_splash_title;
    const appHints = document.querySelectorAll('#page-appearance .card-head small');
    if (appHints[0]) appHints[0].textContent = d.app_themes_sub;
    if (appHints[1]) appHints[1].textContent = d.app_layouts_sub;
    setText('#btnReplaySplash', d.app_replay_splash);

    // Ayarlar
    setText('#page-settings .page-title', d.set_page_title);
    const setCards = document.querySelectorAll('#page-settings .card-head h3');
    if (setCards[0]) setCards[0].textContent = d.set_ram;
    if (setCards[1]) setCards[1].textContent = d.set_java;
    if (setCards[2]) setCards[2].textContent = d.set_screen;
    if (setCards[3]) setCards[3].textContent = d.set_launcher;
    if (setCards[4]) setCards[4].textContent = d.set_advanced;
    setText('#btnScanJava', d.set_scan_java);
    setText('#btnPickJava', d.set_pick_java);
    setText('#savedMsg', d.set_saved);

    // Güncellemeler & Konsol & Skin Stüdyosu
    setText('#page-updates .page-title', d.upd_page_title);
    setText('#btnCheckUpdate .play-label', d.upd_check_btn);
    setText('#page-console .page-title', d.con_page_title);
    setText('#btnAnalyzeCrash', d.con_analyze);
    setText('#btnShareLogs', d.con_share);
    setText('#btnClearLog', d.con_clear);
    setText('#skinStudioModal .modal-head .badge', d.skin_studio_badge);
    setText('#skinStudioModal .modal-head h3', d.skin_studio_title);
    setText('#btnSkinUseName', d.skin_use_name);
    setText('#btnSkinDownloadPng', d.skin_dl_png);

    return activeLang;
  }

  window.LumoraI18n = {
    TRANSLATIONS,
    applyLanguage,
    t,
    getGreeting,
    getActiveLanguage: () => activeLang
  };
})();
