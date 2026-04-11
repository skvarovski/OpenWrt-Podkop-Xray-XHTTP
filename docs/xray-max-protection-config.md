# Максимальная защита VLESS+XHTTP+REALITY+Finalmask

Xray-core v26.3.27 — все новейшие DPI-resistant фичи.

## Клиент (роутер / podkop-xray)

```json
{
    "log": {
        "loglevel": "warning"
    },
    "dns": {
        "servers": [
            { "address": "fakedns" },
            {
                "address": "https://1.1.1.1/dns-query",
                "skipFallback": true
            },
            "8.8.8.8"
        ],
        "queryStrategy": "UseIPv4"
    },
    "fakeDns": {
        "ipPool": "198.18.0.0/15",
        "poolSize": 65535
    },
    "routing": {
        "domainStrategy": "IPIfNonMatch",
        "rules": [
            {
                "type": "field",
                "inboundTag": ["dns-in"],
                "outboundTag": "dns-out"
            },
            {
                "type": "field",
                "domain": ["geosite:private"],
                "outboundTag": "direct"
            },
            {
                "type": "field",
                "ip": ["geoip:private"],
                "outboundTag": "direct"
            },
            {
                "type": "field",
                "protocol": ["bittorrent"],
                "outboundTag": "direct"
            },
            {
                "type": "field",
                "domain": ["geosite:category-ads-all"],
                "outboundTag": "block"
            },
            {
                "type": "field",
                "domain": ["geosite:ru-blocked"],
                "outboundTag": "proxy"
            },
            {
                "type": "field",
                "ip": ["geoip:ru-blocked"],
                "outboundTag": "proxy"
            },
            {
                "type": "field",
                "domain": ["geosite:category-ru"],
                "outboundTag": "direct"
            },
            {
                "type": "field",
                "network": "tcp,udp",
                "outboundTag": "proxy"
            }
        ]
    },
    "inbounds": [
        {
            "tag": "tproxy-in",
            "port": 12345,
            "listen": "0.0.0.0",
            "protocol": "dokodemo-door",
            "settings": {
                "network": "tcp,udp",
                "followRedirect": true
            },
            "sniffing": {
                "enabled": true,
                "destOverride": ["http", "tls", "quic", "fakedns"],
                "routeOnly": false
            },
            "streamSettings": {
                "sockopt": {
                    "tproxy": "tproxy",
                    "mark": 255
                }
            }
        },
        {
            "tag": "dns-in",
            "port": 5300,
            "listen": "127.0.0.1",
            "protocol": "dokodemo-door",
            "settings": {
                "address": "8.8.8.8",
                "port": 53,
                "network": "udp"
            }
        },
        {
            "tag": "socks-in",
            "listen": "0.0.0.0",
            "port": 10808,
            "protocol": "socks",
            "settings": { "udp": true },
            "sniffing": {
                "enabled": true,
                "destOverride": ["http", "tls", "quic"],
                "routeOnly": true
            }
        },
        {
            "tag": "http-in",
            "listen": "0.0.0.0",
            "port": 10809,
            "protocol": "http",
            "settings": {},
            "sniffing": {
                "enabled": true,
                "destOverride": ["http", "tls", "quic"],
                "routeOnly": true
            }
        }
    ],
    "outbounds": [
        {
            "tag": "proxy",
            "protocol": "vless",
            "settings": {
                "vnext": [{
                    "address": "YOUR_SERVER_IP",
                    "port": 443,
                    "users": [{
                        "id": "YOUR_UUID",
                        "encryption": "none",
                        "flow": ""
                    }]
                }]
            },
            "streamSettings": {
                "network": "xhttp",
                "xhttpSettings": {
                    "path": "/secretpath",
                    "mode": "auto",
                    "headers": {
                        "User-Agent": "chrome"
                    },
                    "xmux": {
                        "maxConcurrency": "16-32",
                        "maxConnections": 0,
                        "cMaxReuseTimes": "64-128",
                        "cMaxLifetimeMs": 0
                    },
                    "xPaddingBytes": "100-1000"
                },
                "security": "reality",
                "realitySettings": {
                    "serverName": "www.microsoft.com",
                    "fingerprint": "chrome",
                    "publicKey": "YOUR_PUBLIC_KEY",
                    "shortId": "YOUR_SHORT_ID",
                    "spiderX": "/en-us"
                },
                "finalmask": {
                    "tcp": [
                        {
                            "type": "fragment",
                            "settings": {
                                "packets": "tlshello",
                                "length": "10-50",
                                "delay": "5-15"
                            }
                        },
                        {
                            "type": "sudoku",
                            "settings": {
                                "password": "YOUR_SHARED_SUDOKU_PASSWORD",
                                "ascii": "prefer_ascii",
                                "paddingMin": 1,
                                "paddingMax": 8
                            }
                        }
                    ]
                },
                "sockopt": {
                    "mark": 255
                }
            }
        },
        {
            "tag": "direct",
            "protocol": "freedom",
            "settings": {
                "domainStrategy": "UseIPv4"
            },
            "streamSettings": {
                "sockopt": { "mark": 255 }
            }
        },
        {
            "tag": "block",
            "protocol": "blackhole",
            "settings": {
                "response": { "type": "http" }
            }
        },
        {
            "tag": "dns-out",
            "protocol": "dns",
            "proxySettings": {
                "tag": "proxy"
            }
        }
    ]
}
```

