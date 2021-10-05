import os
import time


from ._common import print_page_error

## Status: In progress
# Goals:
# - Edited: Project; Todo: Assert changes stick single edits
# - Create, Assert & Edit: Media Type-Image, Media Type-Video, Media Type-MultiView
# - Create, Assert & Edit: Localization Type-Box, Localization Type-Dot, Localization Type-Line, [Localization Type-Poly]
# - State Type
# - Membership
# - Versions
# - Algorithm
# - Created, Edited, Cloned & Edit (Assert all steps) - 7 Attribute types
def test_settings_projectEdit(authenticated, project, image_file):
    print("Project Settings Main Tests...")
    page = authenticated.new_page()
    page.goto(f"/{project}/project-settings")
    page.on("pageerror", print_page_error)

    # Update All Project information
    print("Editing project info via Project Settings")
    page.wait_for_selector('project-main-edit')
    page.fill('project-main-edit text-input[name="Name"] input', 'Updated Name ' + str(project))
    page.set_input_files('input[type="file"]', image_file)
    page.fill('project-main-edit text-input[name="Summary"] input', 'Updated Description...')
    page.click('project-main-edit label[for="off"]')
    page.click('project-main-edit input[type="submit"]')
    page.wait_for_selector(f'text="Project {project} updated successfully!"')
    print(f"Project {project} updated successfully!")
    page.click('modal-dialog modal-close .modal__close')


def test_settings_mediaTypes(authenticated, project):
    print("Media Types Tests...")
    page = authenticated.new_page()
    page.goto(f"/{project}/project-settings")
    page.on("pageerror", print_page_error)

    print("Start: Creating Media Types via Project Settings")
    # Create Media types ##todo why are multiple of each being created?
    page.click('.heading-for-MediaType .Nav-action')
    page.fill('#itemDivId-MediaType-New text-input[name="Name"] input', 'My Video Type')
    page.select_option('#itemDivId-MediaType-New enum-input[name="Data Type"] select', label='Video')
    page.fill('#itemDivId-MediaType-New text-input[name="Description"] input', 'Media description for automated test.')
    page.fill('#itemDivId-MediaType-New text-input[name="Default volume"] input', '50')
    page.click('#itemDivId-MediaType-New bool-input[name="Visible"] label[for="on"]')
    page.click('#itemDivId-MediaType-New button[value="Save"]')
    page.wait_for_selector(f'text="Media type created successfully!"')
    print(f"Video Media type created successfully!")
    page.click('modal-dialog modal-close .modal__close')
    page.click('.heading-for-MediaType .Nav-action')
    page.fill('#itemDivId-MediaType-New text-input[name="Name"] input', 'My Image Type')
    page.select_option('#itemDivId-MediaType-New enum-input[name="Data Type"] select', label='Image')
    page.fill('#itemDivId-MediaType-New text-input[name="Description"] input', 'Media description for automated test.')
    page.fill('#itemDivId-MediaType-New text-input[name="Default volume"] input', '50')
    page.click('#itemDivId-MediaType-New bool-input[name="Visible"] label[for="on"]')
    page.click('#itemDivId-MediaType-New button[value="Save"]')
    page.wait_for_selector(f'text="Media type created successfully!"')
    print(f"Image Media type created successfully!")
    page.click('modal-dialog modal-close .modal__close')
    page.click('.heading-for-MediaType .Nav-action')
    page.fill('#itemDivId-MediaType-New text-input[name="Name"] input', 'My Multiview Type')
    page.select_option('#itemDivId-MediaType-New enum-input[name="Data Type"] select', label='Multiview')
    page.fill('#itemDivId-MediaType-New text-input[name="Description"] input', 'Media description for automated test.')
    page.fill('#itemDivId-MediaType-New text-input[name="Default volume"] input', '50')
    page.click('#itemDivId-MediaType-New bool-input[name="Visible"] label[for="on"]')
    page.click('#itemDivId-MediaType-New button[value="Save"]')
    page.wait_for_selector(f'text="Media type created successfully!"')
    page.click('modal-dialog modal-close .modal__close')
    print(f"Multiview Media type created successfully!")
    
