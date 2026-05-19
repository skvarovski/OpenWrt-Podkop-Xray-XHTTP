#!/usr/bin/env bash
# Установка браузера для Playwright MCP (канал chrome).
# Playwright MCP ищет Chrome по пути /opt/google/chrome/chrome.
# Запуск:  ! bash install-playwright-browser.sh
# Шаг с --with-deps ставит системные библиотеки и потребует sudo (введите пароль).
set -euo pipefail

echo "==> Установка Google Chrome для Playwright (+ системные зависимости)"
if npx --yes playwright install --with-deps chrome; then
    if [ -x /opt/google/chrome/chrome ]; then
        echo "==> OK: Chrome установлен — /opt/google/chrome/chrome"
        /opt/google/chrome/chrome --version || true
        exit 0
    fi
fi

echo "==> Chrome не встал, пробую bundled Chromium"
npx --yes playwright install --with-deps chromium
echo "==> Chromium установлен. Если MCP настроен на канал 'chrome',"
echo "    переключите его на 'chromium' (или укажите путь к бинарю)."
npx --yes playwright install --dry-run chromium 2>/dev/null | grep -i "install location" || true
