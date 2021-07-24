from selenium.common.exceptions import NoSuchElementException

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

    def find_shadow_tree_element(self, dom, by, value):
        """ Given description of the element you want to find, searches full shadow tree
            on the page for that element and returns the first one.
        """
        element = None
        # Try to find the specified element in the dom.
        try:
            element = dom.find_element(by, value)
        except NoSuchElementException:
            # Not found, so keep searching in nested shadow doms.
            elements = dom.find_elements_by_tag_name("*")
            for element in elements:
                shadow = self.expand_shadow_element(element)
                if shadow:
                    element = self.find_shadow_tree_element(shadow, by, value)
                if element:
                    break
        return element

    def find_shadow_tree_elements(self, dom, by, value):
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
        return elements
