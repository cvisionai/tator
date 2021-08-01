from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto('http://tatordemo.duckdns.org/2146/annotation/437900')
    page.on("pageerror", lambda err: print(err.message))
    page.fill('input[name="username"]', 'jon')
    page.fill('input[name="password"]', 'yomp2HOOK7sop-asdf')
    page.click('input[type="submit"]')
    page.wait_for_timeout(10000)
    page.screenshot(path='/home/jon/test.png')
    browser.close()
