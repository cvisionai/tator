import os
import inspect


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
def test_settings_projectEdit(page_factory, project, image_file):
    print("Project Settings Main Tests...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f"/{project}/project-settings", wait_until='networkidle')
    page.on("pageerror", print_page_error)

    # Update All Project information
    print("Editing project info via Project Settings")
    page.wait_for_selector('project-main-edit')
    page.fill('project-main-edit text-input[name="Name"] input', 'Updated Name ' + str(project))
    page.set_input_files('input[type="file"]', image_file)
    page.fill('project-main-edit text-input[name="Summary"] input', 'Updated Description...')
    page.click('project-main-edit label[for="off"]')
    page.click('type-form-container[form="project-main-edit"] input[type="submit"]')
    page.wait_for_selector(f'text="Project {project} updated successfully!"')
    print(f"Project {project} updated successfully!")
    # page.click('modal-dialog modal-close .modal__close')

    #todo - Assert information saved, edit and re-assert

    page.close()


def test_settings_mediaTypes(page_factory, project):
    print("Media Types Tests...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f"/{project}/project-settings", wait_until='networkidle')
    page.on("pageerror", print_page_error)

    print("Start: Creating Media Types via Project Settings")

    dtypeSet = {"Video","Image","Multiview"}
    for dtypeName in dtypeSet:
        page.click('#nav-for-MediaType #sub-nav--plus-link')
        page.fill('type-form-container[form="media-type-edit"] text-input[name="Name"] input', 'My '+dtypeName+' Type')
        page.select_option('type-form-container[form="media-type-edit"] enum-input[name="Data Type"] select', label=dtypeName)
        page.fill('type-form-container[form="media-type-edit"] text-input[name="Description"] input', 'Media description for automated test.')
        print(f'dtypeName: {dtypeName}')
        if dtypeName != "Image":
            page.wait_for_selector('#media-type-edit--volume input')
            page.fill('#media-type-edit--volume input', '50')
        page.click('type-form-container[form="media-type-edit"] bool-input[name="Visible"] label[for="on"]')
        page.click('type-form-container[form="media-type-edit"] input[type="submit"]')
        page.wait_for_selector(f'text="Media type created successfully!"')
        # page.click('modal-dialog modal-close .modal__close')
        print(f"{dtypeName} Media type created successfully!")

        # todo - Assert information saved, edit and re-assert
        # Note/todo: when run sequentionally they are clicked in "States"...
    page.close()
    
def test_settings_localizationTypes(page_factory, project):
    print("Localization Types Tests...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f"/{project}/project-settings", wait_until='networkidle')
    page.on("pageerror", print_page_error)

    localization_dtypeSet = {"Box","Line","Dot","Poly"}
    for dtypeName in localization_dtypeSet:
        # Create types
        page.click('#nav-for-LocalizationType #sub-nav--plus-link')
        page.fill(f'type-form-container[form="localization-type-edit"] text-input[name="Name"] input', 'Auto {dtypeName} Type')
        page.select_option(f'type-form-container[form="localization-type-edit"] enum-input[name="Data Type"] select', label=dtypeName)
        page.fill('type-form-container[form="localization-type-edit"] text-input[name="Description"] input', 'Loc Type description for automated test.')
        # page.click('type-form-container[form="localization-type-edit"] text-input[type="color"]')
        # page.fill('type-form-container[form="localization-type-edit"] text-input[type="color"] input', '#FF69B4')
        page.click('type-form-container[form="localization-type-edit"] bool-input[name="Visible"] label[for="on"]')
        page.click('type-form-container[form="localization-type-edit"] bool-input[name="Drawable"] label[for="on"]')
        page.fill('type-form-container[form="localization-type-edit"] text-input[name="Line Width"] input', '5')
        page.click('type-form-container[form="localization-type-edit"] bool-input[name="Grouping Default"] label[for="on"]')
        page.click('type-form-container[form="localization-type-edit"] span:text("Test Images")')
        page.click('type-form-container[form="localization-type-edit"] button[value="Save"]')
        page.wait_for_selector(f'text="Localization type created successfully!"')
        # page.click('modal-dialog modal-close .modal__close')
        print(f"{dtypeName} - Localization type created successfully!!")
    page.close()

def test_settings_leafType(page_factory, project, base_url):
    print("Leaf Type Tests...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f"/{project}/project-settings", wait_until='networkidle')
    page.on("pageerror", print_page_error)

    # Create Leaf type
    leaf_type_in_view = 'Testing Leaf'
    page.click('#nav-for-LeafType #sub-nav--plus-link')
    page.fill('type-form-container[form="leaf-type-edit"] text-input[name="Name"] input', leaf_type_in_view)
    leafTypeDescription = 'Leaf Type description for automated test.'
    page.fill('type-form-container[form="leaf-type-edit"] text-input[name="Description"] input', leafTypeDescription)
    page.click('type-form-container[form="leaf-type-edit"] button[value="Save"]')
    page.wait_for_selector(f'text="Leaf type created successfully!"')
    # page.click('modal-dialog modal-close .modal__close')
    print(f"Leaf type created successfully!!")
    page.wait_for_timeout(5000)

    # Add attributes to Leaf type
    leafTypeLink = page.query_selector(f'text="{leaf_type_in_view}"')
    formSelector = leafTypeLink.get_attribute("href")
    page.click(f'{formSelector} .add-new-in-form')
    page.wait_for_selector('modal-dialog form')
    page.fill('modal-dialog text-input[name="Name"] input', 'String Type')
    page.select_option(f'modal-dialog enum-input[name="Data Type"] select', "string")
    attr_description = 'Attr description for automated test.'
    page.fill('modal-dialog text-input[name="Description"] input', attr_description)


    leafTypeId = formSelector.replace("#itemDivId-LeafType-", "")
    url = base_url + "/rest/LeafType/" + str(leafTypeId)
    with page.expect_response(url) as response_info:
        page.click('modal-dialog input[type="submit"]')
        page.wait_for_selector(f'text="New attribute type \'String Type\' added"')
        # page.click('modal-dialog modal-close .modal__close')

    # Get data for Assert statements
    leaf_types_obj = response_info.value.json()
    attr_type_obj = None

    # Assert leaf type information
    assert leaf_types_obj["name"] == leaf_type_in_view
    assert leaf_types_obj["description"] == leafTypeDescription

    # Assert Leaf type attribute
    attr_type_obj = leaf_types_obj["attribute_types"]
    for at in attr_type_obj:
        newName = "String Type"
        if at["name"] == newName:
            attr_type_obj = at
            assert attr_type_obj["description"] == attr_description
            break

    print("Confirmed leaf type attribute was added!")

    
    # Add leafs with attr value
    page.click('.edit-project__h1 a')
    page.wait_for_timeout(5000)
    page.click('text=" New Leaf"')
    page.wait_for_selector('modal-dialog form')
    page.fill('modal-dialog text-input[name="Name"] input', 'A')
    page.click('modal-dialog input[value="Save"]')
    # page.wait_for_selector('text="Complete')
    # page.wait_for_timeout(5000)
    # page.click('modal-dialog modal-close .modal__close')

    page.wait_for_timeout(5000)
    page.click('text=" New Leaf"')
    page.wait_for_selector('modal-dialog form')
    page.fill('modal-dialog text-input[name="Name"] input', 'B')
    page.click('modal-dialog input[value="Save"]')
    # page.wait_for_selector('text="Complete')
    # page.wait_for_timeout(5000)
    # page.click('modal-dialog modal-close .modal__close')

    # this should be top level and visible to click into
    # asserts its level, and successful add


    # Change heirachy with modal & assert attr value saved
    # Change heirarchy with drag and drop
    # This element should have the draggable attribute value as true
    page.wait_for_timeout(5000)
    leaf_elems = page.query_selector_all('.leaves-edit span[draggable="true"]')
    src_elem = leaf_elems[1]
    dest_elem = leaf_elems[0]

    # Create a data transfer JSHandle instance
    data_transfer = page.evaluate_handle('() => new DataTransfer()')

    # move it
    src_elem.dispatch_event('dragstart', { 'dataTransfer': data_transfer })
    dest_elem.dispatch_event('drop', { 'dataTransfer': data_transfer })
    
    # Now check whether the dropped effect is achieved
    # todo ... a modal should pop up, press OK, wait for reload and now it should be the child element
    # Child element B won't be seen, need to click into, and if you edit it the paren = A
    page.wait_for_selector('text="Confirm move"')
    page.click('modal-dialog input[type="submit"]')
    # page.wait_for_timeout(5000)
    # page.click('modal-dialog modal-close .modal__close')

    page.wait_for_timeout(5000)
    leaf_elems = page.query_selector_all('.leaves-edit span[draggable="true"]')
    leaf_elems_count = page.locator('.leaves-edit span[draggable="true"]').count()
    hidden_els_count = page.locator('leaf-item[class="hidden"]').count()
    assert leaf_elems_count == 2
    assert hidden_els_count == 1
    
    a = leaf_elems[0]
    a.click()
    page.wait_for_timeout(5000)

    leaf_elems_count = page.locator('.leaves-edit span[draggable="true"]').count()
    hidden_els_count = page.locator('leaf-item[class="hidden"]').count()
    assert leaf_elems_count == 2
    assert hidden_els_count == 0

    print(f'Successfully dragged leaf to change parent.')

    # Test Delete
    page.wait_for_timeout(5000)
    trash_icons = page.query_selector_all('.leaf-delete-icon')
    trash_icons[0].click()

    page.wait_for_selector('text="Delete Confirmation"')
    page.click('text="Confirm"')

    page.wait_for_selector('modal-dialog modal-success')
    # page.click('modal-dialog modal-close .modal__close')
    # page.wait_for_timeout(5000)
    
    leaf_elems_count = page.locator('.leaves-edit span[draggable="true"]').count()
    hidden_els_count = page.locator('leaf-item[class="hidden"]').count()
    assert leaf_elems_count == 0
    assert hidden_els_count == 0
    print(f'Successfully deleted leaf and child leaf.')

    page.close()

def test_settings_stateTypes(page_factory, project):
    print("State Type Tests...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f"/{project}/project-settings", wait_until='networkidle')
    page.on("pageerror", print_page_error)

    # Create State types 
    # todo loop array like other types, and add assert statements
    # Note/todo: when run sequentionally these are created in "MediaType" tests...
    # re: #todo hitting error with media values sent as "[None, None]"
    page.click('.heading-for-StateType .Nav-action ')
    page.fill('type-form-container[form="state-type-edit"] text-input[name="Name"] input', 'Alabama')
    page.fill('type-form-container[form="state-type-edit"] text-input[name="Description"] input', 'State Type description for automated test.')
    page.click('type-form-container[form="state-type-edit"] bool-input[name="Visible"] label[for="on"]')
    page.click('type-form-container[form="state-type-edit"] bool-input[name="Grouping Default"] label[for="on"]')
    
    page.click('type-form-container[form="state-type-edit"] span:text("My Video Type")')
    page.click('type-form-container[form="state-type-edit"] span:text("My Image Type")')
    page.select_option('type-form-container[form="state-type-edit"] enum-input[name="Association"] select', label='Localization')
    page.select_option('type-form-container[form="state-type-edit"] enum-input[name="Interpolation"] select', label='Latest')
    page.click('type-form-container[form="state-type-edit"] bool-input[name="Delete Child Localizations"] label[for="on"]')
    page.click('type-form-container[form="state-type-edit"] button[value="Save"]')
    page.wait_for_selector(f'text="State type created successfully!"')
    # page.click('modal-dialog modal-close .modal__close')
    print(f"State type created successfully - Association: Localization, Interpolation: Latest")

    page.click('.heading-for-StateType .Nav-action')
    page.fill('type-form-container[form="state-type-edit"] text-input[name="Name"] input', 'Alabama')
    page.fill('type-form-container[form="state-type-edit"] text-input[name="Description"] input', 'State Type description for automated test.')
    page.click('type-form-container[form="state-type-edit"] bool-input[name="Visible"] label[for="on"]')
    page.click('type-form-container[form="state-type-edit"] bool-input[name="Grouping Default"] label[for="on"]')
    page.click('type-form-container[form="state-type-edit"] span:text("My Video Type")')
    page.click('type-form-container[form="state-type-edit"] span:text("My Image Type")')
    page.select_option('type-form-container[form="state-type-edit"] enum-input[name="Association"] select', label='Media')
    page.select_option('type-form-container[form="state-type-edit"] enum-input[name="Interpolation"] select', label='Latest')
    page.click('type-form-container[form="state-type-edit"] bool-input[name="Delete Child Localizations"] label[for="on"]')
    page.click('type-form-container[form="state-type-edit"] button[value="Save"]')
    page.wait_for_selector(f'text="State type created successfully!"')
    # page.click('modal-dialog modal-close .modal__close')
    print(f"State type created successfully - Association: Media, Interpolation: Latest")
    
    page.click('.heading-for-StateType .Nav-action')
    page.fill('type-form-container[form="state-type-edit"] text-input[name="Name"] input', 'Alabama')
    page.fill('type-form-container[form="state-type-edit"] text-input[name="Description"] input', 'State Type description for automated test.')
    page.click('type-form-container[form="state-type-edit"] bool-input[name="Visible"] label[for="on"]')
    page.click('type-form-container[form="state-type-edit"] bool-input[name="Grouping Default"] label[for="on"]')
    page.click('type-form-container[form="state-type-edit"] span:text("My Video Type")')
    page.click('type-form-container[form="state-type-edit"] span:text("My Image Type")')
    page.select_option('type-form-container[form="state-type-edit"] enum-input[name="Association"] select', label='Frame')
    page.select_option('type-form-container[form="state-type-edit"] enum-input[name="Interpolation"] select', label='Latest')
    page.click('type-form-container[form="state-type-edit"] bool-input[name="Delete Child Localizations"] label[for="on"]')
    page.click('type-form-container[form="state-type-edit"] button[value="Save"]')
    page.wait_for_selector(f'text="State type created successfully!"')
    # page.click('modal-dialog modal-close .modal__close')
    print(f"State type created successfully - Association: Frame, Interpolation: Latest")
    page.close()


def test_settings_projectMemberships(page_factory, project):
    print("Membership Tests...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f"/{project}/project-settings", wait_until='networkidle')
    page.on("pageerror", print_page_error)

    # Test memberships
    page.click('#nav-for-Membership #sub-nav--heading-button')
    page.wait_for_selector('type-form-container[form="membership-edit"] .SubItems .SideNav-subItem >> nth=1')
    page.wait_for_timeout(5000)
    subItems = page.query_selector_all('type-form-container[form="membership-edit"] .SubItems .SideNav-subItem')
    username = subItems[0].inner_text()
    subItem = subItems[0]

    subItem.click()
    print("Testing membership edit.")
    formSelector = subItem.get_attribute("href")
    print(formSelector)
    memberId = formSelector.replace("#itemDivId-Membership-", "")
    print(memberId)
    subItem.click()
    page.wait_for_selector(f'{formSelector} enum-input[name="Version"]')
    page.select_option(f'{formSelector} enum-input[name="Version"] select', label='Baseline')
    page.click(f'{formSelector} input[type="Submit"]')
    page.wait_for_selector(f'text="Membership {memberId} successfully updated!"')
    # page.click('modal-dialog modal-close .modal__close')
    print(f"Membershipship id {memberId} updated successfully!")
   
    #todo... reference org settings, use a membership from those tests to actually add new
    page.click('.heading-for-Membership .Nav-action')
    print("Testing re-adding current membership...")
    page.fill('#itemDivId-Membership-New input[placeholder="Enter semicolon delimited usernames or email addresses..."]', username+';')
    page.select_option('#itemDivId-Membership-New enum-input[name="Default version"] select', label='Test Version')
    page.click('#itemDivId-Membership-New button[value="Save"]')
    # page.wait_for_selector('text="Failed to create 0 memberships."')
    page.wait_for_selector(f'text=" Error"')
    # page.click('modal-dialog modal-close .modal__close')
    print(f"Membership endpoint hit (error) re-adding current user successfully!")

    page.close()

def test_settings_versionTests(page_factory, project):
    print("Version Settings Tests...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f"/{project}/project-settings", wait_until='networkidle')
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
    # page.click('modal-dialog modal-close .modal__close')
    page.close()

def test_settings_algorithmTests(page_factory, project, base_url, yaml_file):
    print("Algorithm Settings Tests...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    
    # Requires Cluster
    # - Find org ID first
    url = base_url + "/rest/Project/" + str(project)
    with page.expect_response(url) as response_info:
        page.goto(f"/{project}/project-settings", wait_until='networkidle')
        page.on("pageerror", print_page_error)
    response = response_info.value
    respObject = response.json()
    organization_id = respObject["organization"]
    print(f"Found Organization id = {organization_id}")
    page.goto(f"/{organization_id}/organization-settings", wait_until='networkidle')

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
        # page.click('modal-dialog modal-close .modal__close')
    response = response_info.value
    respObject = response.json()
    print(respObject)
    newClusterId = respObject["id"]
    print(f"Cluster id {newClusterId} created!")

    # Back to settings
    page.goto(f"/{project}/project-settings", wait_until='networkidle')

    # Test Algorithm Type
    page.wait_for_selector('.heading-for-Algorithm .Nav-action')
    page.click('.heading-for-Algorithm .Nav-action')
    page.wait_for_selector('#itemDivId-Algorithm-New text-input[name="Name"]')
    page.fill('#itemDivId-Algorithm-New text-input[name="Name"] input', 'New Algorithm')
    page.fill('#itemDivId-Algorithm-New text-input[name="Description"] input', 'Algorithm description for automated test.')
    
    url = base_url + "/rest/SaveAlgorithmManifest/" + str(project)
    with page.expect_response(url) as response_info:
        page.set_input_files('#itemDivId-Algorithm-New input[type="file"]', yaml_file)

    page.wait_for_timeout(5000)
    page.fill('#itemDivId-Algorithm-New text-input[name="Files Per Job"] input', '100')
    page.click('#itemDivId-Algorithm-New button[value="Save"]')
    page.wait_for_selector('text="Successfully registered algorithm argo workflow."')
    # page.click('modal-dialog modal-close .modal__close')
    print(f"Successfully registered algorithm argo workflow!")
    page.close()


def test_settings_appletTests(page_factory, project, base_url, html_file):
    print("Applet Settings Tests...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    
    # Go to settings
    page.goto(f"/{project}/project-settings", wait_until='networkidle')

    # Test Applet Type
    page.wait_for_selector('.heading-for-Applet .Nav-action')
    page.click('.heading-for-Applet .Nav-action')
    page.wait_for_selector('#itemDivId-Applet-New text-input[name="Name"]')
    page.set_input_files('#itemDivId-Applet-New input[type="file"]', html_file)
    page.wait_for_timeout(5000)
    page.fill('#itemDivId-Applet-New text-input[name="Name"] input', 'Test Applet')
    page.fill('#itemDivId-Applet-New text-input[name="Description"] input', 'Description for automated test.')
    

    # - Listen for applet id
    url = base_url + "/rest/Applets/" + str(project)
    with page.expect_response(url) as response_info:
        page.click('#itemDivId-Applet-New button[value="Save"]')
    response = response_info.value
    respObject = response.json()
    print(respObject)
    applet_id = respObject["id"]
    
    page.wait_for_selector(f'text="Successfully created applet {applet_id}!"')
    # page.click('modal-dialog modal-close .modal__close')

    # Go to dashboards
    page.goto(f"/{project}/dashboards", wait_until='networkidle')
    page.wait_for_selector('text="Test Applet"')

    print(f"Successfully registered Applet.")


def test_settings_attributeTests(page_factory, project, base_url):
    print("Attribute Settings...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f"/{project}/project-settings", wait_until='networkidle')
    page.on("pageerror", print_page_error)

    # All Attr types
    dtypeSet = {"bool","int","float","string","datetime","geopos"} # bug with "enum" TODO

    # Add Attribute Types
    page.click('.heading-for-MediaType')
    media_type_in_view = "Test Images"
    page.wait_for_selector(f'text="{media_type_in_view}"')
    page.click(f'text="{media_type_in_view}"')
    imageTypeLink = page.query_selector(f'text="{media_type_in_view}"')
    formSelector = imageTypeLink.get_attribute("href")

    for dtype in dtypeSet:      
        page.click(f'{formSelector} .add-new-in-form')
        page.wait_for_selector('modal-dialog form')
        page.fill('modal-dialog text-input[name="Name"] input', dtype+' Type')
        page.select_option(f'modal-dialog enum-input[name="Data Type"] select', dtype)
        page.fill('modal-dialog text-input[name="Description"] input', 'Attr description for automated test.')
        if dtype == 'enum':
            #requires choices
            # page.wait_for_selector('text="Enum Choices"')
            page.click('text="+ Add New"')
            page.fill('modal-dialog array-input[name="Label"] text-input input', "One")
            page.fill('modal-dialog array-input[name="Value"] text-input input', "1")
            page.check('modal-dialog input[name="enum-default"]')
        
        if dtype == 'string':
            page.fill('modal-dialog text-input[name="Service URL"] input', "testautocomplete")
            
        url = base_url + "/rest/MediaTypes/" + str(project)
        with page.expect_response(url) as response_info:
            page.click('modal-dialog input[type="submit"]')
            page.wait_for_selector(f'text="New attribute type \'{dtype} Type\' added"')
            # page.click('modal-dialog modal-close .modal__close')

        # Get data for Assert statements
        media_types = response_info.value.json()
        media_type_obj = None
        attr_type_obj = None
        for mt in media_types:
            if mt and mt["name"] == media_type_in_view:
                media_type_obj = mt
                break
        mt_attributes = media_type_obj["attribute_types"]

        for at in mt_attributes:
            newName = dtype+' Type'
            if at["name"] == newName:
                attr_type_obj = at
                break

        # Assert
        if dtype == 'string':
            assert "autocomplete" in attr_type_obj
            assert attr_type_obj["autocomplete"]["serviceUrl"] == "testautocomplete"

        print(f"> New {dtype} type attribute added to Image!")

    page.wait_for_timeout(5000)

    # Edit Attribute Types (NOT GLOBAL)
    print("Editing new Attributes...")
    #open the attribute forms
    dtypeSet = {"bool Type","int Type","float Type","string Type","datetime Type","geopos Type"} #,"enum Type",
    for dtypeName in dtypeSet:
        page.click(f'text="{dtypeName}"')
        page.wait_for_selector(f'attributes-form[data-old-name="{dtypeName}"] text-input[name="Name"] input')
        page.fill(f'attributes-form[data-old-name="{dtypeName}"] text-input[name="Name"] input', dtypeName + ' updated')
        
        if "string" in dtypeName:
            #remove autocomplete
            page.fill('modal-dialog text-input[name="Service URL"] input', "")
        
        # page.click(f'.modal__footer input[type="submit"]')
        # page.wait_for_selector('modal-dialog div input[type="checkbox"]')
        # successMessages = page.query_selector_all('modal-dialog div input[type="checkbox"]')
        # assert len(successMessages) == 1
        
        url = base_url + "/rest/MediaTypes/" + str(project)
        with page.expect_response(url) as response_info:
            # page.click('text="Confirm"')
            page.click(f'.modal__footer input[type="submit"]')
            page.wait_for_selector('modal-dialog modal-success')
            successMessages = page.query_selector_all('modal-dialog modal-success')
            assert len(successMessages) == 2 # heading success icon and main body
            # page.click('modal-dialog modal-close .modal__close')

        # Get data for Assert statements
        media_types = response_info.value.json()
        media_type_obj = None
        attr_type_obj = None
        for mt in media_types:
            if mt["name"] == media_type_in_view:
                media_type_obj = mt
                break

        mt_attributes = media_type_obj["attribute_types"]

        for at in mt_attributes:
            newName = dtypeName + ' updated'
            if at["name"] == newName:
                attr_type_obj = at
                break

        # Assert
        # if "string" in dtypeName:
        #     assert not "autocomplete" in attr_type_obj

        print(f'> Successfully edited new attribute named {dtypeName}!')
    

    # Edit Attribute Types (GLOBAL)
    print("Editing GLOBAL Attributes...")
    #open the attribute forms
    dtypeSet = {"Test Bool","Test Int","Test Float","Test String","Test Enum","Test Datetime","Test Geoposition"}
    for dtypeName in dtypeSet:
        page.click(f'text="{dtypeName}"')
        page.wait_for_selector(f'attributes-form[data-old-name="{dtypeName}"] text-input[name="Name"] input')
        page.fill(f'attributes-form[data-old-name="{dtypeName}"] text-input[name="Name"] input', dtypeName + ' updated')
        
        page.click(f'.modal__footer input[type="submit"]')
        page.wait_for_selector('modal-dialog div input[type="checkbox"]')
        successMessages = page.query_selector_all('modal-dialog div input[type="checkbox"]')
        assert len(successMessages) == 1
        
        url = base_url + "/rest/MediaTypes/" + str(project)
        with page.expect_response(url) as response_info:
            page.click('text="Confirm"')
            page.wait_for_selector('modal-dialog modal-success')
            successMessages = page.query_selector_all('modal-dialog modal-success')
            assert len(successMessages) == 2 # heading and body icon
            # page.click('modal-dialog modal-close .modal__close')

        # Get data for Assert statements
        media_types = response_info.value.json()
        media_type_obj = None
        attr_type_obj = None
        for mt in media_types:
            if mt["name"] == media_type_in_view:
                media_type_obj = mt
                break

        mt_attributes = media_type_obj["attribute_types"]

        for at in mt_attributes:
            newName = dtypeName + ' updated'
            if at["name"] == newName:
                attr_type_obj = at
                break

        # Assert
        if "string" in dtypeName:
            assert not "autocomplete" in attr_type_obj
            print(attr_type_obj)     
        print(f'> Successfully edited global attribute named {dtypeName}!')
    
    
    # todo test clone
    
    
    page.close()



def test_settings_projectDelete(page_factory, project):
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f"/{project}/project-settings", wait_until='networkidle')
    page.on("pageerror", print_page_error)

    # TODO delete a bunch of other stuff succesffully first, then project

    print(f"Deleting project {project} via settings page...")
    page.click(f'a[href="#itemDivId-Project-{project}"]')
    page.click('project-main-edit .text-red button')
    page.wait_for_selector(f'text="Delete Confirmation"')
    page.click('button:has-text("Confirm")')
    page.wait_for_selector(f'text="Project {project} deleted successfully! Redirecting to projects..."')
    print(f"Project deleted successfully!")
    page.close()
