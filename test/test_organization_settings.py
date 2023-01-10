import os
import re
import inspect

from ._common import print_page_error

def test_organization_settings(page_factory, project, launch_time, image_file, base_url):
    print("Going to organizations...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f"/organizations", wait_until='networkidle')
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
    # page.click('modal-dialog modal-close .modal__close')
    # #todo (without modal no "assert")
    # #wait for response, assert it is successful

    print("Testing invitation create...")
    url = base_url + "/rest/Invitations/" + str(organization_id)
    page.click('.heading-for-Invitation')
    page.click('.heading-for-Invitation .Nav-action')
    user_email = 'no-reply'+str(organization_id)+'@cvisionai.com'
    page.wait_for_selector('#itemDivId-Invitation-New button[value="Save"]')
    page.wait_for_timeout(1000)
    page.fill(f'#itemDivId-Invitation-New invitation-edit email-list-input input', user_email)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    with page.expect_response(lambda response: response.url==url and response.status==201) as response_info:
        page.keyboard.press("Enter")
        page.wait_for_timeout(1000)
        for _ in range(3):
            page.keyboard.press("Tab")
        page.keyboard.press("Enter")
    page.wait_for_selector(f'text="Successfully created 1 invitation."')
    # page.locator('modal-dialog modal-close .modal__close').click()
    # OK without modal check - response is required for next step
    response = response_info.value
    respObject = response.json()
    registration_link = str(respObject["message"]).replace('User can register at ', '')
    registration_link = re.sub(r'https?://.*?(/.*)', r'{base_url}\1', registration_link).format(base_url=base_url)
    new_user_id = respObject["id"]
    print("Invitation sent successful!")

    # Note: Existing user gets redirected to /organization, but new user gets form.
    if registration_link.find('accept') != -1:
        print(f"Accepting invitation at: {registration_link}")
        page.goto(registration_link, wait_until='networkidle')
        page.wait_for_url(f'{base_url}/organizations/')
    else:
        print(f"Register user and accept invitation at: {registration_link}")
        page.goto(registration_link, wait_until='networkidle')
        page.fill('text-input[name="First name"] input', 'First')
        page.fill('text-input[name="Last name"] input', 'Last')
        page.fill('text-input[name="Email address"] input', user_email)
        page.fill('text-input[name="Username"] input', 'NoReply2'+name) #username must be unique
        page.fill('text-input[name="Password"] input', '123!@#abc123')
        page.fill('text-input[name="Password (confirm)"] input', '123!@#abc123')
        page.fill('text-input[name="First name"] input', 'Name')
        page.click('input[type="submit"]')
        page.wait_for_selector(f'text="Continue"')

    page.goto(f'/{organization_id}/organization-settings', wait_until='networkidle')

    print("Confirming invitation status")
    page.click('.heading-for-Invitation')
    page.click(f'text="{user_email}"')
    page.wait_for_selector(f'#itemDivId-Invitation-{new_user_id} text-input[name="Status"] input')
    statusInputValue = page.eval_on_selector(f'#itemDivId-Invitation-{new_user_id} text-input[name="Status"] input', "i => i.value")
    print(statusInputValue)
    assert  statusInputValue == "Accepted"
    print("Invitation status shown as accepted!")

    print("Testing affiliation create...")
    url = base_url + "/rest/Affiliations/" + str(organization_id)
    page.click('.heading-for-Affiliation')
    page.click('.heading-for-Affiliation .Nav-action')
    page.fill('affiliation-edit user-input input', user_email+';')
    page.select_option(f'affiliation-edit enum-input[name="Permission"] select', label="Member")
    page.wait_for_selector('text="Name Last"')
    with page.expect_response(lambda response: response.url==url and response.status==201) as response_info:
        page.keyboard.press("Enter")
        page.wait_for_timeout(1000)
        for _ in range(3):
            page.keyboard.press("Tab")
        page.keyboard.press("Enter")
    page.wait_for_selector(f'text="Successfully created 1 affiliation."')
    response = response_info.value
    respObject = response.json()
    print(respObject)
    affiliationId = respObject["id"]
    # OK without modal close
    # page.click('modal-dialog modal-close .modal__close')
    print(f"Affiliation id {affiliationId} created!")

    print(f"Testing affiliation update...")
    page.wait_for_selector(f'div[id="itemDivId-Affiliation-{affiliationId}"]')
    page.select_option(f'div[id="itemDivId-Affiliation-{affiliationId}"] enum-input[name="Permission"] select', label="Admin")
    page.click(f'div[id="itemDivId-Affiliation-{affiliationId}"] input[type="submit"]')
    page.wait_for_selector(f'text=updated permissions updated to Admin!')
    # page.click('modal-dialog modal-close .modal__close')

    print("Testing aws bucket creation...")
    page.click('.heading-for-Bucket')
    page.click('.heading-for-Bucket .Nav-action')
    page.fill('bucket-edit text-input[name="Name"] input', f"Bucket for {name}")
    page.click('text="AWS"')
    page.fill('bucket-edit text-area[name="Config"] textarea', "{'aws_access_key_id': '123456', 'aws_secret_access_key': 'ABCDEFG', 'endpoint_url': 'https://www.google.com', 'region_name': 'Northeast'}")
    page.fill('bucket-edit text-input[name="Archive Storage Class"] input', "STANDARD")
    page.fill('bucket-edit text-input[name="Live Storage Class"] input', "STANDARD")
    url = base_url + "/rest/Buckets/" + str(organization_id)
    with page.expect_response(url) as response_info:
        page.click('bucket-edit button[value="Save"]')
        # page.wait_for_selector(f'text="Bucket 123456 created!"')
    response = response_info.value
    respObject = response.json()
    print(respObject)
    bucketId = respObject["id"]
    print(f"Created bucket id {bucketId}")
    # OK without modal close
    # page.click('modal-dialog modal-close .modal__close')

    print(f'Testing aws bucket editing...')
    page.click(f'text="Bucket for {name}"')
    page.click('role=radio[name="DEEP_ARCHIVE"]')
    page.fill(f'div[id="itemDivId-Bucket-{bucketId}"] text-area[name="Config"] textarea', "{'aws_access_key_id': 'NewKey654321', 'aws_secret_access_key': 'HIJKLMN', 'endpoint_url': 'https://www.bing.com', 'region_name': 'Southwest'}")
    page.click(f'div[id="itemDivId-Bucket-{bucketId}"] input[type="submit"]')
    page.wait_for_selector(f'text="Bucket {bucketId} updated successfully!"')
    page.click('modal-dialog modal-close .modal__close')

    print("Testing job cluster create...")
    url = base_url + "/rest/JobClusters/" + str(organization_id)
    page.click('.toggle-subitems-JobCluster')
    page.click('.heading-for-JobCluster .Nav-action')
    page.fill('div[id="itemDivId-JobCluster-New"] text-input[name="Name"] input', 'Test Cluster')
    page.fill('div[id="itemDivId-JobCluster-New"] text-input[name="Host"] input', 'host')
    page.fill('div[id="itemDivId-JobCluster-New"] text-input[name="Port"] input', '1236')
    page.fill('div[id="itemDivId-JobCluster-New"] text-input[name="Name"] input', 'TokenTest')
    page.fill('div[id="itemDivId-JobCluster-New"] text-area[name="Cert"] textarea', 'testing')
    with page.expect_response(url) as response_info:
        page.click('div[id="itemDivId-JobCluster-New"] button[value="Save"]')
        page.wait_for_selector(f'text="Successfully registered job cluster."')
        # page.click('modal-dialog modal-close .modal__close')
    response = response_info.value
    respObject = response.json()
    newClusterId = respObject["id"]
    print(f"Cluster id {newClusterId} created!")

    print("Testing job cluster edit...")
    page.fill(f'div[id="itemDivId-JobCluster-{newClusterId}"] text-input[name="Name"] input', 'Test Cluster Updated Name')
    url = base_url + "/rest/JobCluster/" + str(newClusterId)
    page.click(f'div[id="itemDivId-JobCluster-{newClusterId}"] input[type="submit"]')
    # page.wait_for_selector(f'text="Job Cluster {newClusterId} successfully updated!"')
    # page.click('modal-dialog modal-close .modal__close')
    # #todo (without modal no "assert")
    # #wait for response, assert it is successful
    print(f"Cluster id {newClusterId} updated!")
    page.close()
