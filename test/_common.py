from selenium.common.exceptions import NoSuchElementException
from urllib.parse import urlparse, urljoin

class ShadowManager:
    def __init__(self, browser):
        self._browser = browser

    def expand_shadow_element(self, element):
        return self._browser.execute_script('return arguments[0].shadowRoot', element)

    def expand_shadow_hierarchy(self, tags):
        """ Given a list of shadow element tag names, return the shadow dom of the
            last element.
        """
        shadow_root = self._browser
        for tag in tags:
            element = shadow_root.find_element_by_tag_name(tag)
            shadow_root = self.expand_shadow_element(element)
        return shadow_root

    def find_shadow_tree_elements(self, dom, by, value, single=False):
        """ Given description of the element you want to find, searches full shadow tree
            on the page for any elements that match and returns a list.
        """
        elements = []
        # Try to find the specified element in the dom.
        elements += dom.find_elements(by, value)
        # Keep searching in nested shadow doms.
        all_elements = dom.find_elements_by_tag_name("*")
        for element in all_elements:
            shadow = self.expand_shadow_element(element)
            if shadow:
                elements += self.find_shadow_tree_elements(shadow, by, value)
            if single and len(elements) > 0:
                break
        return elements

    def find_shadow_tree_element(self, dom, by, value):
        """ Given description of the element you want to find, searches full shadow tree
            on the page for that element and returns the first one.
        """
        elements = self.find_shadow_tree_elements(dom, by, value, True)
        if len(elements) > 0:
            element = elements[0]
        else:
            raise NoSuchElementException
        return element

def go_to_uri(browser, uri):
    parsed = urlparse(browser.current_url)
    goto = urljoin(f"{parsed.scheme}://{parsed.netloc}", uri)
    browser.get(goto)
