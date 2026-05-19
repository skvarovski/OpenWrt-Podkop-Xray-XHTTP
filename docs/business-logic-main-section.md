# Бизнес-логика основного раздела (Основное)

## Обзор

Основной раздел LuCI — главная страница настройки прокси. Пользователь выбирает тип подключения, вставляет VLESS URL, выбирает geosite/geoip категории, задает пользовательские домены/подсети.

## Архитектура маршрутизации

### Mark система (nftables ↔ Xray)
- `0x00100000` — FakeIP mark: nftables перехватывает пакеты к FakeIP диапазону и помеченные подсети
- `0xff` (255) — Outbound mark: Xray ставит на свои исходящие пакеты через `sockopt.mark: 255`
- nftables `mangle_output` — условная цепочка (см. "Трафик роутера")

### Трафик роутера vs LAN-клиентов
- **`enable_output_network_interface=0`** (default): `mangle_output` пустая (policy accept), роутер работает напрямую. `/etc/resolv.conf` → DHCP-полученные DNS (`/tmp/resolv.conf.d/resolv.conf.auto`), fallback на bootstrap DNS.
- **`enable_output_network_interface=1`**: `mangle_output` маркирует router output → tproxy → Xray. Роутер ходит через прокси.

Итоговый flow при `enable_output=0`:
- **LAN-клиенты**: DNS → dnsmasq → Xray DNS → FakeIP → nftables prerouting → tproxy → Xray → route
- **Роутер**: DNS → `/etc/resolv.conf` → DHCP DNS → реальный IP → direct

### DNS (FakeDNS-only)
DNS конфигурация Xray содержит только FakeDNS + fallback:
- **FakeDNS** — единственный активный сервер (возвращает 198.18.x.x для перехвата)
- **dns.hosts** — статический маппинг DoH-hostname → bootstrap IP (предотвращает self-resolution loop)
- **Fallback** → bootstrap DNS + localhost

**Важно:** category-aware DNS серверы (DoH по категориям) НЕ используются. Причина: Xray переставляет порядок DNS серверов — если домен матчится `domains` фильтру DoH-сервера, тот отвечает первым с реальным IP, и FakeDNS не срабатывает. Реальное разрешение DNS происходит на стороне outbound (freedom outbound для direct, proxy outbound для прокси).

### Rules Type (порядок правил маршрутизации)
Определяет порядок оценки geosite/geoip правил и catch-all outbound. Дефолтная концепция проекта: geo/direct-списки задают, что идёт напрямую (direct выход), а весь остальной трафик автоматически уходит в proxy (VPN):

| rules_type | Порядок правил | Catch-all |
|---|---|---|
| `proxy_direct_block` | proxy → direct → block | `block` |
| `block_proxy_direct` | block → proxy → direct | `direct` |
| `direct_proxy_block` | direct → proxy → block | `block` |
| `block_direct_proxy` (default) | block → direct → proxy | `proxy` |
| `proxy_everything` | (все списки игнорируются) | `proxy` |

Логика: последнее слово в `rules_type` = outbound для неизвестного трафика. `proxy` в catch-all означает primary proxy-outbound main-секции (тег от `get_outbound_tag_by_section "main"`).

`proxy_everything` — особый режим: `_generate_routing_rules` возвращает `return 0` в самом начале для секции, не добавляя ни одного правила из geosite/geoip/remote/local/user-списков. Весь трафик, попадающий в xray, ловится финальным catch-all'ом и уходит в proxy. Полезно как аварийный обход, когда хочется направить всё через VPN и вручную добавить исключения через `remote_subnet_lists` / `routing_included_ips`.

`block_direct_proxy` сохраняет порядок block → direct → proxy (явные чёрные и прямые списки вычисляются до catch-all), но неизвестный трафик идёт в proxy — политика «через VPN по умолчанию, кроме явно перечисленного».

### User domains/subnets
Три режима (`user_domain_list_type` / `user_subnet_list_type`):
- `disabled` — пропуск
- `dynamic` — UCI list (по одному домену/подсети)
- `text` — текстовое поле с поддержкой комментариев (`//`), разделители: запятая, пробел, перенос строки

### Finalmask (DPI resistance)
URL-параметр прокси-строки:
- `fm=<url-encoded-json>` — JSON-объект, который целиком подставляется в `streamSettings.finalmask`.

Декодированный `fm` имеет вид `{"tcp":[{...layer...}, ...]}`. Типы слоёв (`fragment`, `sudoku`, будущие) и их настройки определяются xray-core; podkop-xray пропускает объект без изменений. Единственная проверка — что `fm` после `url_decode` парсится как JSON (`jq -e`); битый JSON → лог `Invalid JSON in fm= parameter of proxy_string` + `exit 1`.

### Geodata
- **geosite.dat** / **geoip.dat** — скачиваются из `skvarovski/russia-v2ray-rules-dat-small`
- **geosite_categories.txt** / **geoip_categories.txt** — файлы категорий из того же release
- Fallback: strings extraction для geosite, hardcoded константа для geoip

### list_update (cron)
- Скачивает geofiles с atomic replace (tmp → validate → mv)
- При неудаче — сохраняет старые файлы, НЕ рестартит xray
- При успехе — `stop_main` + `start_main` (полный рестарт включая nftables)
- Graceful fallback: ни один файл не удаляется при ошибке скачивания
- Расписание: `1d` → ежедневно в 01:00, `3d` → каждые 3 дня в 01:00, `1h/3h/12h` → в начале часа

## Поток данных

```
UCI config → xray_generate_config()
  ├── _collect_geosite_cats() → собрать proxy/direct geosite категории
  ├── xray_configure_dns() → FakeDNS-only (без category-aware серверов)
  ├── _generate_outbound() → VLESS/SOCKS outbound (+ Finalmask)
  ├── _generate_routing_rules() → geosite/geoip + user lists + remote lists
  ├── QUIC → block (если disable_quic=1)
  ├── BitTorrent → direct
  ├── leak-test/IP-check домены → всегда proxy (api.ipify.org, ipleak.net, 2ip.ru и др.)
  └── catch-all → определяется последним словом rules_type (direct/block/proxy)
```

### Диагностические домены (всегда через прокси)
Следующие домены всегда маршрутизируются через proxy-outbound, независимо от rules_type и catch-all.
Это нужно для корректной работы диагностики (`check_proxy`) и ручных проверок утечек:
- `api.ipify.org` — IP-check (используется `check_proxy`)
- `dnsleaktest.com`, `ipleak.net`, `browserleaks.com`, `whoer.net`, `2ip.ru` — leak-тесты

### QUIC (disable_quic)
QUIC (UDP 443) работает корректно через tproxy при FakeDNS-only DNS конфигурации — sniffing извлекает SNI из QUIC Client Hello, FakeDNS reverse lookup определяет домен. По умолчанию `disable_quic=0` (QUIC разрешён).

При `disable_quic=1` добавляется routing rule `protocol: ["quic"] → block`. Браузеры переключаются на TCP. Использовать только если QUIC через tproxy работает нестабильно на конкретном устройстве.

**Важно:** QUIC работает только с FakeDNS-only DNS (без domain-filtered серверов). Если в DNS конфиге есть category-aware серверы (DoH с `domains` фильтрами), FakeDNS не сработает для matching доменов и QUIC-трафик уйдёт в catch-all.
