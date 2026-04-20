# 🚀 podkop-xray

🔒 Селективная маршрутизация доменов для OpenWrt через **Xray-core** с безопасностью **REALITY** для максимальной устойчивости к DPI.

Альтернатива [podkop](https://github.com/itdoginfo/podkop), где sing-box заменён на Xray-core с фокусом на VLESS+REALITY и продвинутые транспорты.

## 📦 Установка (одной командой)

```sh
wget -qO- https://raw.githubusercontent.com/skvarovski/OpenWrt-Podkop-Xray-XHTTP/main/install.sh | sh
```

Скрипт автоматически:
1. 📥 Скачает и установит **xray-core 26.3.27** (бинарник с GitHub releases)
2. 📦 Установит пакеты **podkop-xray** + **luci-app-podkop-xray**
3. 🔧 Установит все зависимости (`curl`, `jq`, `kmod-nft-tproxy` и др.)
4. ✅ Включит сервис

После установки:
- 🌐 Откройте LuCI веб-интерфейс → Сервисы → Podkop Xray
- 📋 Вставьте вашу VLESS+REALITY proxy-строку
- 💾 Сохраните, примените и запустите сервис

### 🖥️ Поддерживаемые архитектуры
| Архитектура | Устройства |
|---|---|
| `aarch64` | Xiaomi AX3000T, большинство современных роутеров |
| `x86_64` | x86 роутеры, виртуальные машины |
| `armv7` | старые ARM роутеры |

### ⚙️ Требования
- **OpenWrt 25.12+** (пакетный менеджер apk)
- ~15MB свободного места
- Работающее интернет-соединени��

### 🔥 Рекомендуется: кастомная прошивка со всеми зависимостями

> **Для лучшего опыта соберите прошивку с предустановленными зависимостями.** Это исключает проблемы с пакетами и гарантирует работу из коробки.

Используйте [OpenWrt Firmware Selector](https://firmware-selector.openwrt.org/) для вашего устройства и добавьте эти пакеты в поле **"Installed Packages"**:

```
-dnsmasq dnsmasq-full kmod-nft-tproxy curl jq coreutils-base64 bind-dig unzip
```

Эти пакеты добавляются **поверх** стандартного набора для вашего устройства. Полный пример для Xiaomi AX3000T (включая настройку Wi-Fi, русскую локаль и другие полезные пакеты) — в [firmware/README.md](firmware/README.md).

## ✨ Возможности

- 🛡️ **VLESS + REALITY** — все транспорты (TCP, XHTTP, gRPC) с REALITY
- ⚡ **XTLS-Vision** — TCP + REALITY с flow control для максимальной производительности
- 🌊 **XHTTP + REALITY** — мультиплексирование xmux + xPadding для обхода DPI
- 🔗 **gRPC + REALITY** — CDN-совместимый транспорт с маскировкой REALITY
- 🔀 **Mixed Proxy** — HTTP+SOCKS5 на одном порту для ручной настройки прокси
- 🎭 **FakeDNS** — прозрачная маршрутизация через DNS на базе 198.18.0.0/15
- 🎯 **Селективная маршрутизация** — через прокси идут только выбранные домены/IP
- 🌍 **Geosite маршрутизация** — 24 категории (динамически из geosite.dat), proxy/direct/block
- 🗺️ **GeoIP маршрутизация** — 11 категорий (динамически из geoip.dat), proxy/direct/block
- 📐 **Rules Type** — настраиваемый порядок применения правил с catch-all
- 🏠 **Прямой режим роутера** — трафик самого роутера идёт напрямую (DHCP DNS)
- 📝 **Пользовательские списки** — домены/подсети вручную, через динамический список или текст с комментариями
- 📡 **Удалённые/локальные списки** — списки доменов/подсетей по URL или из локальных файлов
- 🖥️ **LuCI Web UI** — полный веб-интерфейс с диагностикой и отслеживанием версий geofiles
- 🧦 **SOCKS** — исходящее соединение для цепочки прокси

## 🔍 Как это работает

```
LAN клиент -> dnsmasq -> Xray DNS (127.0.0.1:5300) -> FakeDNS (198.18.0.0/15)
           -> nftables mangle (prerouting) mark 0x00100000 -> tproxy :12345
           -> Xray dokodemo-door -> VLESS+XHTTP -> удалённый сервер

Роутер     -> /etc/resolv.conf -> DHCP DNS -> реальный IP -> напрямую (без nftables)
           (при enable_output_network_interface=0, по умолчанию)
```

Четыре уровня работают вместе:

| Уровень | Компонент | Роль |
|---------|-----------|------|
| 1 | **nftables** | Маркировка трафика по FakeIP диапазону + пользовательские подсети |
| 2 | **ip routing** | Маршрутизация маркированных пакетов через tproxy в Xray |
| 3 | **Xray-core** | dokodemo-door inbound, обработка протоколов, FakeDNS |
| 4 | **dnsmasq** | Перенаправление DNS-запросов в Xray DNS inbound |

## ⚙️ Конфигурация

Редактируйте `/etc/config/podkop-xray` или используйте LuCI веб-интерфейс:

```
config settings 'settings'
        option dns_type 'doh'
        option dns_server 'https://dns.google/dns-query'
        option bootstrap_dns_server '8.8.8.8'
        list source_network_interfaces 'br-lan'
        option config_path '/etc/xray/config.json'
        option log_level 'warning'

config section 'main'
        option connection_type 'proxy'
        option proxy_config_type 'url'
        option proxy_string 'vless://UUID@server:443?type=xhttp&security=reality&pbk=KEY&sid=ID&sni=example.com&fp=chrome&path=/tunnel&mode=auto'
        option rules_type 'block_proxy_direct'
        list geosite_proxy 'RU-BLOCKED'
        list geosite_proxy 'CATEGORY-MEDIA'
        list geosite_direct 'CATEGORY-RU'
        list geosite_block 'CATEGORY-ADS-ALL'
        list geoip_proxy 'RU-BLOCKED'
        list geoip_direct 'RU-WHITELIST'
```

### 🔑 Формат Proxy String

Все VLESS соединения используют **REALITY** для максимальной устойчивости к DPI:

🛡️ **VLESS + XHTTP + REALITY + Finalmask** — максимальная защита от DPI, лучшая связка на апрель 2026 🔥🏆:
```
vless://UUID@server:443?type=xhttp&security=reality&pbk=KEY&sid=ID&sni=example.com&fp=chrome&path=/tunnel&mode=auto&fm=%7B%22tcp%22%3A%5B%7B%22type%22%3A%22fragment%22%2C%22settings%22%3A%7B%22packets%22%3A%22tlshello%22%2C%22length%22%3A%22100-300%22%2C%22delay%22%3A%221-5%22%7D%7D%2C%7B%22type%22%3A%22sudoku%22%2C%22settings%22%3A%7B%22password%22%3A%22mypassword%22%2C%22paddingMin%22%3A10%2C%22paddingMax%22%3A50%7D%7D%5D%7D
```
> 💡 `fm=` — это URL-encoded JSON-объект, который целиком подставляется в `streamSettings.finalmask`. Декодированный пример выше:
> ```json
> {"tcp":[
>   {"type":"fragment","settings":{"packets":"tlshello","length":"100-300","delay":"1-5"}},
>   {"type":"sudoku","settings":{"password":"mypassword","paddingMin":10,"paddingMax":50}}
> ]}
> ```
> Fragment разбивает TLS ClientHello на мелкие фрагменты, Sudoku трансформирует паттерны данных — вместе они побеждают глубокую инспекцию пакетов. Пароль `sudoku` должен совпадать на клиенте и сервере.

📋 **Finalmask (параметр `fm=`):**
- Любая клиентская панель, поддерживающая новый формат Finalmask в xray-core (Hiddify, v2rayN и т.п.), генерирует `fm=` автоматически из серверного конфига.
- Типы слоёв (`fragment`, `sudoku`, будущие) и их настройки определяются xray-core — podkop-xray пропускает объект без изменений.
- Если `fm=` присутствует, но после декодирования не является валидным JSON, сервис откажется стартовать и запишет в лог `Invalid JSON in fm= parameter of proxy_string`.

**VLESS + TCP + REALITY** (XTLS-Vision — золотой стандарт):
```
vless://UUID@server:443?security=reality&pbk=KEY&sid=ID&sni=example.com&fp=chrome&flow=xtls-rprx-vision
```

**VLESS + XHTTP + REALITY** (продвинутый, с xmux и xPadding):
```
vless://UUID@server:443?type=xhttp&security=reality&pbk=KEY&sid=ID&sni=example.com&fp=chrome&path=/tunnel&mode=auto
```

**VLESS + gRPC + REALITY**:
```
vless://UUID@server:443?type=grpc&security=reality&pbk=KEY&sid=ID&sni=example.com&fp=chrome&serviceName=mygrpc
```

**SOCKS** (для цепочки прокси):
```
socks://user:pass@127.0.0.1:1080
```

### 📐 Rules Type

Управляет порядком применения правил geosite/geoip (первое совпадение побеждает). Последнее слово определяет catch-all для несовпавшего трафика:

| Значение | Порядок | Catch-all |
|----------|---------|-----------|
| `proxy_direct_block` | Proxy → Direct → Block | block |
| `block_proxy_direct` | Block → Proxy → Direct (по умолчанию) | direct |
| `direct_proxy_block` | Direct → Proxy → Block | block |
| `block_direct_proxy` | Block → Direct → Proxy | proxy |
| `proxy_everything` | все списки игнорируются | proxy |

`block_direct_proxy` — всё, что не попало в явные block/direct-списки, уходит через прокси (политика «VPN по умолчанию, кроме явно указанного»). `proxy_everything` полностью игнорирует geosite/geoip/user-списки секции: весь дошедший до xray трафик идёт в proxy outbound.

### 📚 Дополнительная документация

- 🛡️ [Руководство по максимальной защите от DPI](docs/xray-max-protection-config.md) — полные конфиги клиента и сервера с VLESS+XHTTP+REALITY+Finalmask, послойный разбор устойчивости к DPI, справочник всех слоёв Finalmask
- 🖥️ [Пример серверного конфига](docs/server-config-example.json) — готовый конфиг Xray-сервера с XHTTP+REALITY+Finalmask (fragment+sudoku) и chain proxy outbound

## 🏷️ Версионирование

Формат версии: `0.<xray_version>-<build>`, например `0.26.3.27-0`

- `0.26.3.27` — на основе версии xray-core
- `-0` — инкрементный номер сборки

Git теги: `v0.26.3.27-0`, `v0.26.3.27-1` и т.д.

## 🔨 Сборка из исходников

Требуется Docker 20+.

```bash
# Сборка APK пакетов
./build-apk-local.sh 0.26.3.27 0

# Результат: bin/apk/podkop-xray_0.26.3.27-r0_all.apk
#            bin/apk/luci-app-podkop-xray_0.26.3.27-r0_all.apk
```

Подробности в [docs/building-apk.md](docs/building-apk.md).

## 🤖 CI/CD

GitHub Actions workflow:

| Workflow | Триггер | Действие |
|---|---|---|
| `build-release.yml` | Push тега `v*` | Сборка APK + создание GitHub release |

Создание релиза:
```bash
git tag v0.26.3.27-0
git push origin v0.26.3.27-0
```

## 🛠️ Использование CLI

```bash
# Управление сервисом
/etc/init.d/podkop-xray start|stop|restart

# Диагностика
podkop-xray global_check          # Полный диагностический отчёт
podkop-xray check_xray            # Статус установки Xray
podkop-xray check_dns_available   # Проверка доступности DNS
podkop-xray check_nft_rules       # Проверка правил nftables
podkop-xray check_fakeip          # Проверка FakeIP
podkop-xray check_logs            # Последние логи
podkop-xray show_xray_config      # Сгенерированный конфиг Xray (маскированный)
podkop-xray list_geosite_categories  # Список категорий geosite.dat
podkop-xray list_geoip_categories    # Список категорий geoip.dat
```

## 📁 Структура файлов

```
podkop-xray/
    Makefile                            # Определение пакета OpenWrt
    Dockerfile-apk                      # Docker-образ для сборки
    build-apk-local.sh                  # Скрипт локальной сборки APK
    install.sh                          # Установщик одной командой
    .github/workflows/
        build-release.yml               # CI: сборка APK + релиз по пушу тега
    files/
        etc/
            config/podkop-xray          # UCI конфигурация по умолчанию
            init.d/podkop-xray          # procd init скрипт
        usr/
            bin/podkop-xray             # Главный скрипт
            lib/podkop-xray/
                constants.sh            # Порты, метки, URL, теги
                logging.sh              # Функции логирования
                helpers.sh              # Парсинг URL, валидация IP
                nft.sh                  # nftables + ip routing + dnsmasq
                rulesets.sh             # Управление списками доменов/подсетей
                xray_config.sh          # Генерация JSON конфига Xray
                xhttp_parser.sh         # Парсинг параметров XHTTP URL
    luci-app-podkop-xray/               # Пакет LuCI веб-интерфейса
    docs/                               # Документация
```

## 🙏 Благодарности

- [podkop](https://github.com/itdoginfo/podkop) — оригинальный проект от ITDog
- [Xray-core](https://github.com/XTLS/Xray-core) — прокси-платформа с XHTTP
- [russia-v2ray-rules-dat](https://github.com/runetfreedom/russia-v2ray-rules-dat) — источник геоданных

## 📄 Лицензия

GPL-2.0-or-later (как у podkop)
