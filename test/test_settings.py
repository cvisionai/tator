import os
import time


from ._common import print_page_error


def test_settings(authenticated, project, video):
    print("Going to project settings view...")
    page = authenticated.new_page()
    page.goto(f"/{project}/project-settings")
    page.on("pageerror", print_page_error)
    # Update All Project information
    print("Editing project info (besides thumbnail #todo)...")
    page.wait_for_selector('project-main-edit')
    page.fill('project-main-edit text-input[name="Name"] input', 'Updated Name '+ str(project))
    page.fill('project-main-edit text-input[name="Summary"] input', 'Updated Description...')
    page.click('project-main-edit label[for="off"]')
    page.click('project-main-edit input[type="submit"]')
    print(f"Waiting for success message...")
    page.wait_for_selector(f'text="Project {project} updated successfully!"')
    print(f"Project {project} updated successfully!")
   #  page.click('.modal__close')
   #  print("Project Name, Summary, and Bool set to false... now check....")
   #  assert page.text_content('project-main-edit text-input[name="Name"] input') == 'Updated Name!'
   #  assert page.text_content('project-main-edit text-input[name="Name"] input') == 'Updated Description...'
