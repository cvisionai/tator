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
    registration_link = re.sub(r'https?://.*?(/.*)', r'{base_url}\2', registration_link)
    new_user_id = respObject["id"]
    print("Invitation sent successful!")

    # Note: Existing user gets redirected to /organization, but new user gets form.
    print(registration_link)
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
        # page.wait_for_selector(f'text="Bucket 123456 created!"')
    response = response_info.value
    respObject = response.json()
    print(respObject)
    bucketId = respObject["id"]
    print(f"Created bucket id {bucketId}")
    # OK without modal close
    # page.click('modal-dialog modal-close .modal__close')

    print(f'Testing aws bucket editing...')
    page.fill(f'div[id="itemDivId-Bucket-{bucketId}"] text-input[name="Access Key"] input', f"NewKey654321")
    page.click(f'div[id="itemDivId-Bucket-{bucketId}"] input[type="submit"]')
    page.wait_for_selector(f'text="Bucket {bucketId} updated successfully!"')
    # page.click('modal-dialog modal-close .modal__close')

    print("Testing gcs bucket creation (partial)...")
    page.click('.heading-for-Bucket .Nav-action')
    page.fill('div[id="itemDivId-Bucket-New"] text-input[name="Name"] input', f"Bucket GCS Testing")
    page.click('text="GCS"')
    page.wait_for_selector(f'text="GCS Key Info"')
    page.fill('div[id="itemDivId-Bucket-New"] text-input[name="Archive Storage Class"] input', f"STANDARD")
    page.fill('div[id="itemDivId-Bucket-New"] text-input[name="Live Storage Class"] input', f"STANDARD")
    # gcsKeyJSONstring = '{"auth_provider_x509_cert_url":"https://www.google.com/","auth_uri":"https://www.google.com/","client_email":"test@test.com","client_id":"123456789","client_x509_cert_url":"https://www.google.com/","private_key":"-----BEGIN RSA PRIVATE KEY-----\nProc-Type: 4,ENCRYPTED\nDEK-Info: DES-EDE3-CBC,68A2F29F585C18F1\n\npPjs9/7JfPmeAFhtLB0CzPkU+BIvvVjjeo0+TjZu13fwnrRT8iU1QCWdjaeMxLIa\nix5wXNm9EUN1fqt+Ke1QP8fJCWZ3f8Gw453MiuYsSu+plS66GZNqahUNup9YatI3\nnAruGni0c6bu4jVwTqbd9+OvodgszcXp7/1FjMfrrMsFLGqt5wAIjaUtxxGE1IDi\nAN4qCfICOMLT+9wJQD0OR4FpHuJ+1fm+6wN1/Rx8XtrAyidpvYIvjwz5CZfn1usU\nWPpZ0LIuuM8/0U4aXTKY5tiWoPRLWB00Vt6vbmcTpI3T77E9DQ7A6ACChwbjmNXv\nc/SoWVUwBj1+sDk4y7ZuKba8K3rQBCu8QnG9RSA0U+E8Fwc8awUKHNf5lmXLSsAr\ntwMWwNBawE4A+835lIgYDiOqnjXLcGBkYdVboW4FoVKT1JMRzCV5kFaSYez+5XUX\n9kcq5p3shzTnxiaiDvBJcExVtSNA+xXRsjtceml39Gt+neVe4xNSMdutKuiIVNX9\nF9xGBDtcu7nhs5Frh9fBcGmHGWG5LZ19Af1sejwzKmZMuSf54DIxfL+/cnNM5IE3\nJU2Dtmb3+fearZx1VnUnawKdGATPMn/TtpLT0nUtxl0vBH1sei99MyklfPjJDiMq\nbex+8oa7Pb1bYUOtxcqPhieY7BnzYAkS06frUXhZz0hssq+mSjT5AGWGRpC2j+M4\nWOXRVc/p6YxqcAsCmq8/zhW6jht6SFV+3Kl7t1LhIyUl2soesUoouftBYo0R4q6Y\neGxpFex59LIj5dh08unURymYL9FKEbqzUCrHh6NuXKCYPoAOV7UU5eTl0Be9iZoE\nzSlI0OtGsLeWxIRKZeLKMnezw30hBgBGivlG5LF/HUEA10pF4l63QGnS1h28nXpa\nj4epQzNjCPMI1A3ZB2b2woya+OSj7yjm4VXD9xfDJJx380irG24rrARgpdV91zTk\nqThv3rTO2JfMCF/tQbD2l4JrOnyrOf7CwrvGryf2LHy2H+sEHFRt2ZKIxg1T14Sc\nOAGLkRsAE7TPr9L+NkGtvbPWXIvEfy899c+xQZ2pQKi4grC4Vt6hzspMu8ZkaTs2\n0Jzz70SAzTZpkrK5fSEoHTgzpW1+mFYWPHYJ8Mrk1m6gGczhSG8sDN6yYUms79N0\nDhqiduq31owj8u7Y0N9CmrL4n2zVsOdR3hXbotfJDEDmCrzf3fd4Kzzh0vGFcNOP\nI3huRXFsb+GJwk+q63M8UKIY5lxxJmvviCqOkSGxMHWtHcb+xo/1ijmLrplyAhjk\nTBPT5Coxy5iSGqTxTDURItHnCHcgBN+7iBEUPtbzyx5fS7ZWRQXD+n3FY2mX2fCC\nlA5nkuV/YD6ij7dIKFnZ7kvu6xVjoNLn75CU/b90ratO5QwF57BaONshyIoQdBt7\nOXO72z8GqwZMViNoCRbYdUHOHw5XEx33lLJXmmFIsHUhFB6MD+sv4IllP0Q7F4Ls\n0UOmzg8tn6X9kswGDO2+q2qFSkBQLzmF/Sy2GSknj3Y0IIIUQrsQBRlVKtYsTBq+\ncUMJY0pciFveqarcB0210cpImT7cZoWSOYl9cUrA37MDjMFYEUvXdQ==\n-----END RSA PRIVATE KEY-----","private_key_id":"123456789","project_id":"1","token_uri":"https://www.google.com/","type":"service_account"}'
    # page.fill('div[id="itemDivId-Bucket-New"] text-area[name="GCS Key Info"] textarea', gcsKeyJSONstring)
    page.fill('div[id="itemDivId-Bucket-New"] text-area[name="GCS Key Info"] textarea', '{"auth_provider_x509_cert_url":"https://www.google.com/","auth_uri":"https://www.google.com/","client_email":"test@test.com","client_id":"123456789","client_x509_cert_url":"https://www.google.com/","private_key":"-----BEGIN RSA PRIVATE KEY-----\nProc-Type: 4,ENCRYPTED\nDEK-Info: DES-EDE3-CBC,68A2F29F585C18F1\n\npPjs9/7JfPmeAFhtLB0CzPkU+BIvvVjjeo0+TjZu13fwnrRT8iU1QCWdjaeMxLIa\nix5wXNm9EUN1fqt+Ke1QP8fJCWZ3f8Gw453MiuYsSu+plS66GZNqahUNup9YatI3\nnAruGni0c6bu4jVwTqbd9+OvodgszcXp7/1FjMfrrMsFLGqt5wAIjaUtxxGE1IDi\nAN4qCfICOMLT+9wJQD0OR4FpHuJ+1fm+6wN1/Rx8XtrAyidpvYIvjwz5CZfn1usU\nWPpZ0LIuuM8/0U4aXTKY5tiWoPRLWB00Vt6vbmcTpI3T77E9DQ7A6ACChwbjmNXv\nc/SoWVUwBj1+sDk4y7ZuKba8K3rQBCu8QnG9RSA0U+E8Fwc8awUKHNf5lmXLSsAr\ntwMWwNBawE4A+835lIgYDiOqnjXLcGBkYdVboW4FoVKT1JMRzCV5kFaSYez+5XUX\n9kcq5p3shzTnxiaiDvBJcExVtSNA+xXRsjtceml39Gt+neVe4xNSMdutKuiIVNX9\nF9xGBDtcu7nhs5Frh9fBcGmHGWG5LZ19Af1sejwzKmZMuSf54DIxfL+/cnNM5IE3\nJU2Dtmb3+fearZx1VnUnawKdGATPMn/TtpLT0nUtxl0vBH1sei99MyklfPjJDiMq\nbex+8oa7Pb1bYUOtxcqPhieY7BnzYAkS06frUXhZz0hssq+mSjT5AGWGRpC2j+M4\nWOXRVc/p6YxqcAsCmq8/zhW6jht6SFV+3Kl7t1LhIyUl2soesUoouftBYo0R4q6Y\neGxpFex59LIj5dh08unURymYL9FKEbqzUCrHh6NuXKCYPoAOV7UU5eTl0Be9iZoE\nzSlI0OtGsLeWxIRKZeLKMnezw30hBgBGivlG5LF/HUEA10pF4l63QGnS1h28nXpa\nj4epQzNjCPMI1A3ZB2b2woya+OSj7yjm4VXD9xfDJJx380irG24rrARgpdV91zTk\nqThv3rTO2JfMCF/tQbD2l4JrOnyrOf7CwrvGryf2LHy2H+sEHFRt2ZKIxg1T14Sc\nOAGLkRsAE7TPr9L+NkGtvbPWXIvEfy899c+xQZ2pQKi4grC4Vt6hzspMu8ZkaTs2\n0Jzz70SAzTZpkrK5fSEoHTgzpW1+mFYWPHYJ8Mrk1m6gGczhSG8sDN6yYUms79N0\nDhqiduq31owj8u7Y0N9CmrL4n2zVsOdR3hXbotfJDEDmCrzf3fd4Kzzh0vGFcNOP\nI3huRXFsb+GJwk+q63M8UKIY5lxxJmvviCqOkSGxMHWtHcb+xo/1ijmLrplyAhjk\nTBPT5Coxy5iSGqTxTDURItHnCHcgBN+7iBEUPtbzyx5fS7ZWRQXD+n3FY2mX2fCC\nlA5nkuV/YD6ij7dIKFnZ7kvu6xVjoNLn75CU/b90ratO5QwF57BaONshyIoQdBt7\nOXO72z8GqwZMViNoCRbYdUHOHw5XEx33lLJXmmFIsHUhFB6MD+sv4IllP0Q7F4Ls\n0UOmzg8tn6X9kswGDO2+q2qFSkBQLzmF/Sy2GSknj3Y0IIIUQrsQBRlVKtYsTBq+\ncUMJY0pciFveqarcB0210cpImT7cZoWSOYl9cUrA37MDjMFYEUvXdQ==\n-----END RSA PRIVATE KEY-----","private_key_id":"123456789","project_id":"1","token_uri":"https://www.google.com/","type":"service_account"}')
    url = base_url + "/rest/Buckets/" + str(organization_id)
    with page.expect_response(url) as response_info:
        page.click('div[id="itemDivId-Bucket-New"] button[value="Save"]')
    response = response_info.value
    # respObject = response.json()
    # print(respObject)
    # bucketId = respObject["id"]
    # page.wait_for_selector('text="Password was not given but private key is encrypted"')
    # print(f"Created bucket id {bucketId}")
    page.wait_for_selector('text=" Error"')
    page.click('modal-dialog modal-close .modal__close')
    print(f"Hit GCS endpoint success.")

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
