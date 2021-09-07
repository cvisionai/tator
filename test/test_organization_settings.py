import os
import time

from ._common import print_page_error

def test_organization_settings(authenticated, project, launch_time, image_file):
    print("Going to organizations...")
    page = authenticated.new_page()
    page.goto(f"/organizations")
    page.on("pageerror", print_page_error)
    name = f"test_front_end_{launch_time}"
    page.wait_for_selector(f'text="{name}"')
    summaries = page.query_selector_all('organization-summary')
    for summary in summaries:
        if summary.query_selector('h2').text_content() == name:
            link = summary.query_selector('a')
            href = link.get_attribute('href')
            organization_id = int(href.split('/')[-2])
            summary.click()
            break
    page.wait_for_url(f'/{organization_id}/organization-settings')
    print("Testing organization update...")
    page.set_input_files('input[type="file"]', image_file)
    page.fill('text-input[name="Name"] input', f"{name} updated")
    page.click('input[type="submit"]')
    page.wait_for_selector(f'text="Organization {organization_id} updated successfully!"')
    page.click('modal-close button')
    print("Testing affiliation create...")
    page.click('button[class="toggle-subitems-Affiliation]')
    page.click('text="+ Add new"')
    page.fill('user-input input', 'no-reply@cvisionai.com;')
    page.click('input[type="submit"]')
    page.wait_for_selector(f'text="Successfully created 1 affiliations."')
    page.click('modal-close button')
    print("Testing affiliation update...")
    
    
