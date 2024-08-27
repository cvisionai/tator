import os
import re
import inspect
import time
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

    # Organization Update Tests
    print("Testing organization update...")
    page.set_input_files('input[type="file"]', image_file)
    page.fill('text-input[name="Name"] input', f"{name} updated")
    page.click('input[type="submit"]')
    page.wait_for_selector(f'text="Organization {organization_id} updated successfully!"')
    print(f'Organization {organization_id} updated successfully!')

    # Invitation Tests
    print("Testing invitation create...")
    url = base_url + "/rest/Invitations/" + str(organization_id)
    page.click('#nav-for-Invitation #sub-nav--plus-link')
    user_email = 'no-reply'+str(organization_id)+'@cvisionai.com'
    page.wait_for_selector('org-type-invitation-container[form="invitation-edit"]')
    page.wait_for_timeout(1000)
    page.select_option(f'org-type-invitation-container[form="invitation-edit"] enum-input[name="Permission"] select', label="Member")
    page.fill(f'#invitation-edit--form email-list-input input', user_email)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    # with page.expect_response(lambda response: response.url==url and response.status==201) as response_info:
    page.keyboard.press("Enter")
    page.wait_for_timeout(1000)
    for _ in range(3):
        page.keyboard.press("Tab")
    page.click('org-type-invitation-container[form="invitation-edit"] input[type="submit"]')
    page.wait_for_timeout(1000)
    page.wait_for_selector("#invitation-edit--reg-link")
    registration_link = page.query_selector("#invitation-edit--reg-link").get_attribute("href")
    registration_link = re.sub(r'https?://.*?(/.*)', r'{base_url}\1', registration_link).format(base_url=base_url)
    new_user_id = page.query_selector('org-type-invitation-container[form="invitation-edit"] #type-form-id').inner_text()
    print(f'Invitation id {new_user_id} sent successfully!')

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
    page.click('#nav-for-Invitation')
    link = page.locator(".SideNav-subItem ").filter(has_text=f" {user_email}")
    link.click()
    page.wait_for_selector(f'org-type-invitation-container[form="invitation-edit"] text-input[name="Status"] input')
    statusInputValue = page.eval_on_selector(f'org-type-invitation-container[form="invitation-edit"] text-input[name="Status"] input', "i => i.value")
    print(statusInputValue)
    assert  statusInputValue == "Accepted"
    print("Invitation status shown as accepted!")

    # Multiple invitation Tests
    print("Testing 3+ invitations, with 1 repeat create...")
    url = base_url + "/rest/Invitations/" + str(organization_id)
    page.click('#nav-for-Invitation #sub-nav--plus-link')
    user_email1 = 'no-reply'+str(organization_id)+'1@cvisionai.com' # NEW
    user_email2 = 'no-reply'+str(organization_id)+'2@cvisionai.com' # NEW
    # user_email = 'no-reply'+str(organization_id)+'@cvisionai.com' # DUPE
    user_email3 = 'no-reply'+str(organization_id)+'3@cvisionai.com' # NEW
    user_email4 = 'no-reply'+str(organization_id)+'4@cvisionai.com' # NEW
    user_email5 = 'no-reply'+str(organization_id)+'5@cvisionai.com' # NEW
    page.wait_for_selector('org-type-invitation-container[form="invitation-edit"]')
    page.wait_for_timeout(1000)
    page.select_option(f'org-type-invitation-container[form="invitation-edit"] enum-input[name="Permission"] select', label="Member")
    page.fill(f'#invitation-edit--form email-list-input input', user_email1+';'+user_email2+';'+user_email+';'+user_email3+';'+user_email4+';'+user_email5+';')
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    # with page.expect_response(lambda response: response.url==url and response.status==201) as response_info:
    page.keyboard.press("Enter")
    page.wait_for_timeout(1000)
    for _ in range(3):
        page.keyboard.press("Tab")
    page.click('org-type-invitation-container[form="invitation-edit"] input[type="submit"]')
    page.wait_for_timeout(1000)
    page.wait_for_selector('text="Successfully added 5 Invitations."')
    print(f'Multiple invitations sent successfully! (Successfully added 5 Invitations. And Error for 1 pending did not interupt flow)')

    print("Testing affiliation create...")
    url = base_url + "/rest/Affiliations/" + str(organization_id)
    page.click('#nav-for-Affiliation')
    page.click('#nav-for-Affiliation #sub-nav--plus-link')
    page.fill('org-type-affiliate-container[form="affiliation-edit"] user-input input', user_email+';')
    page.select_option(f'org-type-affiliate-container[form="affiliation-edit"] enum-input[name="Org Permission"] select', label="Member")
    page.wait_for_selector('text="Name Last"')
    with page.expect_response(lambda response: response.url==url and response.status==201) as response_info:
        page.keyboard.press("Enter")
        page.wait_for_timeout(1000)
        for _ in range(3):
            page.keyboard.press("Tab")
        page.keyboard.press("Enter")
    page.wait_for_selector(f'text="Successfully added 1 Affiliation."')
    response = response_info.value
    respObject = response.json()
    print(respObject)
    affiliationId = respObject["id"]
    print(f"Affiliation id {affiliationId} created!")

    print(f"Testing affiliation update...")
    page.wait_for_timeout(1000)
    page.select_option(f'org-type-affiliate-container[form="affiliation-edit"] enum-input[name="Org Permission"] select', label="Admin")
    page.click(f'org-type-affiliate-container[form="affiliation-edit"] input[type="submit"]')
    page.wait_for_selector(f'text=updated permissions updated to Admin!')

    print("Testing bucket creation...")
    page.click('#nav-for-Bucket')
    page.click('#nav-for-Bucket #sub-nav--plus-link')
    page.fill('org-type-form-container[form="bucket-edit"] text-input[name="Name"] input', f"Bucket for {name}")
    page.click('text="AWS S3"')
    page.wait_for_selector(f'text="Deep Archive"')
    page.fill('org-type-form-container[form="bucket-edit"] text-area[name="Bucket access configuration JSON"] textarea', '{"aws_access_key_id": "123456", "aws_secret_access_key": "ABCDEFG", "endpoint_url": "https://www.google.com", "region_name": "Northeast"}')
    url = base_url + "/rest/Buckets/" + str(organization_id)
    with page.expect_response(lambda response: response.url==url) as response_info:
        page.click('org-type-form-container[form="bucket-edit"] input[value="Save"]')
    response = response_info.value
    respObject = response.json()
    bucketId = respObject["id"]
    print(f"Created bucket id {bucketId}")

    time.sleep(5)  # This is to allow the bucket to be created before testing the edit

    print(f'Testing bucket editing...')
    page.click('role=radio[name="Deep Archive"]')
    page.fill('org-type-form-container[form="bucket-edit"] text-area[name="Bucket access configuration JSON"] textarea', '{"aws_access_key_id": "NewKey654321", "aws_secret_access_key": "HIJKLMN", "endpoint_url": "https://www.bing.com", "region_name": "Southwest"}')
    page.click('org-type-form-container[form="bucket-edit"] input[type="submit"]')
    page.wait_for_selector(f'text="Bucket {bucketId} updated successfully!"')

    print("Testing job cluster create...")
    url = base_url + "/rest/JobClusters/" + str(organization_id)
    page.click('#nav-for-JobCluster')
    page.click('#nav-for-JobCluster #sub-nav--plus-link')
    page.fill('org-type-form-container[form="job-cluster-edit"] text-input[name="Name"] input', 'Test Cluster')
    page.fill('org-type-form-container[form="job-cluster-edit"] text-input[name="Host"] input', 'host')
    page.fill('org-type-form-container[form="job-cluster-edit"] text-input[name="Port"] input', '1236')
    page.fill('org-type-form-container[form="job-cluster-edit"] text-input[name="Name"] input', 'TokenTest')
    page.fill('org-type-form-container[form="job-cluster-edit"] text-area[name="Cert"] textarea', 'testing')

    with page.expect_response(lambda response: response.url==url) as response_info:
        page.click('org-type-form-container[form="job-cluster-edit"] input[value="Save"]')
    page.wait_for_selector(f'text="Successfully registered job cluster."')

    response = response_info.value
    respObject = response.json()
    newClusterId = respObject["id"]
    print(f"Cluster {newClusterId} created!") #id 

    print("Testing job cluster edit...")
    page.fill(f'org-type-form-container[form="job-cluster-edit"] text-input[name="Name"] input', 'Test Cluster Updated Name')
    url = base_url + "/rest/JobCluster/" + str(newClusterId)

    with page.expect_response(lambda response: response.url == url) as response_info:
        page.click(f'org-type-form-container[form="job-cluster-edit"] input[type="submit"]')
    page.wait_for_selector(f'text="Job Cluster {newClusterId} successfully updated!"')

    print(f"Cluster id {newClusterId} updated!")
    page.close()
