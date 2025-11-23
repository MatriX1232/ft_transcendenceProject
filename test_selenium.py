from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.actions.action_builder import ActionBuilder
from selenium.webdriver.common.actions.pointer_input import PointerInput
from selenium.webdriver.common.actions import interaction
import time

def test_mobile_input():
    # Configure Chrome options
    chrome_options = Options()
    chrome_options.add_argument("--ignore-certificate-errors")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    # Enable mobile emulation
    mobile_emulation = { "deviceName": "iPhone X" }
    chrome_options.add_experimental_option("mobileEmulation", mobile_emulation)

    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 10)

    try:
        base_url = "https://localhost" 
        print(f"Navigating to {base_url}...")
        driver.get(base_url)
        
        # 1. Click "Play as Guest"
        print("Clicking 'Play as Guest'...")
        guest_btn = wait.until(EC.element_to_be_clickable((By.ID, "guestmode")))
        guest_btn.click()
        
        # 2. Click "Single Player"
        print("Clicking 'Single Player'...")
        single_btn = wait.until(EC.element_to_be_clickable((By.ID, "singleMode")))
        single_btn.click()

        # 3. Click "Start Match"
        print("Clicking 'Start Match'...")
        start_btn = wait.until(EC.element_to_be_clickable((By.ID, "startMatchBtn")))
        start_btn.click()

        # 4. Wait for Game Canvas
        print("Waiting for game canvas...")
        canvas = wait.until(EC.presence_of_element_located((By.ID, "pong")))
        time.sleep(2) # Wait for game to fully initialize

        # 5. Simulate Touch Input (Slide up and down)
        print("Simulating touch input...")
        
        # Get canvas dimensions and location
        rect = driver.execute_script("return arguments[0].getBoundingClientRect();", canvas)
        width = rect['width']
        height = rect['height']
        x_start = rect['left'] + (width * 0.25) # Left side for Player 1
        y_center = rect['top'] + (height / 2)
        
        actions = ActionChains(driver)
        # Create a pointer input for touch
        touch_input = PointerInput(interaction.POINTER_TOUCH, "touch")
        
        actions.w3c_actions = ActionBuilder(driver, mouse=touch_input)
        
        # Move to start position
        actions.w3c_actions.pointer_action.move_to_location(x_start, y_center)
        actions.w3c_actions.pointer_action.pointer_down()
        
        # Slide Up
        print("Sliding Up...")
        actions.w3c_actions.pointer_action.move_to_location(x_start, y_center - 150)
        actions.w3c_actions.pointer_action.pause(0.5)
        
        # Slide Down
        print("Sliding Down...")
        actions.w3c_actions.pointer_action.move_to_location(x_start, y_center + 150)
        actions.w3c_actions.pointer_action.pause(0.5)
        
        # Slide back to center
        actions.w3c_actions.pointer_action.move_to_location(x_start, y_center)
        actions.w3c_actions.pointer_action.pointer_up()
        
        actions.perform()
        
        print("Touch simulation completed.")
        time.sleep(2) # Observe result

    except Exception as e:
        print(f"An error occurred: {e}")
        # Print page source for debugging if element not found
        # print(driver.page_source)

    finally:
        print("Closing browser...")
        driver.quit()

def test_window_resize():
    print("\nStarting Window Resize Test...")
    # Configure Chrome options
    chrome_options = Options()
    chrome_options.add_argument("--ignore-certificate-errors")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    driver = webdriver.Chrome(options=chrome_options)

    try:
        base_url = "https://localhost" 
        print(f"Navigating to {base_url}...")
        driver.get(base_url)
        time.sleep(2)

        # Define viewports to test (Width x Height)
        viewports = [
            {"name": "Mobile (iPhone X)", "width": 375, "height": 812},
            {"name": "Tablet (iPad)", "width": 768, "height": 1024},
            {"name": "Desktop (Standard)", "width": 1366, "height": 768},
            {"name": "Desktop (Large)", "width": 1920, "height": 1080}
        ]
        
        for viewport in viewports:
            print(f"Resizing to {viewport['name']} ({viewport['width']}x{viewport['height']})...")
            driver.set_window_size(viewport["width"], viewport["height"])
            time.sleep(2) # Wait for layout to adapt
            
            # Optional: Check if critical elements are still visible
            # element = driver.find_element(By.ID, "guestmode")
            # assert element.is_displayed()
            
        print("Window resize test completed successfully.")

    except Exception as e:
        print(f"Resize test failed: {e}")

    finally:
        driver.quit()

if __name__ == "__main__":
    test_mobile_input()
    test_window_resize()