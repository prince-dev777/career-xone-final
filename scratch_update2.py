import os
import glob

def process_html_files():
    html_files = glob.glob('*.html')
    
    for file in html_files:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()

        if 'href="https://test.cxjeeneet.com"' in content:
            continue
            
        old_str = '<div class="mobile-login-wrapper">'
        new_str = '<a href="https://test.cxjeeneet.com">Test Series</a>\n                <div class="mobile-login-wrapper">'
        
        if old_str in content:
            content = content.replace(old_str, new_str)
            with open(file, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {file}")

if __name__ == "__main__":
    process_html_files()