def test_settings_localizationTypes(authenticated, project):
    print("Localization Types Tests...")
    page = authenticated.new_page()
    page.goto(f"/{project}/project-settings")
    page.on("pageerror", print_page_error)

    # Create Localization types
    page.click('.heading-for-LocalizationType .Nav-action')
    page.fill('#itemDivId-LocalizationType-New text-input[name="Name"] input', 'Auto Box Type')
    page.select_option('#itemDivId-LocalizationType-New enum-input[name="Data Type"] select', label='Box')
    page.fill('#itemDivId-LocalizationType-New text-input[name="Description"] input', 'Loc Type description for automated test.')
    # page.click('#itemDivId-LocalizationType-New text-input[type="color"]')
    # page.fill('#itemDivId-LocalizationType-New text-input[type="color"] input', '#FF69B4')
    page.click('#itemDivId-LocalizationType-New bool-input[name="Visible"] label[for="on"]')
    page.click('#itemDivId-LocalizationType-New bool-input[name="Drawable"] label[for="on"]')
    page.fill('#itemDivId-LocalizationType-New text-input[name="Line Width"] input', '5')
    page.click('#itemDivId-LocalizationType-New bool-input[name="Grouping Default"] label[for="on"]')
    page.click('#itemDivId-LocalizationType-New span:text("Test Images")')
    page.click('#itemDivId-LocalizationType-New button[value="Save"]')
    page.wait_for_selector(f'text="Localization type created successfully!"')
    page.click('modal-dialog modal-close .modal__close')
    print(f"Box - Localization type created successfully!!")
    
    page.click('.heading-for-LocalizationType .Nav-action')
    page.fill('#itemDivId-LocalizationType-New text-input[name="Name"] input', 'Auto Line Type')
    page.select_option('#itemDivId-LocalizationType-New enum-input[name="Data Type"] select', label='Line')
    page.fill('#itemDivId-LocalizationType-New text-input[name="Description"] input', 'Loc Type description for automated test.')
    # page.click('#itemDivId-LocalizationType-New text-input[type="color"]')
    # page.fill('#itemDivId-LocalizationType-New text-input[type="color"] input', '#FF69B4')
    page.click('#itemDivId-LocalizationType-New bool-input[name="Visible"] label[for="on"]')
    page.click('#itemDivId-LocalizationType-New bool-input[name="Drawable"] label[for="on"]')
    page.fill('#itemDivId-LocalizationType-New text-input[name="Line Width"] input', '5')
    page.click('#itemDivId-LocalizationType-New bool-input[name="Grouping Default"] label[for="on"]')
    page.click('#itemDivId-LocalizationType-New span:text("Test Images")')
    page.click('#itemDivId-LocalizationType-New button[value="Save"]')
    page.wait_for_selector(f'text="Localization type created successfully!"')
    page.click('modal-dialog modal-close .modal__close')
    print(f"Line - Localization type created successfully!!")
    
    page.click('.heading-for-LocalizationType .Nav-action')
    page.fill('#itemDivId-LocalizationType-New text-input[name="Name"] input', 'Auto Dot Type')
    page.select_option('#itemDivId-LocalizationType-New enum-input[name="Data Type"] select', label='Dot')
    page.fill('#itemDivId-LocalizationType-New text-input[name="Description"] input', 'Loc Type description for automated test.')
    # page.click('#itemDivId-LocalizationType-New text-input[type="color"]')
    # page.fill('#itemDivId-LocalizationType-New text-input[type="color"] input', '#FF69B4')
    page.click('#itemDivId-LocalizationType-New bool-input[name="Visible"] label[for="on"]')
    page.click('#itemDivId-LocalizationType-New bool-input[name="Drawable"] label[for="on"]')
    page.fill('#itemDivId-LocalizationType-New text-input[name="Line Width"] input', '5')
    page.click('#itemDivId-LocalizationType-New bool-input[name="Grouping Default"] label[for="on"]')
    page.click('#itemDivId-LocalizationType-New span:text("Test Images")')
    page.click('#itemDivId-LocalizationType-New button[value="Save"]')
    page.wait_for_selector(f'text="Localization type created successfully!"')
    page.click('modal-dialog modal-close .modal__close')
    print(f"Dot - Localization type created successfully!!")

