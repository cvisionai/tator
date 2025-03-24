import os
import inspect
import requests
import math

from ._common import print_page_error

# Upload media >10 images
# Change pagination to 10
# Search & create a saved search section
# Optional- Go to media, bookmark it? or last visited?
def test_basic(request, page_factory, project): #video 
    print("Project Detail Page tests...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f"/{project}/project-detail")
    page.on("pageerror", print_page_error)

    print("Start: Test Pagination and image upload")
    page.wait_for_load_state("networkidle")
    # page.select_option('.pagination select.form-select', value="100")
    # page.wait_for_selector('text="Page 1 of 1"')
    # page.wait_for_timeout(5000)

    # Initial card length
    cards = page.query_selector_all('section-files entity-card[style="display: block;"]')
    initialCardLength = len(cards)
    newCardsLength = 15
    totalCards = initialCardLength + newCardsLength

    nasa_space_photo_1 = "/tmp/hubble-sees-the-wings-of-a-butterfly.jpg"
    if not os.path.exists(nasa_space_photo_1):
        url = "https://s3.amazonaws.com/tator-ci/hubble.jpg"
        with requests.get(url, stream=True) as r:
            r.raise_for_status()
            with open(nasa_space_photo_1, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)

    nasa_space_photo_2 = "/tmp/layers-in-galle-crater.jpg"
    if not os.path.exists(nasa_space_photo_2):
        url = "https://s3.amazonaws.com/tator-ci/galle.jpg"
        with requests.get(url, stream=True) as r:
            r.raise_for_status()
            with open(nasa_space_photo_2, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)

    nasa_space_photo_3 = "/tmp/behemoth-black-hole.jpg"
    if not os.path.exists(nasa_space_photo_3):
        url = "https://s3.amazonaws.com/tator-ci/behemoth.jpg"
        with requests.get(url, stream=True) as r:
            r.raise_for_status()
            with open(nasa_space_photo_3, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)

    page.set_input_files(
        "section-upload input",
        [
            nasa_space_photo_1,
            nasa_space_photo_2,
            nasa_space_photo_3,
            nasa_space_photo_2,
            nasa_space_photo_2,
            nasa_space_photo_3,
            nasa_space_photo_1,
            nasa_space_photo_1,
            nasa_space_photo_1,
            nasa_space_photo_1,
            nasa_space_photo_1,
            nasa_space_photo_1,
            nasa_space_photo_1,
            nasa_space_photo_1,
            nasa_space_photo_1,
        ],
    )
    page.wait_for_timeout(15000)  # Waiting for all these files to upload
    page.query_selector("upload-dialog").query_selector("text=Close").click()

    page.locator(".project__header reload-button").click()
    page.wait_for_selector("section-files entity-card")
    page.wait_for_timeout(5000)

    page.select_option(".pagination select.form-select", value="100")
    page.wait_for_timeout(5000)

    cards = page.query_selector_all('section-files entity-card[style="display: block;"]')
    cardLength = len(cards)  # existing + new cards

    print(f"Length of cards {cardLength}  == should match totalCards {totalCards}")
    assert cardLength == totalCards

    # Test selecting less cards
    page.select_option(".pagination select.form-select", value="10")
    pages = int(math.ceil(totalCards / 10))
    page.wait_for_selector(f'text="(Page 1 of {str(pages)})"')
    page.wait_for_timeout(5000)

    cards = page.query_selector_all('section-files entity-card[style="display: block;"]')
    cardLength = len(cards)

    print(f"Visible card length {cardLength}  == 10")
    assert cardLength == 10

    # Test pagination
    paginationLinks = page.query_selector_all(".pagination a")
    paginationLinks[2].click()
    page.wait_for_selector(f'text="(Page 2 of {pages})"')
    page.wait_for_timeout(5000)

    cards = page.query_selector_all('section-files entity-card[style="display: block;"]')
    cardLength = len(cards)
    totalOnSecond = totalCards - 10
    if totalOnSecond > 10:
        totalOnSecond = 10
    print(f"Second page length of cards {cardLength}  == {totalOnSecond}")
    assert cardLength == totalOnSecond

    href = cards[0].query_selector("a").get_attribute("href")

    # Click off the page to test the url history
    if "annotation" in href:
        print(f"Clicking the first card to annotator....")
        cards[0].query_selector("a").click()
        page.wait_for_selector(".annotation__panel h3")
        page.go_back()
        page.wait_for_timeout(5000)

        page.wait_for_selector("section-files entity-card")
        print(f"Is pagination preserved?")

        cards = page.query_selector_all('section-files entity-card[style="display: block;"]')
        cardLength = len(cards)
        totalOnSecond = totalCards - 10
        if totalOnSecond > 10:
            totalOnSecond = 10
        print(f"(refreshed) Second page length of cards {cardLength}  == {totalOnSecond}")
        assert cardLength == totalOnSecond
    print("Complete!")

    # Test filtering
    print("Start: Test Filtering")
    page.click('text="Filter"')
    page.wait_for_selector("filter-condition-group button.btn.btn-outline.btn-small")
    page.click("filter-condition-group button.btn.btn-outline.btn-small")

    page.wait_for_selector('enum-input[name="Field"]')
    page.select_option('enum-input[name="Field"] select', label="Filename")

    page.wait_for_selector('text-input[name="Value"] input')
    page.fill('text-input[name="Value"] input', "black-hole")

    filterGroupButtons = page.query_selector_all(".modal__footer button")
    filterGroupButtons[0].click()

    page.wait_for_selector('text="(Page 1 of 1)"')
    page.wait_for_timeout(5000)

    cards = page.query_selector_all('section-files entity-card[style="display: block;"]')
    cardLength = len(cards)
    print(f"Cards length after search {cardLength} == 2")
    assert cardLength == 2

    print("Start: Test save search as section")
    page.click('button[tooltip="Open Saved Searches Panel"]')
    page.click('div[tooltip="Save current media search."]')

    newSectionFromSearch = "Black Holes"
    page.fill(
        'media-search-dialog text-input[name="Media Search Name:"] input', newSectionFromSearch
    )
    page.press('media-search-dialog text-input[name="Media Search Name:"] input', "Enter")
    page.click('text="Add"')

    page.wait_for_selector(f'text="{newSectionFromSearch}"')
    print(f"New section created named: {newSectionFromSearch}")

    page.wait_for_selector('text="2 Files"')
    page.wait_for_timeout(5000)

    cards = page.query_selector_all('section-files entity-card[style="display: block;"]')
    cardLength = len(cards)
    print(f"Cards in saved section {cardLength} == 2")
    assert cardLength == 2
    print("Complete!")

    ## Test multiple edit.....
    print("Start: Test media labels and mult edit")

    # Show labels, and multiselect, close more menu
    page.query_selector("section-more #icon-more-horizontal").click()
    page.wait_for_selector('text="Show file attributes"')
    page.query_selector('text="Show file attributes"').click()

    # select image labels & video (some in the card list and some not) @todo add video to this project
    attribute_selected_name = "Test String"
    test_string = page.query_selector_all(
        f'.entity-gallery-labels .entity-gallery-labels--checkbox-div checkbox-input[name="{attribute_selected_name}"]'
    )
    print(f"Label panel is open: found {len(test_string)} string labels....")
    test_string[0].click()  # for images
    test_string[2].click()  # for video

    page.query_selector(".entity-gallery__labels-div nav-close").click()

    page.query_selector("section-more #icon-more-horizontal").click()
    page.wait_for_selector('text="Bulk edit/move/delete"')
    page.locator('text="Bulk edit/move/delete"').click()

    # Did label selection also preselect attributes?
    ## There should be two input checked
    selected = page.query_selector_all(".bulk-edit-attr-choices_bulk-edit input:checked")
    print(f"Assert selected inputs {len(selected)} == Checked count 2")
    assert len(selected) == 2

    # Get a handle on shown cards
    cards = page.query_selector_all('section-files entity-card[style="display: block;"]')
    print(f"Selecting... {len(cards)} cards")

    # Test select all
    page.keyboard.press("Control+A")

    ## There should be two cards selected (black hole filter still on)
    editbutton = page.locator(".bulk-edit-submit-button .text-bold")
    count = editbutton.all_inner_texts()

    print(f"Assert selected cards {str(count)} == shown count {str(len(cards))}")
    assert str(count[0]) == str(len(cards))

    # Test escape
    page.keyboard.press("Escape")

    ## There should be 0 cards selected
    count = editbutton.all_inner_texts()

    print(f"Assert selected cards {str(count)} == 0")
    assert str(count[0]) == "0"

    # Test click selection of 1 card
    cards[1].click()

    ## There should be 1 card selected
    count = editbutton.all_inner_texts()

    print(f"Assert selected cards {str(count)} == 1")
    assert str(count[0]) == "1"

    ## Add some text
    # TODO -- check the label says "not set", update it, check label is "updated"
    # attributeShown = page.locator('section-files .entity-gallery-card__attribute span[display="block"]').innerHTML()
    attributeShown = page.query_selector_all(".entity-gallery-card__attribute:not(.hidden)")
    attributeShownText = attributeShown[1].text_content()
    assert attributeShownText == f"{attribute_selected_name}: <not set>"

    #
    page.fill('.annotation__panel-group_bulk-edit text-input:not([hidden=""]) input', "updated")

    editbutton.click()

    page.locator(".save-confirmation").click()

    isSet = False
    # Wait up to 30 seconds for the attribute to be updated in the UI
    for _ in range(30):
        page.wait_for_timeout(1000)
        attributeShown = page.query_selector_all(".entity-gallery-card__attribute:not(.hidden)")
        attributeShownText = attributeShown[1].text_content()
        isSet = attributeShownText == f"{attribute_selected_name}: updated"
        if isSet:
            break
    print("Complete!")

    page.close()
