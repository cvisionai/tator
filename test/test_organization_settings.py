import os
import time
import subprocess
import pytest
import requests

from ._common import print_page_error

def print_args(msg):
    for arg in msg.args:
        if arg.find("User can register ") > -1:
            print(f"FOUND:::: {arg}")

def test_organization_settings(authenticated, project, launch_time, image_file, base_url):
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
    page.click('modal-dialog modal-close .modal__close')

    print("Testing invitation create...")
    url = base_url + "/rest/Invitations/" + str(organization_id)
    page.click('.heading-for-Invitation')
    page.click('.heading-for-Invitation .Nav-action')
    page.fill('invitation-edit email-list-input input', 'no-reply2@cvisionai.com;')
    with page.expect_response(url) as response_info:
        page.click('invitation-edit button[value="Save"]')
        page.wait_for_selector(f'text="Successfully created 1 invitations."')
        page.click('modal-dialog modal-close .modal__close')
    response = response_info.value
    respObject = response.json()
    registration_link = str(respObject["message"]).replace('User can register at ', '')
    page.goto("https://" + registration_link)
    print("Invitation sent successful!")
    print(f"Confirming invitation at: https://{registration_link}")
    # page.fill('text-input[name="First name"]', 'First')
    # page.fill('text-input[name="Last name"]', 'Last')
    # page.fill('text-input[name="Email address"]', 'no-reply2@cvisionai.com')
    # page.fill('text-input[name="Username"]', 'NoReply2')
    # page.fill('text-input[name="Password"]', '123!@#abc123')
    # page.fill('text-input[name="Password (confirm)"]', '123!@#abc123')
    # page.click('input[type="First name"]')
    # page.click('input[type="submit"]')
    page.wait_for_url(f'{base_url}/organizations/')
    page.goto(f'/{organization_id}/organization-settings')

    print("Testing affiliation create...")
    url = base_url + "/rest/Affiliations/" + str(organization_id)
    page.click('.heading-for-Affiliation')
    page.click('.heading-for-Affiliation .Nav-action')
    page.fill('affiliation-edit user-input input', 'no-reply2@cvisionai.com;')
    page.select_option(f'affiliation-edit enum-input[name="Permission"] select', label="Member")
    with page.expect_response(url) as response_info:
        page.click('affiliation-edit button[value="Save"]')
        page.wait_for_selector(f'text="Successfully created 1 affiliations."')
    response = response_info.value
    respObject = response.json()
    affiliationId = respObject["id"]
    page.click('modal-dialog modal-close .modal__close')
    print(f"Affiliation id {affiliationId} created!")

    print(f"Testing affiliation update...")
    page.wait_for_selector(f'div[id="itemDivId-Affiliation-{affiliationId}"]')
    page.select_option(f'div[id="itemDivId-Affiliation-{affiliationId}"] enum-input[name="Permission"] select', label="Admin")
    page.click(f'div[id="itemDivId-Affiliation-{affiliationId}"] input[type="submit"]')
    page.wait_for_selector(f'text=updated permissions updated to Admin!')
    page.click('modal-dialog modal-close .modal__close')

    print("Testing aws bucket creation...")
    page.click('.heading-for-Bucket')
    page.click('.heading-for-Bucket .Nav-action')
    page.fill('bucket-edit text-input[name="Name"] input', f"Bucket for {name}")
    page.click('text="AWS"')
    page.wait_for_selector(f'text="Access Key"')
    page.fill('bucket-edit text-input[name="Access Key"] input', f"123456")
    page.fill('bucket-edit text-input[name="Secret Key"] input', f"ABCDEFG")
    page.fill('bucket-edit text-input[name="Endpoint URL"] input', f"https://www.google.com/")
    page.fill('bucket-edit text-input[name="Region"] input', f"Northeast")
    page.fill('bucket-edit text-input[name="Archive Storage Class"] input', f"STANDARD")
    page.fill('bucket-edit text-input[name="Live Storage Class"] input', f"STANDARD")
    url = base_url + "/rest/Buckets/" + str(organization_id)
    with page.expect_response(url) as response_info:
        page.click('bucket-edit button[value="Save"]')
        page.wait_for_selector(f'text="Bucket 123456 created!"')
    response = response_info.value
    respObject = response.json()
    bucketId = respObject["id"]
    print(f"Created bucket id {bucketId}")
    page.click('modal-dialog modal-close .modal__close')

    print(f'Testing aws bucket editing...')
    page.fill(f'div[id="itemDivId-Affiliation-{bucketId}"] text-input[name="Access Key"] input', f"NewKey654321")
    page.click('input[type="submit"]')
    page.wait_for_selector(f'text="Bucket {bucketId} updated successfully!"')

    print("Testing gcs bucket creation (partial)...")
    print("Testing job cluster create...")
    print("Testing job cluster edit...")

    
    