def test_settings_leafType(authenticated, project):
    print("Leaf Type Tests...")
    page = authenticated.new_page()
    page.goto(f"/{project}/project-settings")
    page.on("pageerror", print_page_error)

    # Create Leaf type
    page.click('.heading-for-LeafType .Nav-action')
    page.fill('#itemDivId-LeafType-New text-input[name="Name"] input', 'Testing Leaf')
    page.fill('#itemDivId-LeafType-New text-input[name="Description"] input', 'Leaf Type description for automated test.')
    page.click('#itemDivId-LeafType-New button[value="Save"]')
    page.wait_for_selector(f'text="Leaf type created successfully!"')
    page.click('modal-dialog modal-close .modal__close')
    print(f"Leaf type created successfully!!")

def test_settings_stateTypes(authenticated, project):
    print("State Type Tests...")
    page = authenticated.new_page()
    page.goto(f"/{project}/project-settings")
    page.on("pageerror", print_page_error)

    # Create State types #todo hitting error with media values sent as "[None, None]"
    page.click('.heading-for-StateType .Nav-action')
    page.fill('#itemDivId-StateType-New text-input[name="Name"] input', 'Alabama')
    page.fill('#itemDivId-StateType-New text-input[name="Description"] input', 'State Type description for automated test.')
    page.click('#itemDivId-StateType-New bool-input[name="Visible"] label[for="on"]')
    page.click('#itemDivId-StateType-New bool-input[name="Grouping Default"] label[for="on"]')
    page.click('#itemDivId-StateType-New span:text("My Video Type")')
    page.click('#itemDivId-StateType-New span:text("My Image Type")')
    page.select_option('#itemDivId-StateType-New enum-input[name="Association"] select', label='Localization')
    page.select_option('#itemDivId-StateType-New enum-input[name="Interpolation"] select', label='Latest')
    page.click('#itemDivId-StateType-New bool-input[name="Delete Child Localizations"] label[for="on"]')
    page.click('#itemDivId-StateType-New button[value="Save"]')
    page.click('modal-dialog modal-close .modal__close')
    page.wait_for_selector(f'text="State type created successfully!"')
    print(f"State type created successfully - Association: Localization, Interpolation: Latest")

    page.click('.heading-for-StateType .Nav-action')
    page.fill('#itemDivId-StateType-New text-input[name="Name"] input', 'Alabama')
    page.fill('#itemDivId-StateType-New text-input[name="Description"] input', 'State Type description for automated test.')
    page.click('#itemDivId-StateType-New bool-input[name="Visible"] label[for="on"]')
    page.click('#itemDivId-StateType-New bool-input[name="Grouping Default"] label[for="on"]')
    page.click('#itemDivId-StateType-New span:text("My Video Type")')
    page.click('#itemDivId-StateType-New span:text("My Image Type")')
    page.select_option('#itemDivId-StateType-New enum-input[name="Association"] select', label='Media')
    page.select_option('#itemDivId-StateType-New enum-input[name="Interpolation"] select', label='Latest')
    page.click('#itemDivId-StateType-New bool-input[name="Delete Child Localizations"] label[for="on"]')
    page.click('#itemDivId-StateType-New button[value="Save"]')
    page.wait_for_selector(f'text="State type created successfully!"')
    page.click('modal-dialog modal-close .modal__close')
    print(f"State type created successfully - Association: Media, Interpolation: Latest")
    
    page.click('.heading-for-StateType .Nav-action')
    page.fill('#itemDivId-StateType-New text-input[name="Name"] input', 'Alabama')
    page.fill('#itemDivId-StateType-New text-input[name="Description"] input', 'State Type description for automated test.')
    page.click('#itemDivId-StateType-New bool-input[name="Visible"] label[for="on"]')
    page.click('#itemDivId-StateType-New bool-input[name="Grouping Default"] label[for="on"]')
    page.click('#itemDivId-StateType-New span:text("My Video Type")')
    page.click('#itemDivId-StateType-New span:text("My Image Type")')
    page.select_option('#itemDivId-StateType-New enum-input[name="Association"] select', label='Frame')
    page.select_option('#itemDivId-StateType-New enum-input[name="Interpolation"] select', label='Latest')
    page.click('#itemDivId-StateType-New bool-input[name="Delete Child Localizations"] label[for="on"]')
    page.click('#itemDivId-StateType-New button[value="Save"]')
    page.click('modal-dialog modal-close .modal__close')
    page.wait_for_selector(f'text="State type created successfully!"')
    print(f"State type created successfully - Association: Frame, Interpolation: Latest")