---

## Сервер

```json
{
    "log": {
        "loglevel": "warning"
    },
    "routing": {
        "domainStrategy": "IPIfNonMatch",
        "rules": [
            {
                "type": "field",
                "inboundTag": ["vless-in"],
                "domain": ["geosite:category-ads-all"],
                "outboundTag": "block"
            },
            {
                "type": "field",
                "protocol": ["bittorrent"],
                "outboundTag": "block"
            }
        ]
    },
    "inbounds": [
        {
            "tag": "vless-in",
            "listen": "0.0.0.0",
            "port": 443,
            "protocol": "vless",
            "settings": {
                "clients": [
                    {
                        "id": "YOUR_UUID",
                        "email": "user@podkop",
                        "flow": ""
                    }
                ],
                "decryption": "none"
            },
            "streamSettings": {
                "network": "xhttp",
                "xhttpSettings": {
                    "path": "/secretpath",
                    "mode": "auto",
                    "xPaddingBytes": "100-1000"
                },
                "security": "reality",
                "realitySettings": {
                    "show": false,
                    "dest": "www.microsoft.com:443",
                    "serverNames": [
                        "www.microsoft.com",
                        "microsoft.com"
                    ],
                    "privateKey": "YOUR_PRIVATE_KEY",
                    "shortIds": [
                        "YOUR_SHORT_ID",
                        ""
                    ],
                    "maxTimeDiff": 60000
                },
                "finalmask": {
                    "tcp": [
                        {
                            "type": "fragment",
                            "settings": {
                                "packets": "tlshello",
                                "length": "10-50",
                                "delay": "5-15"
                            }
                        },
                        {
                            "type": "sudoku",
                            "settings": {
                                "password": "YOUR_SHARED_SUDOKU_PASSWORD",
                                "ascii": "prefer_ascii",
                                "paddingMin": 1,
                                "paddingMax": 8
                            }
                        }
                    ]
                }
            },
            "sniffing": {
                "enabled": true,
                "destOverride": ["http", "tls", "quic"]
            }
        }
    ],
    "outbounds": [
        {
            "tag": "direct",
            "protocol": "freedom"
        },
        {
            "tag": "block",
            "protocol": "blackhole",
            "settings": {
                "response": { "type": "http" }
            }
        }
    ]
}
```

---

## Что нужно заменить

| Placeholder | Что вписать |
|-------------|------------|
| `YOUR_SERVER_IP` | IP вашего VPS |
| `YOUR_UUID` | Сгенерировать: `xray uuid` |
| `YOUR_PUBLIC_KEY` / `YOUR_PRIVATE_KEY` | Сгенерировать: `xray x25519` |
| `YOUR_SHORT_ID` | Hex строка 1-16 символов, например: `abcd1234` |
| `YOUR_SHARED_SUDOKU_PASSWORD` | Любой пароль, одинаковый на клиенте и сервере |
| `/secretpath` | Любой путь, одинаковый на клиенте и сервере |

---

## Генерация ключей

```bash
# UUID
xray uuid

# REALITY ключи (x25519)
xray x25519
# Выдаст:
#   Private key: <для сервера>
#   Public key:  <для клиента>
```

---

## Что защищает от чего

