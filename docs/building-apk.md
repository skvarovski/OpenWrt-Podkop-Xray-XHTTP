# Сборка APK-пакетов

## Обзор

podkop-xray собирается в два APK-пакета через OpenWrt SDK в Docker:
- **podkop-xray** (~23KB) — shell-скрипты, init, UCI конфиг
- **luci-app-podkop-xray** (~24KB) — LuCI веб-интерфейс

Оба пакета `PKGARCH=all` (архитектурно-независимые), собираются на x86_64 SDK и работают на любом OpenWrt 25.12.

## Версионирование

Формат: `0.<xray_version>-<build>` — например `0.26.3.27-0`.

- `0.26.3.27` — базируется на версии xray-core
- `-0` — инкрементируемый номер билда (0, 1, 2, ...)
- GitHub теги: `v0.26.3.27-0`, `v0.26.3.27-1`, ...
- Makefile: `PKG_VERSION` из env `PODKOP_XRAY_VERSION`, `PKG_RELEASE` из env `PODKOP_XRAY_BUILD`
- constants.sh: placeholder `__COMPILED_VERSION_VARIABLE__` заменяется на `VERSION-BUILD` при сборке
- Проверка: `podkop-xray show_version`

## Локальная сборка

### Требования
- Docker 20+
- ~3GB свободного места (SDK образ)
- Интернет (для скачивания SDK и feeds при первом запуске)

### Команда

```sh
./build-apk-local.sh 0.26.3.27 0
```

Аргументы:
1. `VERSION` — версия xray-core (default: `0.26.3.27`)
2. `BUILD` — номер билда (default: `0`)

### Что происходит

1. **SDK образ** (`sdk/Dockerfile-sdk-apk`) — скачивает `openwrt/sdk:x86-64-SNAPSHOT`, запускает `setup.sh`, `feeds update`, `feeds install luci-base`. Кешируется Docker layer — первый запуск ~5 мин, повторные мгновенно.

2. **Билд образ** (`Dockerfile-apk`) — копирует исходники в SDK feeds, запускает `make defconfig && make package/podkop-xray/compile && make package/luci-app-podkop-xray/compile`. Первый запуск ~10-15 мин (компиляция зависимостей), повторные быстрее.

3. **Извлечение** — `docker cp` копирует APK из контейнера в `./bin/apk/`.

### Результат

```
bin/apk/
    podkop-xray_0.26.3.27-r0_all.apk
    luci-app-podkop-xray_0.26.3.27-r0_all.apk
    (+ зависимости luci-base, которые уже есть на роутере)
```

## Установка на роутер

### Рекомендуемый способ (install.sh)

```sh
wget -qO- https://raw.githubusercontent.com/skvarovski/OpenWrt-Podkop-Xray-XHTTP/main/install.sh | sh
```

Скрипт автоматически:
- Скачает xray-core бинарник для вашей архитектуры
- Установит APK пакеты из последнего GitHub release
- Установит все зависимости
- Включит сервис

### Ручная установка

```sh
# Копировать на роутер
scp -O bin/apk/podkop-xray_0.26.3.27-r0_all.apk bin/apk/luci-app-podkop-xray_0.26.3.27-r0_all.apk root@<router-ip>:/tmp/

# Установить зависимости
ssh root@<router-ip> 'apk add curl jq kmod-nft-tproxy coreutils-base64 bind-dig dnsmasq-full'

# Установить xray-core вручную (его нет в стандартном репо OpenWrt 25.12)
# Скачать бинарник с https://github.com/XTLS/Xray-core/releases

# Установить пакеты (--allow-untrusted для локальных пакетов)
ssh root@<router-ip> 'apk add --allow-untrusted /tmp/podkop-xray_0.26.3.27-r0_all.apk'
ssh root@<router-ip> 'apk add --allow-untrusted /tmp/luci-app-podkop-xray_0.26.3.27-r0_all.apk'

# Проверить
ssh root@<router-ip> 'podkop-xray show_version'
# → 0.26.3.27-0
```

## CI/CD (GitHub Actions)

При пуше тега `v*` (например `v0.26.3.27-0`) автоматически запускается workflow `build-release.yml`:

1. Парсит версию из тега: `v0.26.3.27-0` → `VERSION=0.26.3.27`, `BUILD=0`
2. Собирает SDK образ
3. Компилирует APK пакеты
4. Создаёт GitHub Release с APK файлами

```sh
# Создать релиз
git tag v0.26.3.27-0
git push origin v0.26.3.27-0

# Следующий билд
git tag v0.26.3.27-1
git push origin v0.26.3.27-1
```

## Структура сборки

```
podkop-xray/
    Makefile                    # OpenWrt package definition (PKG_NAME, DEPENDS, install)
    Dockerfile-apk              # Docker build: копирует исходники в SDK, компилирует
    build-apk-local.sh          # Скрипт локальной сборки (version + build args)
    install.sh                  # One-line установщик для роутера
    sdk/
        Dockerfile-sdk-apk      # Базовый SDK образ с feeds и luci-base
    .github/workflows/
        build-release.yml       # CI: сборка APK + GitHub release на push тега
        update-geosite.yml      # CI: обновление geosite.dat каждые 6 часов
    luci-app-podkop-xray/
        Makefile                # LuCI package definition (LUCI_DEPENDS, install)
    bin/
        apk/                    # Результат сборки (.apk файлы, в .gitignore)
```

## Удаление

```sh
ssh root@<router-ip> 'apk del luci-app-podkop-xray podkop-xray'
```

UCI конфиг (`/etc/config/podkop-xray`) помечен как conffile — не удаляется при деинсталляции.