# def test_settings_projectMemberships(authenticated, project):
#     print("Membership Tests...")
#     page = authenticated.new_page()
#     page.goto(f"/{project}/project-settings")
#     page.on("pageerror", print_page_error)

#     # Test memberships
#     page.click('.heading-for-Membership')
#     page.wait_for_selector('.subitems-Membership .SideNav-subItem >> nth=1')
#     subItem = page.query_selector('.subitems-Membership >> nth=1')
#     username = subItem.inner_text()
#     page.click('.heading-for-Membership .Nav-action')

#     page.fill('#itemDivId-Membership-New input[placeholder="Enter semicolon delimited usernames or email addresses..."]', username+';')
#     page.select_option('#itemDivId-Membership-New enum-input[name="Default version"] select', label='Test Version')
#     page.click('#itemDivId-Membership-New button[value="Save"]')
#     # page.wait_for_selector('text="Failed to create 0 memberships."')
#     page.wait_for_selector('text="Failed to create 1 memberships. Membership already exists for project."')
#     page.click('modal-dialog modal-close .modal__close')
#     print(f"Membership endpoint hit successfully!")

#     subItem.click()
#     formSelector = subItem.get_attribute("href")
#     memberId = formSelector.replace("#itemDivId-Membership-", "")
#     page.wait_for_selector(f'{formSelector} enum-input name="Version"')
#     page.select_option(f'{formSelector} enum-input[name="Version"] select', label='Baseline')
#     page.click(f'{formSelector} button[value="Save"]')
#     page.wait_for_selector(f'text="Membership {memberId} successfully updated!"')
#     page.click('modal-dialog modal-close .modal__close')
#     print(f"Membershipship id {memberId} updated successfully!")

def test_settings_versionTests(authenticated, project):
    print("Version Settings Tests...")
    page = authenticated.new_page()
    page.goto(f"/{project}/project-settings")
    page.on("pageerror", print_page_error)

    # Test Version type
    page.click('.heading-for-Version .Nav-action')
    page.fill('#itemDivId-Version-New text-input[name="Name"] input', 'New Version')
    page.fill('#itemDivId-Version-New text-input[name="Description"] input', 'Version description for automated test.')
    page.click('#itemDivId-Version-New bool-input[name="Show Empty"] label[for="on"]')
    page.check('#itemDivId-Version-New checkbox-input[name="Baseline"] input')
    page.click('#itemDivId-Version-New button[value="Save"]')
    page.wait_for_selector(f'text="Created version successfully!"')
    print(f"Version created successfully!!")
    page.click('modal-dialog modal-close .modal__close')

def test_settings_algorithmTests(authenticated, project, base_url, yaml_file):
    print("Algorithm Settings Tests...")
    page = authenticated.new_page()
    
    # Requires Cluster
    # - Find org ID first
    url = base_url + "/rest/Project/" + str(project)
    with page.expect_response(url) as response_info:
        page.goto(f"/{project}/project-settings")
        page.on("pageerror", print_page_error)
    response = response_info.value
    respObject = response.json()
    organization_id = respObject["organization"]
    print(f"Found Organization id = {organization_id}")
    page.goto(f"/{organization_id}/organization-settings")

    # Creating cluster
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
        page.click('modal-dialog modal-close .modal__close')
    response = response_info.value
    respObject = response.json()
    newClusterId = respObject["id"]
    print(f"Cluster id {newClusterId} created!")

    # Back to settings
    page.goto(f"/{project}/project-settings")

    # Test Algorithm Type
    page.wait_for_selector('.heading-for-Algorithm .Nav-action')
    page.click('.heading-for-Algorithm .Nav-action')
    page.wait_for_selector('#itemDivId-Algorithm-New text-input[name="Name"]')
    page.fill('#itemDivId-Algorithm-New text-input[name="Name"] input', 'New Algorithm')
    page.fill('#itemDivId-Algorithm-New text-input[name="Description"] input', 'Algorithm description for automated test.')
    
    url = base_url + "/rest/SaveAlgorithmManifest/" + str(project)
    with page.expect_response(url) as response_info:
        page.set_input_files('#itemDivId-Algorithm-New input[type="file"]', yaml_file)

    page.fill('#itemDivId-Algorithm-New text-input[name="Files Per Job"] input', '100')
    page.click('#itemDivId-Algorithm-New button[value="Save"]')
    page.wait_for_selector('text="Successfully registered algorithm argo workflow."')
    page.click('modal-dialog modal-close .modal__close')
    print(f"Successfully registered algorithm argo workflow!")