| Слой | Защита | Против какой атаки DPI |
|------|--------|----------------------|
| **VLESS** | Нет характерных заголовков протокола | Сигнатурный анализ протоколов |
| **XHTTP** | Трафик выглядит как обычный HTTP/2 | Классификация по паттерну соединений |
| **xPaddingBytes 100-1000** | Рандомизирует размеры пакетов | Статистический анализ длин пакетов |
| **xmux** | Мультиплексирование потоков | Корреляция потоков по таймингу |
| **REALITY** | Имитирует настоящий TLS сайта (microsoft.com) | Активное зондирование сервера |
| **spiderX** | Сервер при зондировании показывает реальную страницу /en-us | Проверка содержимого при зондировании |
| **fingerprint: chrome** | TLS ClientHello идентичен Chrome | Fingerprinting TLS-клиента |
| **User-Agent: chrome** | HTTP-заголовки как у Chrome | Fingerprinting HTTP-клиента |
| **Finalmask fragment** | Разбивает TLS ClientHello на куски 10-50 байт | Инспекция SNI/fingerprint в первом пакете |
| **Finalmask sudoku** | Трансформирует вид данных, добавляет padding 1-8 байт | Энтропийный анализ, паттерны шифрованных данных |
| **dns-out → proxySettings: proxy** | DNS-запросы идут через прокси | DNS leak, DNS-based блокировка |
| **FakeDNS** | Заблокированные домены получают фейковый IP | Перехват DNS на уровне провайдера |
| **sniffing + routeOnly** | Определяет реальный домен из TLS SNI | Обход DNS-based фильтрации |
| **geosite:ru-blocked + geoip:ru-blocked** | Точный список заблокированных ресурсов (runetfreedom) | Блокировка по реестру РКН |

---

## Порядок защиты пакета (что видит DPI)

```
1. DPI видит TCP-соединение к microsoft.com:443
2. TLS ClientHello разбит на фрагменты по 10-50 байт (fragment)
   → DPI не может собрать SNI из фрагментов
3. После TLS handshake данные прошли через Sudoku
   → нет характерных паттернов шифрованного трафика
4. REALITY делает TLS-хэндшейк неотличимым от настоящего microsoft.com
   → активное зондирование получает реальную страницу microsoft.com
5. Внутри туннеля XHTTP выглядит как обычные HTTP/2 запросы
   → xPaddingBytes убирает паттерны размеров
6. VLESS не имеет сигнатуры
   → невозможно определить протокол
```

---

## Finalmask — все доступные слои (справка)

### TCP слои

| Тип | Описание | Настройки |
|-----|----------|-----------|
| `fragment` | Фрагментация TLS ClientHello | `packets`, `length`, `delay`, `maxSplit` |
| `header-custom` | Произвольный бинарный хэндшейк | `clients[][]`, `servers[][]`, `errors[][]` |
| `sudoku` | Трансформация вида данных | `password`, `ascii`, `paddingMin`, `paddingMax` |

### UDP слои

| Тип | Описание | Настройки |
|-----|----------|-----------|
| `noise` | Шумовые пакеты | `reset`, `noise[]` |
| `header-custom` | Произвольные заголовки | `client[]`, `server[]` |
| `header-dns` | Обёртка в DNS | `domain` |
| `header-dtls` | Фейковый DTLS | нет |
| `header-srtp` | Фейковый SRTP | нет |
| `header-wechat` | Фейковый WeChat | нет |
| `header-wireguard` | Фейковый WireGuard | нет |
| `salamander` | XOR обфускация | `password` |
| `mkcp-original` | mKCP compat | нет |
| `mkcp-aes128gcm` | mKCP + AES-GCM | `password` |
| `sudoku` | Трансформация данных | `password`, `ascii`, `paddingMin`, `paddingMax` |
| `xdns` | DNS-туннель (требует KCP) | `domain` |
| `xicmp` | ICMP-туннель (требует root) | `listenIp`, `id` |

### quicParams (для QUIC/Hysteria2)

```json
"quicParams": {
    "congestion": "bbr",
    "bbrProfile": "aggressive",
    "brutalUp": "50mbps",
    "brutalDown": "200mbps",
    "udpHop": {
        "ports": "10000-20000",
        "interval": "30-60"
    }
}
```

---

## Важные заметки

- **Finalmask на клиенте и сервере должен быть одинаковым** — это симметричная обфускация
- **fragment** можно использовать без сервера (односторонняя фрагментация), но **sudoku** требует пароль на обоих сторонах
- **flow** оставлен пустым — для XHTTP не нужен `xtls-rprx-vision` (он только для TCP+REALITY без XHTTP)
- **port 443** обязателен для REALITY — не-443 порты "极易导致服务器 IP 被封锁" (легко приводят к блокировке IP)
- **www.microsoft.com** — проверенный SNI-target для REALITY (отвечает корректно, большой трафик)