def test_settings_attributeTests(authenticated, project):
    print("Attribute Settings Tests...")
    page = authenticated.new_page()
    page.goto(f"/{project}/project-settings")
    page.on("pageerror", print_page_error)

    # All Attr types
    dtypeSet = {"bool","int","float","string","datetime","geopos"} # bug with "enum" TODO

    # Add Attribute Types
    page.click('.heading-for-MediaType')
    page.wait_for_selector('text="Test Images"')
    page.click('text="Test Images"')
    imageTypeLink = page.query_selector('text="Test Images"')
    formSelector = imageTypeLink.get_attribute("href")

    for dtype in dtypeSet:      
        page.click(f'{formSelector} .add-new-in-form')
        page.wait_for_selector('modal-dialog form')
        page.fill('modal-dialog text-input[name="Name"] input', dtype+' Type')
        page.select_option(f'modal-dialog enum-input[name="Data Type"] select', dtype)
        page.fill('modal-dialog text-input[name="Description"] input', 'Attr description for automated test.')
        if dtype == 'enum':
            #requires choices
            page.wait_for_selector('text="Enum Choices"')
            page.click('text="+ Add New"')
            page.fill('modal-dialog array-input[name="Label"] text-input input', "One")
            page.fill('modal-dialog array-input[name="Value"] text-input input', "1")
            page.check('modal-dialog input[name="enum-default"]')
        page.click('modal-dialog input[type="submit"]')
        page.wait_for_selector(f'text="New attribute type \'{dtype} Type\' added"')
        page.click('modal-dialog modal-close .modal__close')
        print(f"New {dtype} type attribute added to Image!")

    # Edit Attribute Types
    print("Editing Atributes...")
    page.click(f'{formSelector} .toggle-attribute h2')

    #open the attribute forms
    dtypeSet = {"Test Bool","Test Int","Test Float","Test String","Test Enum","Test Datetime","Test Geoposition"}
    for dtypeName in dtypeSet:
        page.click(f'text="{dtypeName}"')
        page.fill(f'attributes-form[data-old-name="{dtypeName}"] text-input[name="Name"] input', dtypeName + ' updated')
        print(f"Edited {dtypeName}")
    
    print("Submitting dtype edits")
    page.click(f'{formSelector} input[type="submit"]')
    page.wait_for_selector('modal-dialog div input[type="checkbox"]')
    successMessages = page.query_selector_all('modal-dialog div input[type="checkbox"]')

    print(f'Confirm global changes for: {len(successMessages)} attributes')
    assert len(successMessages) > 0 # == 7

    page.click('text="Confirm"')

    page.wait_for_selector('modal-dialog modal-success')
    successMessages = page.query_selector_all('modal-dialog modal-success')

    print(f'Changes saved successfully for: {len(successMessages)} attributes')
    assert len(successMessages) == 7

    page.click('modal-dialog modal-close .modal__close')



def test_settings_projectDelete(authenticated, project):
    page = authenticated.new_page()
    page.goto(f"/{project}/project-settings")
    page.on("pageerror", print_page_error)

    # WORKING -- commenting out bc not sure if this affects the rest of tests?
    print(f"Deleting project {project} via settings page...")
    page.click(f'a[href="#itemDivId-Project-{project}"]')
    page.click('project-main-edit .text-red button')
    page.wait_for_selector(f'text="Delete Confirmation"')
    page.click('button:has-text("Confirm")')
    page.wait_for_selector(f'text="Project {project} deleted successfully!"')
    print(f"Project deleted successfully!")